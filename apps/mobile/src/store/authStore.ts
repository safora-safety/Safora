import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User } from '@safora/shared-types';
import { AuthService } from '../services/authService';

export type UserProfile = User;

interface AuthState {
  user: User | null;
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
  updateProfile: (data: Partial<User>) => Promise<boolean>;
  clearError: () => void;
}

const STORAGE_KEYS = {
  USER: '@safora_user',
  TOKEN: '@safora_token',
  IS_GUEST: '@safora_is_guest',
  ONBOARDING_SEEN: '@safora_onboarding_seen',
};

export const useAuthStore = create<AuthState>((set, _get) => ({
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

      if (storedUser && storedToken) {
        set({
          user: JSON.parse(storedUser) as User,
          token: storedToken,
          isAuthenticated: true,
          isGuest: storedGuest === 'true',
          hasSeenOnboarding: storedOnboarding === 'true',
          isHydrated: true,
        });
      } else {
        set({
          isHydrated: true,
          hasSeenOnboarding: storedOnboarding === 'true',
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
    const guestUser: User = {
      id: 'guest-user',
      name: 'Guest Explorer',
      email: 'guest@safora.app',
      role: 'user',
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

  login: async (email: string, pass: string) => {
    set({ isLoading: true, error: null });
    try {
      const { user, token } = await AuthService.login(email, pass);

      await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
      await AsyncStorage.setItem(STORAGE_KEYS.TOKEN, token);
      await AsyncStorage.setItem(STORAGE_KEYS.IS_GUEST, 'false');
      await AsyncStorage.setItem(STORAGE_KEYS.ONBOARDING_SEEN, 'true');

      set({
        user,
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

  register: async (
    name: string,
    email: string,
    phone: string,
    pass: string,
  ) => {
    set({ isLoading: true, error: null });
    try {
      const { user, token } = await AuthService.register(
        name,
        email,
        phone,
        pass,
      );

      await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
      await AsyncStorage.setItem(STORAGE_KEYS.TOKEN, token);
      await AsyncStorage.setItem(STORAGE_KEYS.IS_GUEST, 'false');
      await AsyncStorage.setItem(STORAGE_KEYS.ONBOARDING_SEEN, 'true');

      set({
        user,
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
      await Promise.all([
        AsyncStorage.removeItem(STORAGE_KEYS.USER),
        AsyncStorage.removeItem(STORAGE_KEYS.TOKEN),
        AsyncStorage.removeItem(STORAGE_KEYS.IS_GUEST),
      ]);
    } catch {
      // Cleanup fallback
    }

    set({
      user: null,
      token: null,
      isAuthenticated: false,
      isGuest: false,
      error: null,
    });
  },

  updateProfile: async (data: Partial<User>) => {
    set({ isLoading: true, error: null });
    try {
      const currentUser = _get().user;
      if (!currentUser) throw new Error('No user logged in');

      let updatedUser: User;
      if (_get().isGuest) {
        updatedUser = {
          ...currentUser,
          ...data,
        };
      } else {
        const res = await AuthService.updateProfile({
          name: data.name,
          email: data.email,
          phone: data.phone,
          bloodGroup: data.bloodGroup,
          emergencyNotes: data.emergencyNotes,
        });
        updatedUser = {
          ...currentUser,
          ...res.user,
          ...data,
        };
      }

      await AsyncStorage.setItem(
        STORAGE_KEYS.USER,
        JSON.stringify(updatedUser),
      );
      set({ user: updatedUser, isLoading: false });
      return true;
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'Failed to update profile';
      set({ error: msg, isLoading: false });
      return false;
    }
  },

  clearError: () => set({ error: null }),
}));
