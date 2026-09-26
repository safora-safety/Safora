import { io, Socket } from 'socket.io-client';
import { API_BASE_URL } from './apiClient';

let socket: Socket | null = null;

// Socket host is origin of API_BASE_URL (stripping trailing /api)
const SOCKET_URL = API_BASE_URL.replace(/\/api\/?$/, '');

const activeRooms = new Set<string | number>();

export function connectSocket(jwt: string): Socket {
  if (socket?.connected) {
    return socket;
  }

  if (socket) {
    socket.disconnect();
  }

  socket = io(SOCKET_URL, {
    auth: { token: jwt },
    reconnection: true,
    reconnectionAttempts: 15,
    reconnectionDelay: 2000,
    transports: ['websocket', 'polling'],
  });

  socket.on('connect', () => {
    console.log('[Socket.IO Mobile] Connected to server:', socket?.id);
    // Auto-rejoin rooms on reconnection
    activeRooms.forEach(id => {
      socket?.emit('journey:join', { journeyId: id });
    });
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

export function disconnectSocket(): void {
  activeRooms.clear();
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export function getSocket(): Socket | null {
  return socket;
}
