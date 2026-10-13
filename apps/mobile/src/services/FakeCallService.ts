import { NativeModules, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { SafeWalkService } = NativeModules;
const FAKE_CALL_LANG_KEY = '@safora_fake_call_lang';

export type FakeCallLanguage = 'en' | 'hi';

export class FakeCallService {
  /**
   * Get persisted fake call dialogue language preference
   */
  static async getPreferredLanguage(): Promise<FakeCallLanguage> {
    try {
      const saved = await AsyncStorage.getItem(FAKE_CALL_LANG_KEY);
      if (saved === 'hi' || saved === 'en') {
        return saved;
      }
      return 'en';
    } catch {
      return 'en';
    }
  }

  /**
   * Set fake call dialogue language preference
   */
  static async setPreferredLanguage(lang: FakeCallLanguage): Promise<void> {
    try {
      await AsyncStorage.setItem(FAKE_CALL_LANG_KEY, lang);
    } catch {
      // Ignore
    }
  }

  /**
   * Start fake call conversation audio through earpiece or loudspeaker
   */
  static async startFakeCallAudio(
    language: FakeCallLanguage = 'en',
    isSpeaker = false,
  ): Promise<boolean> {
    try {
      if (Platform.OS === 'android' && SafeWalkService?.playFakeCall) {
        return await SafeWalkService.playFakeCall(language, isSpeaker);
      }
      return true;
    } catch (err) {
      console.warn('[FakeCallService] Failed to play fake call audio:', err);
      return false;
    }
  }

  /**
   * Stop fake call audio immediately
   */
  static async stopFakeCallAudio(): Promise<boolean> {
    try {
      if (Platform.OS === 'android' && SafeWalkService?.stopFakeCall) {
        return await SafeWalkService.stopFakeCall();
      }
      return true;
    } catch {
      return false;
    }
  }
}
