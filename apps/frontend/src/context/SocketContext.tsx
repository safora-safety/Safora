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
  seq: number;
  data: string;
  mimeType: string;
  buffer?: AudioBuffer | null;
}

let webAudioContext: AudioContext | null = null;
const audioQueue: QueuedAudioChunk[] = [];
let isPlayingFromQueue = false;
let currentBufferSource: AudioBufferSourceNode | null = null;
let currentHtml5Audio: HTMLAudioElement | null = null;

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

  try {
    if (currentBufferSource) {
      try { currentBufferSource.stop(); } catch {}
      currentBufferSource = null;
    }
    if (currentHtml5Audio) {
      currentHtml5Audio.pause();
      currentHtml5Audio = null;
    }

    // Pipe 1: Web Audio API AudioBuffer playback (gapless, no autoplay restriction once context is running)
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
      source.connect(ctx.destination);
      currentBufferSource = source;

      source.onended = () => {
        currentBufferSource = null;
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
    currentHtml5Audio = null;
    processAudioQueue();
  }
}

async function enqueueAndPlayChunk(chunk: LiveAudioChunk) {
  try {
    const soundEnabled = localStorage.getItem('safora_sound_alerts') !== 'false';
    if (!soundEnabled || !chunk.data) return;

    // Pre-decode audio buffer in background for instant gapless playback
    let decodedBuffer: AudioBuffer | null = null;
    try {
      const ctx = getWebAudioContext();
      if (ctx.state === 'running') {
        const rawBuf = base64ToArrayBuffer(chunk.data);
        decodedBuffer = await ctx.decodeAudioData(rawBuf);
      }
    } catch {}

    audioQueue.push({
      seq: chunk.seq,
      data: chunk.data,
      mimeType: chunk.mimeType || 'audio/wav',
      buffer: decodedBuffer,
    });
    audioQueue.sort((a, b) => a.seq - b.seq);

    if (!isPlayingFromQueue) {
      processAudioQueue();
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
      socketService.disconnect();
    };
  }, [token]);

  const dismissEmergency = () => {
    setActiveEmergency(null);
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

