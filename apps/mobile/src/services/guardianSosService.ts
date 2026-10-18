import {
  NativeModules,
  Platform,
  DeviceEventEmitter,
  Vibration,
} from 'react-native';
import { Sound } from 'react-native-nitro-sound';
import {
  onSosAlert,
  onSosLiveAudioChunk,
  onSosAudio,
  joinSosAlertRoom,
  leaveSosAlertRoom,
} from './socketService';

const { SafeWalkService } = NativeModules;

export interface GuardianLiveAudioChunk {
  alertId: string | number;
  seq: number;
  totalChunksExpected?: number;
  durationSec?: number;
  mimeType?: string;
  data: string; // Base64 audio/wav
  isLast: boolean;
  timestamp: string;
}

export interface GuardianSosEmergency {
  alertId: string | number;
  userId: string | number;
  userName?: string;
  userPhone?: string;
  latitude: number;
  longitude: number;
  batteryPercentage?: number;
  audioUrl?: string | null;
  isTest?: boolean;
  source?: string;
  timestamp: string;
}

export interface GuardianSosState {
  activeEmergency: GuardianSosEmergency | null;
  chunks: GuardianLiveAudioChunk[];
  currentPlayingSeq: number | null;
  isStreaming: boolean;
  isMuted: boolean;
  isMasterPlaying: boolean;
  masterPlaybackSeconds: number;
}

type StateListener = (state: GuardianSosState) => void;

class GuardianSosService {
  private state: GuardianSosState = {
    activeEmergency: null,
    chunks: [],
    currentPlayingSeq: null,
    isStreaming: false,
    isMuted: false,
    isMasterPlaying: false,
    masterPlaybackSeconds: 0,
  };

  private listeners = new Set<StateListener>();
  private unsubscribers: (() => void)[] = [];
  private chunkSubscription: any = null;
  private masterTimer: any = null;
  private isInitialized = false;

  public initialize(): void {
    if (this.isInitialized) return;
    this.isInitialized = true;

    // 1. Listen for new incoming SOS emergency alerts
    const unsubAlert = onSosAlert((data: any) => {
      console.log(
        '[GuardianSosService] Emergency SOS alert received for alertId:',
        data?.id || data?.alertId,
      );
      this.handleIncomingAlert(data);
    });
    this.unsubscribers.push(unsubAlert);

    // 2. Listen for progressive 5-second ambient audio slices
    const unsubChunk = onSosLiveAudioChunk((chunk: GuardianLiveAudioChunk) => {
      console.log(
        `[GuardianSosService] LIVE AUDIO CHUNK #${chunk.seq} received for alert ${chunk.alertId}`,
      );
      this.handleIncomingChunk(chunk);
    });
    this.unsubscribers.push(unsubChunk);

    // 3. Listen for final 30s master/stitched audio attachment
    const unsubAudio = onSosAudio(
      (data: { alertId: string | number; audioUrl: string }) => {
        console.log(
          '[GuardianSosService] Master audio attached to SOS alertId:',
          data?.alertId,
        );
        this.handleMasterAudioAttached(data);
      },
    );
    this.unsubscribers.push(unsubAudio);

    // 4. Native event listener when a chunk finishes playing on Android hardware
    if (Platform.OS === 'android') {
      this.chunkSubscription = DeviceEventEmitter.addListener(
        'onLiveAudioChunkFinished',
        (event: { seq: number }) => {
          this.handleChunkFinished(event.seq);
        },
      );
    }
  }

  public getState(): GuardianSosState {
    return this.state;
  }

  public subscribe(listener: StateListener): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    this.listeners.forEach(listener => {
      try {
        listener(this.state);
      } catch (err) {
        console.warn('[GuardianSosService] Error in state listener:', err);
      }
    });
  }

  private handleIncomingAlert(data: any): void {
    if (!data || !data.alertId) return;

    const emergency: GuardianSosEmergency = {
      alertId: data.alertId,
      userId: data.userId,
      userName: data.userName || 'Companion in Distress',
      userPhone: data.userPhone,
      latitude: Number(data.latitude) || 0,
      longitude: Number(data.longitude) || 0,
      batteryPercentage: data.batteryPercentage,
      audioUrl: data.audioUrl || null,
      isTest: Boolean(data.isTest),
      source: data.source,
      timestamp: data.timestamp || new Date().toISOString(),
    };

    // Vibrate device urgently (SOS rhythm: 3 short, 3 long, 3 short)
    try {
      Vibration.vibrate(
        [
          0, 200, 100, 200, 100, 200, 300, 600, 200, 600, 200, 600, 300, 200,
          100, 200,
        ],
        false,
      );
    } catch {}

    // Ensure guardian joins the alert-scoped socket room for progressive live streaming
    joinSosAlertRoom(data.alertId);

    this.state = {
      ...this.state,
      activeEmergency: emergency,
      chunks: [],
      currentPlayingSeq: null,
      isStreaming: !emergency.audioUrl,
      isMasterPlaying: false,
      masterPlaybackSeconds: 0,
    };
    this.notify();
  }

  private handleIncomingChunk(chunk: GuardianLiveAudioChunk): void {
    if (!chunk || !chunk.alertId) return;

    // If no active emergency or different alert, bind to this emergency
    if (
      !this.state.activeEmergency ||
      String(this.state.activeEmergency.alertId) !== String(chunk.alertId)
    ) {
      this.state.activeEmergency = {
        alertId: chunk.alertId,
        userId: 0,
        userName: 'Companion in Distress',
        latitude: 0,
        longitude: 0,
        audioUrl: null,
        timestamp: chunk.timestamp || new Date().toISOString(),
      };
      joinSosAlertRoom(chunk.alertId);
    }

    const exists = this.state.chunks.some(c => c.seq === chunk.seq);
    if (!exists) {
      const updatedChunks = [...this.state.chunks, chunk].sort(
        (a, b) => a.seq - b.seq,
      );
      this.state = {
        ...this.state,
        chunks: updatedChunks,
        isStreaming: !this.state.activeEmergency.audioUrl,
      };
      this.notify();
    }

    // Auto-play progressive live audio if unmuted
    if (!this.state.isMuted && !this.state.activeEmergency.audioUrl) {
      if (this.state.currentPlayingSeq === null) {
        this.playChunk(chunk);
      }
    }
  }

  private async playChunk(chunk: GuardianLiveAudioChunk): Promise<void> {
    if (!chunk?.data || this.state.isMuted) return;

    this.state = { ...this.state, currentPlayingSeq: chunk.seq };
    this.notify();

    try {
      if (Platform.OS === 'android' && SafeWalkService?.playLiveAudioChunk) {
        await SafeWalkService.playLiveAudioChunk(chunk.data, chunk.seq);
      }
    } catch (err) {
      console.warn(
        `[GuardianSosService] Failed to play live audio chunk #${chunk.seq}:`,
        err,
      );
      // Advance to next after 4.5s fallback
      setTimeout(() => {
        this.handleChunkFinished(chunk.seq);
      }, 4500);
    }
  }

  private handleChunkFinished(seq: number): void {
    if (this.state.currentPlayingSeq !== seq) return;

    // Check if next consecutive chunk exists in buffer
    const nextSeq = seq + 1;
    const nextChunk = this.state.chunks.find(c => c.seq === nextSeq);

    if (
      nextChunk &&
      !this.state.isMuted &&
      !this.state.activeEmergency?.audioUrl
    ) {
      this.playChunk(nextChunk);
    } else {
      this.state = { ...this.state, currentPlayingSeq: null };
      this.notify();
    }
  }

  private handleMasterAudioAttached(data: {
    alertId: string | number;
    audioUrl: string;
  }): void {
    if (
      this.state.activeEmergency &&
      String(this.state.activeEmergency.alertId) === String(data.alertId)
    ) {
      // Stop live chunk player once master is available
      this.stopLiveAudio();

      this.state = {
        ...this.state,
        activeEmergency: {
          ...this.state.activeEmergency,
          audioUrl: data.audioUrl,
        },
        isStreaming: false,
        currentPlayingSeq: null,
      };
      this.notify();
    }
  }

  public async toggleMute(): Promise<void> {
    const nextMuted = !this.state.isMuted;
    this.state = { ...this.state, isMuted: nextMuted };

    if (nextMuted) {
      await this.stopLiveAudio();
      await this.stopMasterAudio();
    } else {
      // Resume playback of latest or unplayed chunk
      if (
        this.state.chunks.length > 0 &&
        !this.state.activeEmergency?.audioUrl
      ) {
        const latest = this.state.chunks[this.state.chunks.length - 1];
        this.playChunk(latest);
      }
    }
    this.notify();
  }

  public async stopLiveAudio(): Promise<void> {
    try {
      if (Platform.OS === 'android' && SafeWalkService?.stopLiveAudio) {
        await SafeWalkService.stopLiveAudio();
      }
    } catch {}
    this.state = { ...this.state, currentPlayingSeq: null };
    this.notify();
  }

  public async playMasterAudio(): Promise<void> {
    const audioUrl = this.state.activeEmergency?.audioUrl;
    if (!audioUrl) return;

    await this.stopLiveAudio();
    clearInterval(this.masterTimer);

    try {
      await Sound.startPlayer(audioUrl);
      this.state = {
        ...this.state,
        isMasterPlaying: true,
        masterPlaybackSeconds: 0,
      };
      this.notify();

      this.masterTimer = setInterval(() => {
        if (this.state.masterPlaybackSeconds >= 30) {
          this.stopMasterAudio();
        } else {
          this.state = {
            ...this.state,
            masterPlaybackSeconds: this.state.masterPlaybackSeconds + 1,
          };
          this.notify();
        }
      }, 1000);
    } catch (err) {
      console.warn(
        '[GuardianSosService] Failed to play master audio with native player:',
        err,
      );
    }
  }

  public async stopMasterAudio(): Promise<void> {
    clearInterval(this.masterTimer);
    try {
      await Sound.stopPlayer();
    } catch {}
    this.state = {
      ...this.state,
      isMasterPlaying: false,
      masterPlaybackSeconds: 0,
    };
    this.notify();
  }

  public dismissEmergency(): void {
    if (this.state.activeEmergency) {
      leaveSosAlertRoom(this.state.activeEmergency.alertId);
    }
    this.stopLiveAudio();
    this.stopMasterAudio();

    this.state = {
      activeEmergency: null,
      chunks: [],
      currentPlayingSeq: null,
      isStreaming: false,
      isMuted: false,
      isMasterPlaying: false,
      masterPlaybackSeconds: 0,
    };
    this.notify();
  }

  public cleanup(): void {
    this.dismissEmergency();
    this.unsubscribers.forEach(u => u());
    this.unsubscribers = [];
    if (this.chunkSubscription) {
      this.chunkSubscription.remove();
      this.chunkSubscription = null;
    }
    this.isInitialized = false;
  }
}

export const guardianSosService = new GuardianSosService();
