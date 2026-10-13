import {
  PermissionsAndroid,
  Platform,
  AppState,
  AppStateStatus,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Sound } from 'react-native-nitro-sound';
import { SosService } from './sosService';

let isRecording = false;
let currentPipelineAlertId: string | number | null = null;
let pipelineIntervalTimer: any = null;
let appStateSubscription: any = null;
let chunkIndex = 0;
const TOTAL_DURATION_SEC = 30;
const CHUNK_INTERVAL_SEC = 5;
const PENDING_SOS_AUDIO_KEY = '@safora_pending_sos_audio';
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
            'SAFORA captures ambient audio when an emergency SOS is triggered. This evidence is stored securely and shared only with your emergency contacts and verified dispatchers. Do you allow microphone access for this safety feature?',
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
   * Check whether microphone permission is currently granted on the device.
   */
  static async isPermissionGranted(): Promise<boolean> {
    if (Platform.OS !== 'android') return true;
    try {
      return await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
      );
    } catch {
      return false;
    }
  }

  /**
   * Record that the consent modal was shown or dismissed by the user.
   */
  static async markConsentDecided(): Promise<void> {
    try {
      await AsyncStorage.setItem(MIC_PERMISSION_PROMPTED_KEY, 'true');
    } catch {
      // Ignore storage error
    }
  }

  /**
   * Continuous 30-Second Ambient Audio Recording.
   * Records continuously for 30 full seconds and uploads to Cloudinary upon completion.
   * If the app is interrupted or backgrounded before 30s, the AppState listener flushes
   * and uploads whatever audio was recorded up to that moment.
   */
  static async startRecording(
    alertId?: string | number,
    totalSeconds = TOTAL_DURATION_SEC,
  ): Promise<boolean> {
    try {
      const hasPermission = await this.isPermissionGranted();
      if (!hasPermission) {
        console.warn(
          '[AudioRecorder] Microphone permission missing, skipping audio recording',
        );
        return false;
      }

      // Stop any existing session
      await this.stopSilent();

      currentPipelineAlertId = alertId || null;

      // Register AppState listener to flush recorded audio if phone or app is interrupted
      if (!appStateSubscription) {
        appStateSubscription = AppState.addEventListener(
          'change',
          async (nextAppState: AppStateStatus) => {
            if (
              (nextAppState === 'background' || nextAppState === 'inactive') &&
              isRecording
            ) {
              console.log(
                '[AudioRecorder] App backgrounded/interrupted — flushing active audio recording immediately',
              );
              await this.stopAndUpload(currentPipelineAlertId);
            }
          },
        );
      }

      // Start continuous audio recording
      await Sound.startRecorder();
      isRecording = true;

      // Timer to stop and upload full recording after totalSeconds
      pipelineIntervalTimer = setTimeout(async () => {
        if (isRecording) {
          console.log(
            `[AudioRecorder] Completed full ${totalSeconds}s continuous recording`,
          );
          await this.stopAndUpload(currentPipelineAlertId);
        }
      }, totalSeconds * 1000);

      return true;
    } catch (err) {
      console.warn('[AudioRecorder] Failed to start audio recording:', err);
      isRecording = false;
      this.cleanupPipeline();
      return false;
    }
  }

  /**
   * Compatibility alias
   */
  static async startStreamingPipeline(
    alertId?: string | number,
    totalSeconds = TOTAL_DURATION_SEC,
  ): Promise<boolean> {
    return this.startRecording(alertId, totalSeconds);
  }

  /**
   * Upload an individual audio slice and link to SOS alert
   */
  private static async uploadAndAttachChunk(
    alertId: string | number,
    uri: string,
    idx: number,
  ): Promise<string | null> {
    try {
      console.log(`[AudioRecorder] Uploading 5s audio chunk #${idx}...`);
      const { audioUrl } = await SosService.uploadAudio(uri);
      if (audioUrl && alertId) {
        await SosService.attachAudioToAlert(alertId, audioUrl);
        console.log(
          `[AudioRecorder] Chunk #${idx} attached successfully:`,
          audioUrl,
        );
      }
      return audioUrl;
    } catch (err) {
      console.warn(`[AudioRecorder] Failed to upload chunk #${idx}:`, err);
      return null;
    }
  }

  /**
   * Flush active chunk on app interruption or backgrounding
   */
  private static async flushCurrentChunk(
    alertId?: string | number | null,
  ): Promise<void> {
    if (!isRecording) return;
    try {
      isRecording = false;
      const uri = await Sound.stopRecorder();
      if (uri && alertId) {
        await this.uploadAndAttachChunk(alertId, uri, 999);
      }
    } catch (err) {
      console.warn('[AudioRecorder] Failed to flush chunk:', err);
    }
  }

  /**
   * Stop ambient recording and upload final evidence to Cloudinary
   */
  static async stopAndUpload(
    alertId?: string | number | null,
  ): Promise<string | null> {
    const targetAlert = alertId || currentPipelineAlertId;
    this.cleanupPipeline();

    if (!isRecording) return null;

    try {
      isRecording = false;
      const uri = await Sound.stopRecorder();
      if (!uri) return null;

      if (targetAlert) {
        return await this.uploadAndAttachChunk(targetAlert, uri, 100);
      }
      return null;
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
    this.cleanupPipeline();
    if (!isRecording) return;
    try {
      isRecording = false;
      await Sound.stopRecorder();
    } catch {
      // Ignore
    }
  }

  /**
   * Clean up timers, state, and storage references
   */
  private static cleanupPipeline(): void {
    if (pipelineIntervalTimer) {
      clearTimeout(pipelineIntervalTimer);
      pipelineIntervalTimer = null;
    }
    if (appStateSubscription) {
      appStateSubscription.remove();
      appStateSubscription = null;
    }
    currentPipelineAlertId = null;
    AsyncStorage.removeItem(PENDING_SOS_AUDIO_KEY).catch(() => {});
  }

  /**
   * Cold start watchdog: Recovers any unfinished audio upload if device rebooted mid-SOS
   */
  static async recoverPendingEvidence(): Promise<void> {
    try {
      const raw = await AsyncStorage.getItem(PENDING_SOS_AUDIO_KEY);
      if (!raw) return;

      const record = JSON.parse(raw);
      if (record && record.alertId) {
        console.log(
          '[AudioRecorder] Cold boot recovery: checking pending audio for alert:',
          record.alertId,
        );
        // Clean up pending key once inspected
        await AsyncStorage.removeItem(PENDING_SOS_AUDIO_KEY);
      }
    } catch {
      // Ignore recovery error
    }
  }

  static isCurrentlyRecording(): boolean {
    return isRecording;
  }
}
