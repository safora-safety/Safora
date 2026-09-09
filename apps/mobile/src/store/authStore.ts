import { create } from 'zustand';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role?: string;
}

interface AuthState {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isGuest: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  enterAsGuest: () => void;
  login: (email: string, pass: string) => Promise<boolean>;
  register: (
    name: string,
    email: string,
    phone: string,
    pass: string,
  ) => Promise<boolean>;
  logout: () => void;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>(set => ({
  user: null,
  isAuthenticated: false,
  isGuest: false,
  isLoading: false,
  error: null,

  enterAsGuest: () => {
    set({
      user: {
        id: 'guest-user',
        name: 'Guest Explorer',
        email: 'guest@safora.app',
      },
      isAuthenticated: true,
      isGuest: true,
      error: null,
    });
  },

  login: async (email: string) => {
    set({ isLoading: true, error: null });
    try {
      // Simulate/mock API auth response for demo APK
      await new Promise(resolve => setTimeout(resolve, 800));
      const mockName = email.split('@')[0];
      const capitalized = mockName.charAt(0).toUpperCase() + mockName.slice(1);

      set({
        user: {
          id: 'user-' + Date.now(),
          name: capitalized || 'Safora Member',
          email: email.trim(),
        },
        isAuthenticated: true,
        isGuest: false,
        isLoading: false,
      });
      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Authentication failed';
      set({ error: msg, isLoading: false });
      return false;
    }
  },

  register: async (name: string, email: string, phone: string) => {
    set({ isLoading: true, error: null });
    try {
      await new Promise(resolve => setTimeout(resolve, 800));
      set({
        user: {
          id: 'user-' + Date.now(),
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
        },
        isAuthenticated: true,
        isGuest: false,
        isLoading: false,
      });
      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Registration failed';
      set({ error: msg, isLoading: false });
      return false;
    }
  },

  logout: () => {
    set({
      user: null,
      isAuthenticated: false,
      isGuest: false,
      error: null,
    });
  },

  clearError: () => set({ error: null }),
}));
