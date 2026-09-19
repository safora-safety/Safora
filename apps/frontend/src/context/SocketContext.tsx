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

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  activeEmergency: InboundSosAlert | null;
  dismissEmergency: () => void;
  broadcastTestSos: (lat: number, lng: number) => Promise<void>;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { token } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [activeEmergency, setActiveEmergency] = useState<InboundSosAlert | null>(null);

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

      // Play audio chime if browser allows
      try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
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
    });

    // Listen for audio evidence attachment without triggering siren/alarm
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
      s.off('sos:audio');
      socketService.disconnect();
    };
  }, [token]);

  const dismissEmergency = () => {
    setActiveEmergency(null);
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
        dismissEmergency,
        broadcastTestSos,
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
