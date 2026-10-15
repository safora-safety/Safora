import fs from "fs";
import path from "path";
import os from "os";
import { CloudinaryService } from "./cloudinaryService";
import { SosRepository } from "../repositories/sosRepository";
import { broadcastSosAudio } from "../sockets/journeySocket";

export interface StagedAudioChunk {
  seq: number;
  data: Buffer;
  receivedAt: number;
}

interface AlertSession {
  alertId: string | number;
  userId: string | number;
  watchdogTimer: NodeJS.Timeout | null;
  chunks: Map<number, Buffer>;
  tempDir: string;
  isFinalized: boolean;
  sampleRate: number;
  channels: number;
  bitsPerSample: number;
}

const activeSessions = new Map<string, AlertSession>();
const BASE_TEMP_DIR = path.join(os.tmpdir(), "safora_sos_chunks");

/**
 * Creates a standard 44-byte RIFF/WAVE header for 16-bit PCM audio.
 */
export function createWavHeader(
  dataLength: number,
  sampleRate = 16000,
  numChannels = 1,
  bitsPerSample = 16,
): Buffer {
  const header = Buffer.alloc(44);
  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const totalLength = dataLength + 36;

  // RIFF Chunk Descriptor
  header.write("RIFF", 0);
  header.writeUInt32LE(totalLength, 4);
  header.write("WAVE", 8);

  // "fmt " Sub-chunk
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16); // Subchunk1Size for PCM
  header.writeUInt16LE(1, 20); // AudioFormat (1 = PCM)
  header.writeUInt16LE(numChannels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);

  // "data" Sub-chunk
  header.write("data", 36);
  header.writeUInt32LE(dataLength, 40);

  return header;
}

/**
 * Extracts raw PCM sample payload from a WAV buffer (skipping 44-byte header if present)
 */
export function extractPcmData(chunkBuffer: Buffer): Buffer {
  if (
    chunkBuffer.length >= 44 &&
    chunkBuffer.toString("ascii", 0, 4) === "RIFF" &&
    chunkBuffer.toString("ascii", 8, 12) === "WAVE"
  ) {
    return chunkBuffer.subarray(44);
  }
  return chunkBuffer;
}

export class AudioStitcherService {
  /**
   * Ingests an incoming audio chunk for an SOS alert, saves to disk staging,
   * and arms a 8-second watchdog timer in case the device disconnects mid-stream.
   */
  static async handleIncomingChunk(params: {
    alertId: string | number;
    userId: string | number;
    seq: number;
    dataBase64: string;
    isLast: boolean;
    sampleRate?: number;
  }): Promise<{ stagedCount: number; isFinalized: boolean }> {
    const alertKey = String(params.alertId);
    const sampleRate = params.sampleRate || 16000;
    const chunkBuffer = Buffer.from(params.dataBase64, "base64");

    let session = activeSessions.get(alertKey);
    if (!session) {
      const tempDir = path.join(BASE_TEMP_DIR, `alert_${alertKey}`);
      try {
        await fs.promises.mkdir(tempDir, { recursive: true });
      } catch (_: any) {}

      session = {
        alertId: params.alertId,
        userId: params.userId,
        watchdogTimer: null,
        chunks: new Map<number, Buffer>(),
        tempDir,
        isFinalized: false,
        sampleRate,
        channels: 1,
        bitsPerSample: 16,
      };
      activeSessions.set(alertKey, session);
    }

    // Save chunk in memory and persistent disk staging
    session.chunks.set(params.seq, chunkBuffer);
    try {
      const chunkFilePath = path.join(
        session.tempDir,
        `chunk_${String(params.seq).padStart(3, "0")}.wav`,
      );
      await fs.promises.writeFile(chunkFilePath, chunkBuffer);
    } catch (err) {
      console.warn(`[AudioStitcher] Failed to write chunk to disk:`, err);
    }

    // Reset watchdog timer
    if (session.watchdogTimer) {
      clearTimeout(session.watchdogTimer);
      session.watchdogTimer = null;
    }

    if (params.isLast) {
      // Mobile signaled natural end of 30s session
      console.log(
        `[AudioStitcher] Alert ${alertKey}: Final chunk #${params.seq} received. Assembling recording...`,
      );
      await this.finalizeAndUpload(alertKey);
      return { stagedCount: session.chunks.size, isFinalized: true };
    } else {
      // Arm watchdog: If phone dies/drops, auto-assemble received chunks after 8 seconds
      session.watchdogTimer = setTimeout(async () => {
        console.warn(
          `[AudioStitcher] Watchdog timeout for alert ${alertKey}: Device interrupted. Assembling ${session?.chunks.size || 0} partial chunks...`,
        );
        await AudioStitcherService.finalizeAndUpload(alertKey);
      }, 8000);

      return { stagedCount: session.chunks.size, isFinalized: false };
    }
  }

  /**
   * Stitches all staged chunks into a single unified WAV audio file,
   * uploads to Cloudinary, updates DB, and broadcasts final audio attachment.
   */
  static async finalizeAndUpload(
    alertId: string | number,
  ): Promise<string | null> {
    const alertKey = String(alertId);
    const session = activeSessions.get(alertKey);
    if (!session || session.isFinalized) {
      return null;
    }

    session.isFinalized = true;
    if (session.watchdogTimer) {
      clearTimeout(session.watchdogTimer);
      session.watchdogTimer = null;
    }

    try {
      if (session.chunks.size === 0) {
        this.cleanupSession(alertKey);
        return null;
      }

      // Sort chunks by sequential order (1, 2, 3...)
      const sortedSeqs = Array.from(session.chunks.keys()).sort(
        (a, b) => a - b,
      );
      const pcmPayloads: Buffer[] = [];
      let totalPcmLength = 0;

      for (const seq of sortedSeqs) {
        const rawChunk = session.chunks.get(seq);
        if (rawChunk) {
          const pcm = extractPcmData(rawChunk);
          pcmPayloads.push(pcm);
          totalPcmLength += pcm.length;
        }
      }

      if (totalPcmLength === 0) {
        this.cleanupSession(alertKey);
        return null;
      }

      // Prepend valid RIFF/WAVE header
      const header = createWavHeader(
        totalPcmLength,
        session.sampleRate,
        session.channels,
        session.bitsPerSample,
      );
      const fullWavBuffer = Buffer.concat([header, ...pcmPayloads]);

      console.log(
        `[AudioStitcher] Alert ${alertKey}: Stitched ${sortedSeqs.length} chunks into ${fullWavBuffer.length} bytes. Uploading to Cloudinary...`,
      );

      // Upload to Cloudinary
      const { url } = await CloudinaryService.uploadAudioEvidence(
        fullWavBuffer,
        `sos_${alertKey}_stitched`,
      );

      // Update Database (only if no master file has already been saved)
      try {
        await SosRepository.updateAudioUrl(
          session.alertId,
          session.userId,
          url,
        );
      } catch (dbErr) {
        console.warn(
          `[AudioStitcher] Database update warning for alert ${alertKey}:`,
          dbErr,
        );
      }

      // Broadcast verified audio URL to Admin and Guardians
      broadcastSosAudio({
        alertId: session.alertId,
        userId: session.userId,
        audioUrl: url,
      });

      console.log(
        `[AudioStitcher] Alert ${alertKey}: Audio successfully preserved & broadcast: ${url}`,
      );

      this.cleanupSession(alertKey);
      return url;
    } catch (err) {
      console.error(
        `[AudioStitcher] Error finalizing audio for alert ${alertKey}:`,
        err,
      );
      this.cleanupSession(alertKey);
      return null;
    }
  }

  /**
   * If mobile successfully uploads its own master 30s file, cancel server watchdog and cleanup.
   */
  static handleMasterUploaded(alertId: string | number): void {
    const alertKey = String(alertId);
    const session = activeSessions.get(alertKey);
    if (session) {
      if (session.watchdogTimer) {
        clearTimeout(session.watchdogTimer);
        session.watchdogTimer = null;
      }
      this.cleanupSession(alertKey);
    }
  }

  private static cleanupSession(alertKey: string): void {
    const session = activeSessions.get(alertKey);
    if (session) {
      activeSessions.delete(alertKey);
      try {
        fs.rm(session.tempDir, { recursive: true, force: true }, () => {});
      } catch (_: any) {}
    }
  }
}
