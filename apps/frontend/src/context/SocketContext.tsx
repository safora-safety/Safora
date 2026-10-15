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
  dismissEmergency: () => void;
  broadcastTestSos: (lat: number, lng: number) => Promise<void>;
  joinAlertRoom: (alertId: string | number) => void;
  leaveAlertRoom: (alertId: string | number) => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

// In-memory ordered audio queue for continuous progressive playback
let webAudioContext: AudioContext | null = null;
const audioQueue: { seq: number; buffer: AudioBuffer }[] = [];
let isPlayingFromQueue = false;

function getWebAudioContext(): AudioContext {
  if (!webAudioContext || webAudioContext.state === 'closed') {
    webAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  if (webAudioContext.state === 'suspended') {
    webAudioContext.resume().catch(() => {});
  }
  return webAudioContext;
}

function processAudioQueue() {
  if (audioQueue.length === 0) {
    isPlayingFromQueue = false;
    return;
  }

  isPlayingFromQueue = true;
  const nextItem = audioQueue.shift()!;
  try {
    const ctx = getWebAudioContext();
    const source = ctx.createBufferSource();
    source.buffer = nextItem.buffer;
    source.connect(ctx.destination);
    source.onended = () => {
      processAudioQueue();
    };
    source.start();
  } catch (err) {
    console.warn('[SocketContext] Error playing queued audio chunk:', err);
    processAudioQueue();
  }
}

async function enqueueAndPlayChunk(chunk: LiveAudioChunk) {
  try {
    const soundEnabled = localStorage.getItem('safora_sound_alerts') !== 'false';
    if (!soundEnabled || !chunk.data) return;

    const ctx = getWebAudioContext();
    const binary = window.atob(chunk.data);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }

    const decoded = await ctx.decodeAudioData(bytes.buffer.slice(0));
    audioQueue.push({ seq: chunk.seq, buffer: decoded });
    audioQueue.sort((a, b) => a.seq - b.seq);

    if (!isPlayingFromQueue) {
      processAudioQueue();
    }
  } catch (err) {
    console.warn('[SocketContext] Audio decoding failed for live chunk:', err);
  }
}

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { token } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [activeEmergency, setActiveEmergency] = useState<InboundSosAlert | null>(null);
  const [latestLiveAudioChunk, setLatestLiveAudioChunk] = useState<LiveAudioChunk | null>(null);

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
    if (socket) {
      socket.emit('sos:join', { alertId });
    }
  };

  const leaveAlertRoom = (alertId: string | number) => {
    if (socket) {
      socket.emit('sos:leave', { alertId });
    }
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
        dismissEmergency,
        broadcastTestSos,
        joinAlertRoom,
        leaveAlertRoom,
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

