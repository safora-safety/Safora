import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User } from '@safora/shared-types';
import { AuthService } from '../services/authService';

export type UserProfile = User;

export interface SavedProfile {
  id: string | number;
  name: string;
  email: string;
  phone?: string;
  token?: string;
  lastActive?: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isGuest: boolean;
  hasSeenOnboarding: boolean;
  isHydrated: boolean;
  isLoading: boolean;
  error: string | null;
  savedProfiles: SavedProfile[];

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
  removeSavedProfile: (id: string | number) => Promise<void>;
  clearError: () => void;
}

const STORAGE_KEYS = {
  USER: '@safora_user',
  TOKEN: '@safora_token',
  IS_GUEST: '@safora_is_guest',
  ONBOARDING_SEEN: '@safora_onboarding_seen',
  SAVED_PROFILES: '@safora_saved_profiles',
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
  savedProfiles: [],

  hydrateAuth: async () => {
    try {
      const [
        storedUser,
        storedToken,
        storedGuest,
        storedOnboarding,
        storedProfiles,
      ] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.USER),
        AsyncStorage.getItem(STORAGE_KEYS.TOKEN),
        AsyncStorage.getItem(STORAGE_KEYS.IS_GUEST),
        AsyncStorage.getItem(STORAGE_KEYS.ONBOARDING_SEEN),
        AsyncStorage.getItem(STORAGE_KEYS.SAVED_PROFILES),
      ]);

      let parsedProfiles: SavedProfile[] = [];
      try {
        parsedProfiles = storedProfiles ? JSON.parse(storedProfiles) : [];
      } catch {
        parsedProfiles = [];
      }

      const isGuest = storedGuest === 'true';
      const hasSeenOnboarding = storedOnboarding === 'true';

      if (storedUser && (storedToken || isGuest)) {
        let parsedUser: User;
        try {
          parsedUser = JSON.parse(storedUser) as User;
        } catch {
          parsedUser = {
            id: 'guest-user',
            name: 'Guest Explorer',
            email: 'guest@safora.app',
            role: 'user',
          };
        }

        set({
          user: parsedUser,
          token: storedToken || 'guest-session-token',
          isAuthenticated: true,
          isGuest,
          hasSeenOnboarding: true,
          isHydrated: true,
          savedProfiles: parsedProfiles,
        });
      } else {
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          isGuest: false,
          isHydrated: true,
          hasSeenOnboarding,
          savedProfiles: parsedProfiles,
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
      await AsyncStorage.setItem(STORAGE_KEYS.TOKEN, 'guest-session-token');
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

      // Update saved profiles
      const newProfile: SavedProfile = {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        lastActive: new Date().toISOString(),
      };
      const filtered = _get().savedProfiles.filter(
        p => String(p.id) !== String(user.id) && p.email !== user.email,
      );
      const updatedProfiles = [newProfile, ...filtered];
      await AsyncStorage.setItem(
        STORAGE_KEYS.SAVED_PROFILES,
        JSON.stringify(updatedProfiles),
      );

      set({
        user,
        token,
        isAuthenticated: true,
        isGuest: false,
        hasSeenOnboarding: true,
        isLoading: false,
        savedProfiles: updatedProfiles,
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

      // Update saved profiles
      const newProfile: SavedProfile = {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        lastActive: new Date().toISOString(),
      };
      const filtered = _get().savedProfiles.filter(
        p => String(p.id) !== String(user.id) && p.email !== user.email,
      );
      const updatedProfiles = [newProfile, ...filtered];
      await AsyncStorage.setItem(
        STORAGE_KEYS.SAVED_PROFILES,
        JSON.stringify(updatedProfiles),
      );

      set({
        user,
        token,
        isAuthenticated: true,
        isGuest: false,
        hasSeenOnboarding: true,
        isLoading: false,
        savedProfiles: updatedProfiles,
      });
      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Registration failed';
      set({ error: msg, isLoading: false });
      return false;
    }
  },

  logout: async () => {
    const currentUser = _get().user;
    let profiles = _get().savedProfiles;

    // Ensure valid non-guest user is preserved in saved profiles list
    if (currentUser && !_get().isGuest && currentUser.id !== 'guest-user') {
      const profileRecord: SavedProfile = {
        id: currentUser.id,
        name: currentUser.name,
        email: currentUser.email,
        phone: currentUser.phone,
        lastActive: new Date().toISOString(),
      };
      const filtered = profiles.filter(
        p =>
          String(p.id) !== String(currentUser.id) &&
          p.email !== currentUser.email,
      );
      profiles = [profileRecord, ...filtered];
      try {
        await AsyncStorage.setItem(
          STORAGE_KEYS.SAVED_PROFILES,
          JSON.stringify(profiles),
        );
      } catch {
        // Fallback
      }
    }

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
      savedProfiles: profiles,
    });
  },

  removeSavedProfile: async (id: string | number) => {
    const updated = _get().savedProfiles.filter(
      p => String(p.id) !== String(id),
    );
    try {
      await AsyncStorage.setItem(
        STORAGE_KEYS.SAVED_PROFILES,
        JSON.stringify(updated),
      );
    } catch {
      // Fallback
    }
    set({ savedProfiles: updated });
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
