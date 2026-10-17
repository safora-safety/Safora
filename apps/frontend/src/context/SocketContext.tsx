import React, { createContext, useContext, useEffect, useState } from 'react';
import { Socket } from 'socket.io-client';
import { socketService } from '../services/socketService';
import { sosService } from '../services/sosService';
import { useAuth } from './AuthContext';

export interface InboundSosAlert {
  alertId: string | number;
  userId: string | number;
  userName?: string;
  latitude: number;
  longitude: number;
  batteryPercentage?: number;
  audioUrl?: string;
  timestamp: string;
}

export interface LiveAudioChunk {
  alertId: string | number;
  seq: number;
  totalChunksExpected?: number;
  durationSec?: number;
  mimeType?: string;
  data: string;
  isLast: boolean;
  timestamp: string;
}

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  activeEmergency: InboundSosAlert | null;
  latestLiveAudioChunk: LiveAudioChunk | null;
  liveAudioChunksByAlert: Record<string, LiveAudioChunk[]>;
  dismissEmergency: () => void;
  broadcastTestSos: (lat: number, lng: number) => Promise<void>;
  joinAlertRoom: (alertId: string | number) => void;
  leaveAlertRoom: (alertId: string | number) => void;
  unlockAudio: () => void;
  isAudioUnlocked: boolean;
  stopLiveAudioPlayback: () => void;
  isVoiceClarityEnabled: boolean;
  toggleVoiceClarity: () => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = window.atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

interface QueuedAudioChunk {
  alertId: string | number;
  seq: number;
  data: string;
  mimeType: string;
  buffer?: AudioBuffer | null;
}

let webAudioContext: AudioContext | null = null;
const audioQueue: QueuedAudioChunk[] = [];
const enqueuedOrPlayedChunkKeys = new Set<string>();
let isPlayingFromQueue = false;
let currentBufferSource: AudioBufferSourceNode | null = null;
let currentGainNode: GainNode | null = null;
let currentHtml5Audio: HTMLAudioElement | null = null;

// Phase 1: Admin Jitter Buffer & Out-of-Order Sequencer Engine
interface AlertSequenceState {
  lastPlayedSeq: number;
  expectedSeq: number;
  heldChunks: Map<number, QueuedAudioChunk>;
  jitterTimer: ReturnType<typeof setTimeout> | null;
}

const alertSequenceStates = new Map<string, AlertSequenceState>();
const JITTER_BUFFER_WINDOW_MS = 450; // 450ms playout buffer for out-of-order cellular retransmissions

function getAlertSequenceState(alertId: string | number): AlertSequenceState {
  const key = String(alertId);
  let state = alertSequenceStates.get(key);
  if (!state) {
    state = {
      lastPlayedSeq: 0,
      expectedSeq: 1,
      heldChunks: new Map<number, QueuedAudioChunk>(),
      jitterTimer: null,
    };
    alertSequenceStates.set(key, state);
  }
  return state;
}

function flushJitterBufferForAlert(alertId: string | number) {
  const key = String(alertId);
  const state = alertSequenceStates.get(key);
  if (!state) return;
  state.jitterTimer = null;

  if (state.heldChunks.size === 0) return;

  // Find lowest held seq to unblock playback
  const sortedHeldSeqs = Array.from(state.heldChunks.keys()).sort((a, b) => a - b);
  const lowestSeq = sortedHeldSeqs[0];

  console.warn(
    `[SocketContext] Jitter buffer playout window expired (${JITTER_BUFFER_WINDOW_MS}ms) for alert ${alertId}. Missing slice #${state.expectedSeq} skipped to resume live stream. Advancing expected sequence to #${lowestSeq}.`
  );

  state.expectedSeq = lowestSeq;

  // Flush all contiguous chunks starting from lowestSeq
  while (state.heldChunks.has(state.expectedSeq)) {
    const nextHeld = state.heldChunks.get(state.expectedSeq)!;
    state.heldChunks.delete(state.expectedSeq);
    audioQueue.push(nextHeld);
    state.expectedSeq++;
  }

  // If there are still higher chunks held separated by another gap, reschedule timer
  if (state.heldChunks.size > 0) {
    state.jitterTimer = setTimeout(() => {
      flushJitterBufferForAlert(alertId);
    }, JITTER_BUFFER_WINDOW_MS);
  }

  audioQueue.sort((a, b) => a.seq - b.seq);
  if (!isPlayingFromQueue) {
    processAudioQueue();
  }
}

export function stopLiveAudioPlayback() {
  if (currentBufferSource) {
    try {
      currentBufferSource.stop();
      currentBufferSource.disconnect();
    } catch {}
    currentBufferSource = null;
  }
  if (currentGainNode) {
    try {
      currentGainNode.disconnect();
    } catch {}
    currentGainNode = null;
  }
  if (currentHtml5Audio) {
    try {
      currentHtml5Audio.pause();
      currentHtml5Audio.src = '';
    } catch {}
    currentHtml5Audio = null;
  }
  audioQueue.length = 0;
  isPlayingFromQueue = false;

  // Purge all pending jitter timers and out-of-order queues
  for (const [, state] of alertSequenceStates.entries()) {
    if (state.jitterTimer) {
      clearTimeout(state.jitterTimer);
      state.jitterTimer = null;
    }
    state.heldChunks.clear();
  }
  alertSequenceStates.clear();
}

function getWebAudioContext(): AudioContext {
  if (!webAudioContext || webAudioContext.state === 'closed') {
    webAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return webAudioContext;
}

function unlockBrowserAudio(): boolean {
  try {
    const ctx = getWebAudioContext();
    if (ctx.state === 'suspended') {
      ctx.resume().then(() => {
        console.log('[SocketContext] AudioContext successfully resumed & unlocked');
        if (audioQueue.length > 0 && !isPlayingFromQueue) {
          processAudioQueue();
        }
      }).catch(() => {});
    } else {
      if (audioQueue.length > 0 && !isPlayingFromQueue) {
        processAudioQueue();
      }
    }
    return ctx.state === 'running';
  } catch {
    return false;
  }
}

// Global user interaction listener to automatically unlock audio as soon as admin clicks anywhere
if (typeof window !== 'undefined') {
  const handleUserGesture = () => {
    unlockBrowserAudio();
  };
  window.addEventListener('click', handleUserGesture, { passive: true });
  window.addEventListener('keydown', handleUserGesture, { passive: true });
  window.addEventListener('touchstart', handleUserGesture, { passive: true });
}

// Phase 2: Web Audio Voice Clarity & Noise Suppression DSP Chain
let isVoiceClarityGlobalEnabled = typeof window !== 'undefined'
  ? localStorage.getItem('safora_voice_clarity') !== 'false'
  : true;

let liveHighPassFilter: BiquadFilterNode | null = null;
let livePeakingFilter: BiquadFilterNode | null = null;
let liveCompressor: DynamicsCompressorNode | null = null;

function getVoiceClarityDspChain(ctx: AudioContext): AudioNode {
  if (!liveHighPassFilter || liveHighPassFilter.context !== ctx) {
    liveHighPassFilter = ctx.createBiquadFilter();
    liveHighPassFilter.type = 'highpass';
  }
  if (!livePeakingFilter || livePeakingFilter.context !== ctx) {
    livePeakingFilter = ctx.createBiquadFilter();
    livePeakingFilter.type = 'peaking';
  }
  if (!liveCompressor || liveCompressor.context !== ctx) {
    liveCompressor = ctx.createDynamicsCompressor();
  }

  const now = ctx.currentTime;
  if (isVoiceClarityGlobalEnabled) {
    // 175 Hz High-pass: cuts pocket friction, coat rustle, handling thumps, wind rumble
    liveHighPassFilter.frequency.setValueAtTime(175, now);
    liveHighPassFilter.Q.setValueAtTime(0.707, now);

    // 2.4 kHz Peaking EQ: boosts human consonant & vocal intelligibility
    livePeakingFilter.frequency.setValueAtTime(2400, now);
    livePeakingFilter.Q.setValueAtTime(1.1, now);
    livePeakingFilter.gain.setValueAtTime(3.5, now);

    // Dynamics Compressor: levels quiet whispers, tames loud screams/bursts
    liveCompressor.threshold.setValueAtTime(-24, now);
    liveCompressor.knee.setValueAtTime(12, now);
    liveCompressor.ratio.setValueAtTime(4, now);
    liveCompressor.attack.setValueAtTime(0.003, now);
    liveCompressor.release.setValueAtTime(0.25, now);
  } else {
    // Transparent bypass
    liveHighPassFilter.frequency.setValueAtTime(20, now);
    liveHighPassFilter.Q.setValueAtTime(0.707, now);

    livePeakingFilter.frequency.setValueAtTime(2400, now);
    livePeakingFilter.gain.setValueAtTime(0, now);

    liveCompressor.threshold.setValueAtTime(0, now);
    liveCompressor.ratio.setValueAtTime(1, now);
  }

  // Connect pipeline: highpass -> peaking -> compressor -> destination
  try {
    liveHighPassFilter.disconnect();
    livePeakingFilter.disconnect();
    liveCompressor.disconnect();
  } catch {}

  liveHighPassFilter.connect(livePeakingFilter);
  livePeakingFilter.connect(liveCompressor);
  liveCompressor.connect(ctx.destination);

  return liveHighPassFilter;
}

async function processAudioQueue() {
  if (audioQueue.length === 0) {
    isPlayingFromQueue = false;
    return;
  }

  const ctx = getWebAudioContext();

  // If AudioContext is suspended, attempt to resume. If blocked by browser, preserve queue until user interacts!
  if (ctx.state === 'suspended') {
    try {
      await ctx.resume();
    } catch {}
    if (ctx.state === 'suspended') {
      console.warn('[SocketContext] AudioContext suspended waiting for user gesture — preserving chunks in queue');
      isPlayingFromQueue = false;
      return;
    }
  }

  isPlayingFromQueue = true;
  const nextItem = audioQueue.shift()!;

  // Update chronological playback tracking for this alert
  const seqState = alertSequenceStates.get(String(nextItem.alertId));
  if (seqState) {
    seqState.lastPlayedSeq = Math.max(seqState.lastPlayedSeq, nextItem.seq);
  }

  try {
    if (currentBufferSource) {
      try { currentBufferSource.stop(); } catch {}
      currentBufferSource = null;
    }
    if (currentGainNode) {
      try { currentGainNode.disconnect(); } catch {}
      currentGainNode = null;
    }
    if (currentHtml5Audio) {
      currentHtml5Audio.pause();
      currentHtml5Audio = null;
    }

    // Pipe 1: Web Audio API AudioBuffer playback (gapless, micro-fades, no autoplay restriction once context is running)
    let buffer = nextItem.buffer;
    if (!buffer) {
      try {
        const rawBuf = base64ToArrayBuffer(nextItem.data);
        buffer = await ctx.decodeAudioData(rawBuf);
      } catch (decodeErr) {
        console.warn(`[SocketContext] Web Audio decoding failed for chunk #${nextItem.seq}:`, decodeErr);
      }
    }

    if (buffer) {
      const source = ctx.createBufferSource();
      source.buffer = buffer;

      // Gentle micro-fades (6ms) at slice boundaries to completely eliminate PCM edge clicks
      const gainNode = ctx.createGain();
      const now = ctx.currentTime;
      const duration = buffer.duration;
      gainNode.gain.setValueAtTime(0.001, now);
      gainNode.gain.exponentialRampToValueAtTime(1.0, now + 0.006);
      if (duration > 0.02) {
        gainNode.gain.setValueAtTime(1.0, now + duration - 0.006);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration);
      }

      const dspInputNode = getVoiceClarityDspChain(ctx);
      source.connect(gainNode);
      gainNode.connect(dspInputNode);
      currentBufferSource = source;
      currentGainNode = gainNode;

      source.onended = () => {
        try {
          source.disconnect();
          gainNode.disconnect();
        } catch {}
        currentBufferSource = null;
        currentGainNode = null;
        processAudioQueue();
      };
      source.start(0);
      return;
    }

    // Pipe 2: HTML5 Audio element fallback
    const dataUri = `data:${nextItem.mimeType || 'audio/wav'};base64,${nextItem.data}`;
    const audio = new Audio(dataUri);
    currentHtml5Audio = audio;
    audio.onended = () => {
      currentHtml5Audio = null;
      processAudioQueue();
    };
    audio.onerror = () => {
      currentHtml5Audio = null;
      processAudioQueue();
    };
    await audio.play();
  } catch (err) {
    console.warn(`[SocketContext] Error playing queued audio chunk #${nextItem.seq}:`, err);
    currentBufferSource = null;
    currentGainNode = null;
    currentHtml5Audio = null;
    processAudioQueue();
  }
}

async function enqueueAndPlayChunk(chunk: LiveAudioChunk) {
  try {
    const soundEnabled = localStorage.getItem('safora_sound_alerts') !== 'false';
    if (!soundEnabled || !chunk.data) return;

    // Dual-transport deduplication: ensure native OkHttp and Socket.IO identical chunks don't play twice
    const chunkKey = `${chunk.alertId}:${chunk.seq}`;
    if (enqueuedOrPlayedChunkKeys.has(chunkKey)) {
      console.log(`[SocketContext] Deduplicated incoming audio slice #${chunk.seq} for alert ${chunk.alertId}`);
      return;
    }
    enqueuedOrPlayedChunkKeys.add(chunkKey);
    if (enqueuedOrPlayedChunkKeys.size > 200) {
      const it = enqueuedOrPlayedChunkKeys.values();
      for (let i = 0; i < 50; i++) {
        const key = it.next().value;
        if (key) enqueuedOrPlayedChunkKeys.delete(key);
      }
    }

    const state = getAlertSequenceState(chunk.alertId);

    // If slice sequence has already played (obsolete late arrival), drop it immediately
    if (state.lastPlayedSeq > 0 && chunk.seq <= state.lastPlayedSeq) {
      console.log(
        `[SocketContext] Dropping late/obsolete audio slice #${chunk.seq} (already played up to #${state.lastPlayedSeq})`
      );
      return;
    }

    // Pre-decode audio buffer in background for instant gapless playback
    let decodedBuffer: AudioBuffer | null = null;
    try {
      const ctx = getWebAudioContext();
      if (ctx.state === 'running') {
        const rawBuf = base64ToArrayBuffer(chunk.data);
        decodedBuffer = await ctx.decodeAudioData(rawBuf);
      }
    } catch {}

    const queuedItem: QueuedAudioChunk = {
      alertId: chunk.alertId,
      seq: chunk.seq,
      data: chunk.data,
      mimeType: chunk.mimeType || 'audio/wav',
      buffer: decodedBuffer,
    };

    // Jitter Buffer & Out-of-Order Sequencer Engine:
    if (chunk.seq === state.expectedSeq) {
      // In-order slice arrived
      audioQueue.push(queuedItem);
      state.expectedSeq++;

      // Unblock any previously held subsequent contiguous slices
      while (state.heldChunks.has(state.expectedSeq)) {
        const nextHeld = state.heldChunks.get(state.expectedSeq)!;
        state.heldChunks.delete(state.expectedSeq);
        audioQueue.push(nextHeld);
        console.log(`[SocketContext] Jitter buffer unblocked held slice #${nextHeld.seq} for alert ${chunk.alertId}`);
        state.expectedSeq++;
      }

      // If all held chunks resolved, cancel timer
      if (state.heldChunks.size === 0 && state.jitterTimer) {
        clearTimeout(state.jitterTimer);
        state.jitterTimer = null;
      } else if (state.heldChunks.size > 0 && !state.jitterTimer) {
        // If there's another gap further ahead, start jitter window for next missing slice
        state.jitterTimer = setTimeout(() => {
          flushJitterBufferForAlert(chunk.alertId);
        }, JITTER_BUFFER_WINDOW_MS);
      }

      audioQueue.sort((a, b) => a.seq - b.seq);
      if (!isPlayingFromQueue) {
        processAudioQueue();
      }
    } else if (chunk.seq > state.expectedSeq) {
      // Gap detected (e.g. Expected #2, but received #3 due to LTE tower handover or parallel TCP paths)
      state.heldChunks.set(chunk.seq, queuedItem);
      console.warn(
        `[SocketContext] Jitter buffer holding out-of-order slice #${chunk.seq} for alert ${chunk.alertId} (waiting for slice #${state.expectedSeq}, hold window: ${JITTER_BUFFER_WINDOW_MS}ms)`
      );

      // Start playout timer if not already running
      if (!state.jitterTimer) {
        state.jitterTimer = setTimeout(() => {
          flushJitterBufferForAlert(chunk.alertId);
        }, JITTER_BUFFER_WINDOW_MS);
      }
    } else {
      // chunk.seq < state.expectedSeq but > state.lastPlayedSeq
      // (arrived before playout queue finished, but after a timeout advanced expectedSeq)
      audioQueue.push(queuedItem);
      audioQueue.sort((a, b) => a.seq - b.seq);
      if (!isPlayingFromQueue) {
        processAudioQueue();
      }
    }
  } catch (err) {
    console.warn('[SocketContext] Audio queueing failed for live chunk:', err);
  }
}

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { token } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [activeEmergency, setActiveEmergency] = useState<InboundSosAlert | null>(null);
  const [latestLiveAudioChunk, setLatestLiveAudioChunk] = useState<LiveAudioChunk | null>(null);
  const [liveAudioChunksByAlert, setLiveAudioChunksByAlert] = useState<Record<string, LiveAudioChunk[]>>({});
  const [isAudioUnlocked, setIsAudioUnlocked] = useState(false);
  const [isVoiceClarityEnabled, setIsVoiceClarityEnabled] = useState<boolean>(() => isVoiceClarityGlobalEnabled);

  const toggleVoiceClarity = () => {
    isVoiceClarityGlobalEnabled = !isVoiceClarityGlobalEnabled;
    try {
      localStorage.setItem('safora_voice_clarity', String(isVoiceClarityGlobalEnabled));
    } catch {}
    setIsVoiceClarityEnabled(isVoiceClarityGlobalEnabled);
    if (webAudioContext && webAudioContext.state === 'running') {
      getVoiceClarityDspChain(webAudioContext);
    }
  };

  useEffect(() => {
    const checkState = () => {
      if (webAudioContext && webAudioContext.state === 'running') {
        setIsAudioUnlocked(true);
      }
    };
    checkState();
    const timer = setInterval(checkState, 1500);
    window.addEventListener('click', checkState, { passive: true });
    window.addEventListener('keydown', checkState, { passive: true });
    return () => {
      clearInterval(timer);
      window.removeEventListener('click', checkState);
      window.removeEventListener('keydown', checkState);
    };
  }, []);

  useEffect(() => {
    const s = socketService.connect(token);
    if (!s) {
      return;
    }
    setSocket(s);

    const onConnect = () => setIsConnected(true);
    const onDisconnect = () => setIsConnected(false);

    s.on('connect', onConnect);
    s.on('disconnect', onDisconnect);

    // Listen to real-time incoming emergency alerts
    s.on('sos:alert', (data: InboundSosAlert) => {
      console.log('[Socket] LIVE EMERGENCY RECEIVED:', data);
      setActiveEmergency(data);

      // Play audio chime if dispatcher has enabled sound alerts
      const soundEnabled = localStorage.getItem('safora_sound_alerts') !== 'false';
      if (soundEnabled) {
        try {
          const audioCtx = getWebAudioContext();
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(880, audioCtx.currentTime); // A5 note
          osc.frequency.exponentialRampToValueAtTime(440, audioCtx.currentTime + 0.8);
          gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.8);
          osc.connect(gain);
          gain.connect(audioCtx.destination);
          osc.start();
          osc.stop(audioCtx.currentTime + 0.8);
        } catch {
          // Audio playback prevented by autoplay policies until interaction
        }
      }
    });

    // Listen for progressive 5-second live audio slices streamed from device
    s.on('sos:live_audio_chunk', (chunk: LiveAudioChunk) => {
      console.log(
        `[Socket] LIVE AUDIO CHUNK #${chunk.seq} received for alert ${chunk.alertId}`,
      );
      setLatestLiveAudioChunk(chunk);
      setLiveAudioChunksByAlert(prev => {
        const key = String(chunk.alertId);
        const existing = prev[key] || [];
        if (existing.some(c => c.seq === chunk.seq)) return prev;
        const updated = [...existing, chunk].sort((a, b) => a.seq - b.seq);
        return { ...prev, [key]: updated };
      });
      enqueueAndPlayChunk(chunk);
    });

    // Listen for final stitched / master audio evidence attachment
    s.on('sos:audio', (data: { alertId: string | number; audioUrl: string }) => {
      console.log('[Socket] AUDIO ATTACHED TO SOS ALERT:', data);
      setActiveEmergency(prev => {
        if (prev && String(prev.alertId) === String(data.alertId)) {
          return { ...prev, audioUrl: data.audioUrl };
        }
        return prev;
      });
    });

    return () => {
      s.off('connect', onConnect);
      s.off('disconnect', onDisconnect);
      s.off('sos:alert');
      s.off('sos:live_audio_chunk');
      s.off('sos:audio');
      stopLiveAudioPlayback();
      socketService.disconnect();
    };
  }, [token]);

  const dismissEmergency = () => {
    setActiveEmergency(null);
    stopLiveAudioPlayback();
  };

  const joinAlertRoom = (alertId: string | number) => {
    if (socket && alertId) {
      socket.emit('sos:join', { alertId });
    }
  };

  const leaveAlertRoom = (alertId: string | number) => {
    if (socket && alertId) {
      socket.emit('sos:leave', { alertId });
    }
  };

  const unlockAudio = () => {
    unlockBrowserAudio();
    setIsAudioUnlocked(true);
  };

  const broadcastTestSos = async (lat: number, lng: number) => {
    try {
      await sosService.triggerDispatcherSOS(lat, lng);
      console.log('[SocketContext] Verified test SOS triggered via REST dispatch API');
    } catch (err) {
      console.error('[SocketContext] Failed to trigger dispatcher drill SOS:', err);
    }
  };

  return (
    <SocketContext.Provider
      value={{
        socket,
        isConnected,
        activeEmergency,
        latestLiveAudioChunk,
        liveAudioChunksByAlert,
        dismissEmergency,
        broadcastTestSos,
        joinAlertRoom,
        leaveAlertRoom,
        unlockAudio,
        isAudioUnlocked,
        stopLiveAudioPlayback,
        isVoiceClarityEnabled,
        toggleVoiceClarity,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = (): SocketContextType => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

