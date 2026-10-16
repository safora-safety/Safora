import { io, Socket } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from './apiClient';

let socket: Socket | null = null;
const pendingAudioChunks: any[] = [];

// Socket host is origin of API_BASE_URL (stripping trailing /api)
const SOCKET_URL = API_BASE_URL.replace(/\/api\/?$/, '');

const activeRooms = new Set<string | number>();
const activeSosRooms = new Set<string | number>();

export async function ensureSocketConnected(): Promise<Socket | null> {
  if (socket?.connected) {
    return socket;
  }
  try {
    const token = await AsyncStorage.getItem('@safora_token');
    if (token && token !== 'guest-session-token') {
      return connectSocket(token);
    }
  } catch {}
  return socket;
}

export function connectSocket(jwt: string): Socket {
  if (socket) {
    if (socket.connected) {
      return socket;
    }
    // Update auth token and trigger connect if disconnected, without tearing down instance
    (socket.auth as any) = { token: jwt };
    if (!socket.active) {
      socket.connect();
    }
    return socket;
  }

  socket = io(SOCKET_URL, {
    auth: { token: jwt },
    reconnection: true,
    reconnectionAttempts: 30,
    reconnectionDelay: 1000,
    timeout: 20000,
    transports: ['websocket', 'polling'],
  });

  socket.on('connect', () => {
    console.log('[Socket.IO Mobile] Connected to server:', socket?.id);
    // Auto-rejoin rooms on reconnection
    activeRooms.forEach(id => {
      socket?.emit('journey:join', { journeyId: id });
    });
    activeSosRooms.forEach(id => {
      socket?.emit('sos:join', { alertId: id });
    });

    // Flush any pending emergency audio slices
    while (pendingAudioChunks.length > 0) {
      const item = pendingAudioChunks.shift();
      if (item) {
        console.log(
          `[Socket.IO Mobile] Flushing queued audio chunk #${item.seq} for alert ${item.alertId}`,
        );
        socket?.emit('sos:audio_chunk', item);
      }
    }
  });

  socket.on('connect_error', err => {
    console.warn('[Socket.IO Mobile] Connection error:', err.message);
  });

  socket.on('disconnect', reason => {
    console.log('[Socket.IO Mobile] Disconnected:', reason);
  });

  return socket;
}

export function joinJourneyRoom(journeyId: number | string): void {
  activeRooms.add(journeyId);
  if (socket) {
    socket.emit('journey:join', { journeyId });
  }
}

export function leaveJourneyRoom(journeyId: number | string): void {
  activeRooms.delete(journeyId);
  if (socket) {
    socket.emit('journey:leave', { journeyId });
  }
}

export function onJourneyLocation(cb: (payload: any) => void): () => void {
  if (!socket) return () => {};

  socket.on('journey:location', cb);
  return () => {
    socket?.off('journey:location', cb);
  };
}

export function onJourneyStart(cb: (payload: any) => void): () => void {
  if (!socket) return () => {};

  socket.on('journey:start', cb);
  return () => {
    socket?.off('journey:start', cb);
  };
}

export function onJourneyEnded(cb: (payload: any) => void): () => void {
  if (!socket) return () => {};

  socket.on('journey:ended', cb);
  return () => {
    socket?.off('journey:ended', cb);
  };
}

export function onSosAlert(cb: (payload: any) => void): () => void {
  if (!socket) return () => {};

  socket.on('sos:alert', cb);
  return () => {
    socket?.off('sos:alert', cb);
  };
}

export function emitSosAudioChunk(data: {
  alertId: string | number;
  seq: number;
  totalChunksExpected?: number;
  durationSec?: number;
  mimeType?: string;
  data: string;
  isLast: boolean;
}): void {
  if (socket?.connected) {
    socket.emit('sos:audio_chunk', data);
  } else {
    console.log(
      `[Socket.IO Mobile] Socket not yet connected, queueing audio chunk #${data.seq} for alert ${data.alertId}`,
    );
    pendingAudioChunks.push(data);
    ensureSocketConnected().catch(() => {});
  }
}

export function onSosAudioChunkAck(cb: (payload: any) => void): () => void {
  if (!socket) return () => {};
  socket.on('sos:audio_chunk_ack', cb);
  return () => {
    socket?.off('sos:audio_chunk_ack', cb);
  };
}

export function joinSosAlertRoom(alertId: string | number): void {
  if (!alertId) return;
  activeSosRooms.add(alertId);
  if (socket?.connected) {
    socket.emit('sos:join', { alertId });
  } else {
    ensureSocketConnected()
      .then(s => {
        s?.emit('sos:join', { alertId });
      })
      .catch(() => {});
  }
}

export function leaveSosAlertRoom(alertId: string | number): void {
  activeSosRooms.delete(alertId);
  if (socket) {
    socket.emit('sos:leave', { alertId });
  }
}

export function onSosLiveAudioChunk(cb: (payload: any) => void): () => void {
  if (!socket) return () => {};
  socket.on('sos:live_audio_chunk', cb);
  return () => {
    socket?.off('sos:live_audio_chunk', cb);
  };
}

export function disconnectSocket(): void {
  activeRooms.clear();
  activeSosRooms.clear();
  pendingAudioChunks.length = 0;
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export function getSocket(): Socket | null {
  return socket;
}
