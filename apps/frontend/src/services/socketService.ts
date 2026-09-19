import { io, Socket } from 'socket.io-client';

export const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL || 'https://safora-backend.onrender.com';

class SocketService {
  private socket: Socket | null = null;
  private isConnected = false;

  connect(explicitToken?: string | null): Socket | null {
    const token = explicitToken || localStorage.getItem('safora_admin_token');
    if (!token) {
      console.log('[Socket.IO] No admin JWT token available. Skipping connection.');
      return null;
    }

    if (this.socket) {
      if (this.socket.connected) {
        return this.socket;
      }
      this.socket.disconnect();
      this.socket = null;
    }

    this.socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      auth: {
        token,
      },
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
