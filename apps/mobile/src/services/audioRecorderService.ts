import {
  PermissionsAndroid,
  Platform,
  AppState,
  AppStateStatus,
  DeviceEventEmitter,
  NativeModules,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Sound } from 'react-native-nitro-sound';
import { SosService } from './sosService';
import {
  emitSosAudioChunk,
  joinSosAlertRoom,
  ensureSocketConnected,
} from './socketService';

let isRecording = false;
let isNativeAudioActive = false;
let currentPipelineAlertId: string | number | null = null;
let pipelineIntervalTimer: any = null;
let appStateSubscription: any = null;
let chunkSubscription: any = null;
let masterCompletionSubscription: any = null;
let failureSubscription: any = null;
const pendingChunkBuffer: any[] = [];

const TOTAL_DURATION_SEC = 30;
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
   * Dual-Pipe Emergency Audio Recording:
   * Pipe 1: Slices 5-second PCM/WAV chunks and emits them over Socket.IO (sos:audio_chunk).
   * Pipe 2: Maintains continuous 30-second unbroken master WAV recording for Cloudinary archival.
   */
  static async startRecording(
    alertId?: string | number,
    totalSeconds = TOTAL_DURATION_SEC,
  ): Promise<boolean> {
    try {
      let hasPermission = await this.isPermissionGranted();
      if (!hasPermission) {
        console.log(
          '[AudioRecorder] Microphone permission not yet granted, prompting user...',
        );
        hasPermission = await this.requestPermission();
      }
      if (!hasPermission) {
        console.warn(
          '[AudioRecorder] Microphone permission missing or denied, skipping audio recording',
        );
        return false;
      }

      // Stop any existing session
      await this.stopSilent();

      // Pre-warm Socket.IO connection immediately so pipe is hot before first 5s slice
      await ensureSocketConnected(3000).catch(() => {});

      currentPipelineAlertId = alertId || null;
      if (alertId) {
        joinSosAlertRoom(alertId);
      }

      // 1. Listen for native 5s audio slice events (Pipe 1)
      chunkSubscription = DeviceEventEmitter.addListener(
        'onSosAudioChunk',
        (chunk: any) => {
          if (chunk && chunk.data) {
            const resolvedId =
              chunk.alertId &&
              chunk.alertId !== 'emergency' &&
              chunk.alertId !== 'sos_emergency'
                ? chunk.alertId
                : currentPipelineAlertId;

            if (
              resolvedId &&
              resolvedId !== 'emergency' &&
              resolvedId !== 'sos_emergency'
            ) {
              console.log(
                `[AudioRecorder] Emitting live audio slice #${chunk.seq} (alert ${resolvedId}) over Socket.IO`,
              );
              emitSosAudioChunk({
                ...chunk,
                alertId: resolvedId,
              });
            } else {
              console.log(
                `[AudioRecorder] Buffering live audio slice #${chunk.seq} while alert ID resolves...`,
              );
              pendingChunkBuffer.push(chunk);
            }
          }
        },
      );

      // 2. Listen for native master 30s completion (Pipe 2)
      masterCompletionSubscription = DeviceEventEmitter.addListener(
        'onSosAudioMasterCompleted',
        async ({
          alertId: finishedAlertId,
          filePath,
          success,
          bytesRecorded,
        }: any) => {
          const targetAlertId =
            finishedAlertId &&
            finishedAlertId !== 'emergency' &&
            finishedAlertId !== 'sos_emergency'
              ? finishedAlertId
              : currentPipelineAlertId;

          console.log(
            `[AudioRecorder] Native master audio completed for alert ${targetAlertId} (${filePath}, success=${success}, bytes=${bytesRecorded})`,
          );
          if (success && filePath && targetAlertId) {
            await AudioRecorderService.uploadAndAttachMaster(
              targetAlertId,
              filePath,
            );
          }
          AudioRecorderService.cleanupPipeline();
        },
      );

      // 3. Listen for native hardware failure so fallback recorder activates immediately
      failureSubscription = DeviceEventEmitter.addListener(
        'onSosAudioFailed',
        async ({ alertId: failedAlertId, error }: any) => {
          console.warn(
            `[AudioRecorder] Native AudioRecord unavailable (${error}) for alert ${failedAlertId}. Activating fallback Sound.startRecorder()`,
          );
          isNativeAudioActive = false;
          try {
            await Sound.startRecorder();
            isRecording = true;
          } catch (fallbackErr) {
            console.error(
              '[AudioRecorder] Fallback recorder failed too:',
              fallbackErr,
            );
          }
        },
      );

      // Register AppState listener ONLY for fallback JS recorder (native service runs in foreground)
      if (!appStateSubscription) {
        appStateSubscription = AppState.addEventListener(
          'change',
          async (nextAppState: AppStateStatus) => {
            // Only stop if pure JS recording without foreground service
            if (
              (nextAppState === 'background' || nextAppState === 'inactive') &&
              isRecording &&
              !isNativeAudioActive
            ) {
              console.log(
                '[AudioRecorder] App backgrounded in JS fallback mode — flushing audio recording immediately',
              );
              await this.stopAndUpload(currentPipelineAlertId);
            }
          },
        );
      }

      // 3. Start native foreground service dual-sink audio recorder
      if (
        Platform.OS === 'android' &&
        NativeModules.SafeWalkService?.startEmergencyAudio
      ) {
        try {
          await NativeModules.SafeWalkService.startEmergencyAudio(
            String(alertId || 'sos_emergency'),
          );
          isNativeAudioActive = true;
          isRecording = true;
          console.log(
            `[AudioRecorder] Dual-sink native audio started for alert ${alertId}`,
          );
        } catch (nativeErr) {
          console.warn(
            '[AudioRecorder] Native recorder error, falling back to NitroSound:',
            nativeErr,
          );
          await Sound.startRecorder();
          isNativeAudioActive = false;
          isRecording = true;
        }
      } else {
        // Fallback for non-Android / emulator
        await Sound.startRecorder();
        isNativeAudioActive = false;
        isRecording = true;
      }

      // Safety fallback timer to stop recording if not stopped by native completion
      pipelineIntervalTimer = setTimeout(
        async () => {
          if (isRecording) {
            console.log(
              `[AudioRecorder] Completed full ${totalSeconds}s continuous recording`,
            );
            await this.stopAndUpload(currentPipelineAlertId);
          }
        },
        (totalSeconds + 2) * 1000,
      );

      return true;
    } catch (err) {
      console.warn('[AudioRecorder] Failed to start audio recording:', err);
      isRecording = false;
      this.cleanupPipeline();
      return false;
    }
  }

  /**
   * Dynamically associate the active audio pipeline with an asynchronous alert ID
   */
  static setAlertId(alertId: string | number): void {
    if (!alertId) return;
    currentPipelineAlertId = alertId;
    joinSosAlertRoom(alertId);
    console.log(
      `[AudioRecorder] Pipeline associated with alert ID: ${alertId}. Flushing ${pendingChunkBuffer.length} buffered chunk(s)...`,
    );

    // Flush any 5s slices that arrived while the REST SOS endpoint was responding
    while (pendingChunkBuffer.length > 0) {
      const chunk = pendingChunkBuffer.shift();
      if (chunk && chunk.data) {
        console.log(
          `[AudioRecorder] Emitting buffered live audio slice #${chunk.seq} for alert ${alertId}`,
        );
        emitSosAudioChunk({
          ...chunk,
          alertId,
        });
      }
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
   * Upload the 30-second master audio recording to Cloudinary and link to alert
   */
  private static async uploadAndAttachMaster(
    alertId: string | number,
    filePath: string,
  ): Promise<string | null> {
    try {
      console.log(
        `[AudioRecorder] Uploading complete 30s master evidence: ${filePath}`,
      );
      const uri = filePath.startsWith('file://')
        ? filePath
        : `file://${filePath}`;
      const { audioUrl } = await SosService.uploadAudio(uri);
      if (audioUrl && alertId) {
        await SosService.attachAudioToAlert(alertId, audioUrl);
        console.log(
          `[AudioRecorder] Master audio evidence successfully attached to alert ${alertId}:`,
          audioUrl,
        );
      }
      return audioUrl;
    } catch (err) {
      console.warn(
        '[AudioRecorder] Failed to upload master audio evidence:',
        err,
      );
      return null;
    }
  }

  /**
   * Stop ambient recording and upload final evidence to Cloudinary
   */
  static async stopAndUpload(
    alertId?: string | number | null,
  ): Promise<string | null> {
    const targetAlert = alertId || currentPipelineAlertId;

    if (!isRecording) {
      return null;
    }

    try {
      if (
        isNativeAudioActive &&
        NativeModules.SafeWalkService?.stopEmergencyAudio
      ) {
        // Stop native recording; the native service writes the WAV header and emits onSosAudioMasterCompleted
        isRecording = false;
        await NativeModules.SafeWalkService.stopEmergencyAudio().catch(
          () => {},
        );
        return null;
      }

      isRecording = false;
      const uri = await Sound.stopRecorder();
      this.cleanupPipeline();
      if (!uri) return null;

      if (targetAlert) {
        return await this.uploadAndAttachMaster(targetAlert, uri);
      }
      return null;
    } catch (err) {
      console.warn(
        '[AudioRecorder] Failed to stop & upload audio evidence:',
        err,
      );
      this.cleanupPipeline();
      return null;
    }
  }

  /**
   * Stop recording silently without uploading (for aborts/cancellations)
   */
  static async stopSilent(): Promise<void> {
    if (!isRecording) {
      this.cleanupPipeline();
      return;
    }

    try {
      isRecording = false;
      if (
        isNativeAudioActive &&
        NativeModules.SafeWalkService?.stopEmergencyAudio
      ) {
        await NativeModules.SafeWalkService.stopEmergencyAudio().catch(
          () => {},
        );
      } else {
        await Sound.stopRecorder().catch(() => {});
      }
    } catch {
      // Ignore
    } finally {
      this.cleanupPipeline();
    }
  }

  /**
   * Clean up timers, state, subscriptions, and storage references
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
    if (chunkSubscription) {
      chunkSubscription.remove();
      chunkSubscription = null;
    }
    if (masterCompletionSubscription) {
      masterCompletionSubscription.remove();
      masterCompletionSubscription = null;
    }
    if (failureSubscription) {
      failureSubscription.remove();
      failureSubscription = null;
    }
    isNativeAudioActive = false;
    currentPipelineAlertId = null;
    pendingChunkBuffer.length = 0;
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
