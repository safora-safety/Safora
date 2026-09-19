import { io, Socket } from 'socket.io-client';

export const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL || 'https://safora-backend.onrender.com';

class SocketService {
  private socket: Socket | null = null;
  private isConnected = false;

  connect(): Socket {
    if (this.socket) {
      return this.socket;
    }

    this.socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
      autoConnect: true,
    });

    this.socket.on('connect', () => {
      this.isConnected = true;
      console.log(`[Socket.IO] Connected to backend operations socket: ${this.socket?.id}`);
    });

    this.socket.on('disconnect', (reason) => {
      this.isConnected = false;
      console.log(`[Socket.IO] Disconnected: ${reason}`);
    });

    this.socket.on('connect_error', (error) => {
      console.warn('[Socket.IO] Connection error:', error.message);
    });

    return this.socket;
  }

  getSocket(): Socket | null {
    return this.socket;
  }

  getStatus(): boolean {
    return this.isConnected;
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }
}

export const socketService = new SocketService();
