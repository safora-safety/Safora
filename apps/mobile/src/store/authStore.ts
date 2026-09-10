import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role?: string;
}

interface AuthState {
  user: UserProfile | null;
  token: string | null;
  isAuthenticated: boolean;
  isGuest: boolean;
  hasSeenOnboarding: boolean;
  isHydrated: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  hydrateAuth: () => Promise<void>;
  completeOnboarding: () => Promise<void>;
  enterAsGuest: () => Promise<void>;
  login: (email: string, pass: string) => Promise<boolean>;
  register: (
    name: string,
    email: string,
    phone: string,
    pass: string,
  ) => Promise<boolean>;
  logout: () => Promise<void>;
  clearError: () => void;
}

const STORAGE_KEYS = {
  USER: '@safora_user',
  TOKEN: '@safora_token',
  IS_GUEST: '@safora_is_guest',
  ONBOARDING_SEEN: '@safora_onboarding_seen',
};

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isGuest: false,
  hasSeenOnboarding: false,
  isHydrated: false,
  isLoading: false,
  error: null,

  hydrateAuth: async () => {
    try {
      const [storedUser, storedToken, storedGuest, storedOnboarding] =
        await Promise.all([
          AsyncStorage.getItem(STORAGE_KEYS.USER),
          AsyncStorage.getItem(STORAGE_KEYS.TOKEN),
          AsyncStorage.getItem(STORAGE_KEYS.IS_GUEST),
          AsyncStorage.getItem(STORAGE_KEYS.ONBOARDING_SEEN),
        ]);

      const hasSeenOnboarding = storedOnboarding === 'true';
      const isGuest = storedGuest === 'true';

      if (storedUser && (storedToken || isGuest)) {
        set({
          user: JSON.parse(storedUser),
          token: storedToken,
          isAuthenticated: true,
          isGuest,
          hasSeenOnboarding,
          isHydrated: true,
        });
      } else {
        set({
          hasSeenOnboarding,
          isHydrated: true,
        });
      }
    } catch {
      set({ isHydrated: true });
    }
  },

  completeOnboarding: async () => {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.ONBOARDING_SEEN, 'true');
      set({ hasSeenOnboarding: true });
    } catch {
      set({ hasSeenOnboarding: true });
    }
  },

  enterAsGuest: async () => {
    const guestUser: UserProfile = {
      id: 'guest-user',
      name: 'Guest Explorer',
      email: 'guest@safora.app',
      role: 'guest',
    };

    try {
      await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(guestUser));
      await AsyncStorage.setItem(STORAGE_KEYS.IS_GUEST, 'true');
      await AsyncStorage.setItem(STORAGE_KEYS.ONBOARDING_SEEN, 'true');
    } catch {
      // Storage fallback
    }

    set({
      user: guestUser,
      token: 'guest-session-token',
      isAuthenticated: true,
      isGuest: true,
      hasSeenOnboarding: true,
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

      const loggedInUser: UserProfile = {
        id: 'user-' + Date.now(),
        name: capitalized || 'Safora Member',
        email: email.trim(),
        role: 'user',
      };
      const token = 'jwt-token-' + Date.now();

      await AsyncStorage.setItem(
        STORAGE_KEYS.USER,
        JSON.stringify(loggedInUser),
      );
      await AsyncStorage.setItem(STORAGE_KEYS.TOKEN, token);
      await AsyncStorage.setItem(STORAGE_KEYS.IS_GUEST, 'false');
      await AsyncStorage.setItem(STORAGE_KEYS.ONBOARDING_SEEN, 'true');

      set({
        user: loggedInUser,
        token,
        isAuthenticated: true,
        isGuest: false,
        hasSeenOnboarding: true,
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
      const registeredUser: UserProfile = {
        id: 'user-' + Date.now(),
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        role: 'user',
      };
      const token = 'jwt-token-' + Date.now();

      await AsyncStorage.setItem(
        STORAGE_KEYS.USER,
        JSON.stringify(registeredUser),
      );
      await AsyncStorage.setItem(STORAGE_KEYS.TOKEN, token);
      await AsyncStorage.setItem(STORAGE_KEYS.IS_GUEST, 'false');
      await AsyncStorage.setItem(STORAGE_KEYS.ONBOARDING_SEEN, 'true');

      set({
        user: registeredUser,
        token,
        isAuthenticated: true,
        isGuest: false,
        hasSeenOnboarding: true,
        isLoading: false,
      });
      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Registration failed';
      set({ error: msg, isLoading: false });
      return false;
    }
  },

  logout: async () => {
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.USER);
      await AsyncStorage.removeItem(STORAGE_KEYS.TOKEN);
      await AsyncStorage.removeItem(STORAGE_KEYS.IS_GUEST);
    } catch {
      // Storage fallback
    }

    set({
      user: null,
      token: null,
      isAuthenticated: false,
      isGuest: false,
      error: null,
    });
  },

  clearError: () => set({ error: null }),
}));
