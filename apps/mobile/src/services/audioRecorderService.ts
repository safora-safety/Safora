import { PermissionsAndroid, Platform } from 'react-native';
import { Sound } from 'react-native-nitro-sound';
import { SosService } from './sosService';

let isRecording = false;

export class AudioRecorderService {
  /**
   * Request microphone recording permission on Android
   */
  static async requestPermission(): Promise<boolean> {
    if (Platform.OS !== 'android') return true;
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
        {
          title: 'Microphone Permission',
          message:
            'SAFORA captures 30 seconds of ambient audio evidence to protect your safety during an emergency SOS.',
          buttonNeutral: 'Ask Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'Allow',
        },
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
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

      const hasPermission = await this.requestPermission();
      if (!hasPermission) {
        console.warn('[AudioRecorder] Microphone permission denied');
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
