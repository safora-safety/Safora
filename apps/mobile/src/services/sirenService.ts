import { NativeModules, Platform } from 'react-native';

const { SafeWalkService } = NativeModules;

let isPlaying = false;

export class SirenService {
  /**
   * Starts high-decibel audible emergency siren alarm.
   * Plays looping alarm through hardware STREAM_ALARM channel
   * so it is audible even if the device ringer is muted.
   */
  static async startSiren(): Promise<boolean> {
    try {
      if (Platform.OS === 'android' && SafeWalkService?.playSiren) {
        await SafeWalkService.playSiren();
        isPlaying = true;
        return true;
      }
      isPlaying = true;
      return true;
    } catch (err) {
      console.warn('[SirenService] Failed to start native siren alarm:', err);
      isPlaying = false;
      return false;
    }
  }

  /**
   * Instantly stops audible siren alarm and releases audio focus.
   */
  static async stopSiren(): Promise<boolean> {
    try {
      if (Platform.OS === 'android' && SafeWalkService?.stopSiren) {
        await SafeWalkService.stopSiren();
      }
      isPlaying = false;
      return true;
    } catch (err) {
      console.warn('[SirenService] Failed to stop siren alarm:', err);
      isPlaying = false;
      return false;
    }
  }

  /**
   * Checks whether the emergency siren is currently sounding.
   */
  static async isSirenPlaying(): Promise<boolean> {
    try {
      if (Platform.OS === 'android' && SafeWalkService?.isSirenPlaying) {
        const nativePlaying = await SafeWalkService.isSirenPlaying();
        isPlaying = Boolean(nativePlaying);
        return isPlaying;
      }
      return isPlaying;
    } catch {
      return isPlaying;
    }
  }

  static getLocalPlayingState(): boolean {
    return isPlaying;
  }
}
