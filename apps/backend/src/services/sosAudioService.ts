import { AppError } from "../errors/AppError";
import { SosRepository } from "../repositories/sosRepository";
import { broadcastSosLiveAudioChunk } from "../sockets/journeySocket";
import { AudioStitcherService } from "./audioStitcherService";

export interface ProcessAudioChunkInput {
  alertId: string | number;
  userId: string | number;
  userRole?: string;
  seq: number;
  totalChunksExpected?: number;
  durationSec?: number;
  mimeType?: string;
  data: string;
  isLast: boolean;
  sampleRate?: number;
}

export async function processSosAudioChunk(
  data: ProcessAudioChunkInput,
): Promise<{ success: boolean; seq: number; alertId: string | number }> {
  const alertIdNum = Number(data.alertId);
  if (isNaN(alertIdNum)) {
    throw new AppError("Invalid alert ID", 400);
  }

  let alert = await SosRepository.findById(alertIdNum);
  if (!alert) {
    // Rapid DB commit grace retry (protects against sub-second timing differences between HTTP SOS creation and first chunk)
    for (let i = 0; i < 4 && !alert; i++) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      alert = await SosRepository.findById(alertIdNum);
    }
  }

  if (!alert) {
    throw new AppError("SOS alert not found", 404);
  }

  const isOwner =
    String(alert.user_id) === String(data.userId) ||
    Number(alert.user_id) === Number(data.userId);
  const isStaff = data.userRole === "admin" || data.userRole === "moderator";

  if (!isOwner && !isStaff) {
    throw new AppError(
      "Forbidden: Cannot stream audio for unowned SOS alert",
      403,
    );
  }

  console.log(
    `[AudioStream] Ingested live audio slice #${data.seq} for alert ${data.alertId} (${data.durationSec || 5}s, isLast=${Boolean(data.isLast)})`,
  );

  const guardianUserIds = await SosRepository.findGuardianUserIds(
    alert.user_id,
  );

  // 1. Instantly forward live audio slice to alert room, staff, and guardians
  broadcastSosLiveAudioChunk({
    alertId: data.alertId,
    seq: data.seq,
    totalChunksExpected: data.totalChunksExpected,
    durationSec: data.durationSec,
    mimeType: data.mimeType,
    data: data.data,
    isLast: data.isLast,
    guardianUserIds,
  });

  // 2. Disk staging & server watchdog management (auto-stitch fallback if client dies)
  AudioStitcherService.handleIncomingChunk({
    alertId: data.alertId,
    userId: data.userId,
    seq: data.seq,
    dataBase64: data.data,
    isLast: Boolean(data.isLast),
    sampleRate: data.sampleRate,
  }).catch((err) => {
    console.warn(
      `[AudioStream] Error staging audio chunk for alert ${data.alertId}:`,
      err,
    );
  });

  return {
    success: true,
    seq: data.seq,
    alertId: data.alertId,
  };
}
