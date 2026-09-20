import { PermissionsAndroid, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Sound } from 'react-native-nitro-sound';
import { SosService } from './sosService';

let isRecording = false;
const MIC_PERMISSION_PROMPTED_KEY = '@safora_mic_permission_prompted';

export class AudioRecorderService {
  /**
   * Request microphone recording permission on Android with explicit user consent.
   */
  static async requestPermission(): Promise<boolean> {
    if (Platform.OS !== 'android') return true;
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
        {
          title: 'Microphone Consent for Safety Evidence',
          message:
            'SAFORA captures 30 seconds of ambient audio when an emergency SOS is triggered. This evidence is stored securely and shared only with your emergency contacts and verified dispatchers. Do you allow microphone access for this safety feature?',
          buttonNeutral: 'Ask Later',
          buttonNegative: 'Deny',
          buttonPositive: 'Allow & Consent',
        },
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch {
      return false;
    }
  }

  /**
   * Prompt user for microphone permission at most once unless forced.
   * Persists prompt state in AsyncStorage under @safora_mic_permission_prompted.
   */
  static async requestPermissionOnce(force = false): Promise<boolean> {
    if (Platform.OS !== 'android') return true;
    try {
      if (!force) {
        const alreadyPrompted = await AsyncStorage.getItem(
          MIC_PERMISSION_PROMPTED_KEY,
        );
        if (alreadyPrompted === 'true') {
          return await PermissionsAndroid.check(
            PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
          );
        }
      }

      await AsyncStorage.setItem(MIC_PERMISSION_PROMPTED_KEY, 'true');
      return await this.requestPermission();
    } catch {
      return false;
    }
  }

  /**
   * Start 30-second ambient audio recording in background
   */
  static async startRecording(): Promise<boolean> {
    try {
      if (isRecording) {
        await this.stopSilent();
      }

      let hasPermission = false;
      if (Platform.OS === 'android') {
        hasPermission = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
        );
        if (!hasPermission) {
          hasPermission = await this.requestPermissionOnce(false);
        }
      } else {
        hasPermission = true;
      }

      if (!hasPermission) {
        console.warn('[AudioRecorder] Microphone permission not granted');
        return false;
      }

      await Sound.startRecorder();
      isRecording = true;
      return true;
    } catch (err) {
      console.warn('[AudioRecorder] Failed to start audio recording:', err);
      isRecording = false;
      return false;
    }
  }

  /**
   * Stop ambient recording and upload evidence to Cloudinary,
   * attaching the audio URL to the active SOS alert
   */
  static async stopAndUpload(
    alertId?: string | number,
  ): Promise<string | null> {
    if (!isRecording) return null;

    // Prevent orphan uploads when there is no alert to attach to
    if (!alertId) {
      await this.stopSilent();
      return null;
    }

    try {
      isRecording = false;
      const uri = await Sound.stopRecorder();
      if (!uri) return null;

      const { audioUrl } = await SosService.uploadAudio(uri);
      if (audioUrl && alertId) {
        await SosService.attachAudioToAlert(alertId, audioUrl);
      }
      return audioUrl;
    } catch (err) {
      console.warn(
        '[AudioRecorder] Failed to stop & upload audio evidence:',
        err,
      );
      return null;
    }
  }

  /**
   * Stop recording silently without uploading (for aborts/cancellations)
   */
  static async stopSilent(): Promise<void> {
    if (!isRecording) return;
    try {
      isRecording = false;
      await Sound.stopRecorder();
    } catch {
      // Ignore
    }
  }

  static isCurrentlyRecording(): boolean {
    return isRecording;
  }
}
