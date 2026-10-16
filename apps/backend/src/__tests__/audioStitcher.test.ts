import {
  describe,
  it,
  expect,
  jest,
  beforeEach,
  afterEach,
} from "@jest/globals";
import {
  AudioStitcherService,
  createWavHeader,
  extractPcmData,
} from "../services/audioStitcherService";
import { CloudinaryService } from "../services/cloudinaryService";
import { SosRepository } from "../repositories/sosRepository";
import * as journeySocket from "../sockets/journeySocket";

describe("AudioStitcherService & Dual-Pipe Audio Concatenation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.spyOn(SosRepository, "findById").mockResolvedValue(null);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe("createWavHeader", () => {
    it("should generate a valid 44-byte RIFF/WAVE header with correct offsets", () => {
      const pcmDataLength = 16000 * 2 * 5; // 5s of 16kHz 16-bit mono = 160,000 bytes
      const header = createWavHeader(pcmDataLength, 16000, 1, 16);

      expect(header.length).toBe(44);
      expect(header.toString("ascii", 0, 4)).toBe("RIFF");
      expect(header.readUInt32LE(4)).toBe(pcmDataLength + 36);
      expect(header.toString("ascii", 8, 12)).toBe("WAVE");
      expect(header.toString("ascii", 12, 16)).toBe("fmt ");
      expect(header.readUInt32LE(16)).toBe(16); // Subchunk1Size for PCM
      expect(header.readUInt16LE(20)).toBe(1); // AudioFormat: PCM
      expect(header.readUInt16LE(22)).toBe(1); // NumChannels: mono
      expect(header.readUInt32LE(24)).toBe(16000); // SampleRate
      expect(header.readUInt32LE(28)).toBe(32000); // ByteRate = 16000 * 1 * 2
      expect(header.readUInt16LE(32)).toBe(2); // BlockAlign = 1 * 2
      expect(header.readUInt16LE(34)).toBe(16); // BitsPerSample
      expect(header.toString("ascii", 36, 40)).toBe("data");
      expect(header.readUInt32LE(40)).toBe(pcmDataLength);
    });
  });

  describe("extractPcmData", () => {
    it("should strip 44-byte WAV header if input contains RIFF header", () => {
      const dummyPcm = Buffer.from([0x01, 0x02, 0x03, 0x04]);
      const header = createWavHeader(dummyPcm.length, 16000, 1, 16);
      const fullWav = Buffer.concat([header, dummyPcm]);

      const extracted = extractPcmData(fullWav);
      expect(extracted).toEqual(dummyPcm);
    });

    it("should return raw buffer unchanged if no RIFF header exists", () => {
      const rawPcm = Buffer.from([0x10, 0x20, 0x30, 0x40]);
      const extracted = extractPcmData(rawPcm);
      expect(extracted).toEqual(rawPcm);
    });
  });

  describe("handleIncomingChunk & Finalization", () => {
    it("should stage chunks and finalize on isLast: true", async () => {
      const uploadSpy = jest
        .spyOn(CloudinaryService, "uploadAudioEvidence")
        .mockResolvedValueOnce({
          url: "https://cloudinary.com/test_stitched_audio.wav",
          publicId: "test_stitched",
        });

      const updateAudioSpy = jest
        .spyOn(SosRepository, "updateAudioUrl")
        .mockResolvedValueOnce({} as any);

      const broadcastSpy = jest
        .spyOn(journeySocket, "broadcastSosAudio")
        .mockImplementation(() => {});

      const samplePcm1 = Buffer.alloc(100, 0x11);
      const samplePcm2 = Buffer.alloc(100, 0x22);
      const wav1 = Buffer.concat([createWavHeader(100), samplePcm1]);
      const wav2 = Buffer.concat([createWavHeader(100), samplePcm2]);

      // Chunk 1 (isLast: false)
      const res1 = await AudioStitcherService.handleIncomingChunk({
        alertId: 999,
        userId: 42,
        seq: 1,
        dataBase64: wav1.toString("base64"),
        isLast: false,
      });
      expect(res1.stagedCount).toBe(1);
      expect(res1.isFinalized).toBe(false);

      // Chunk 2 (isLast: true)
      const res2 = await AudioStitcherService.handleIncomingChunk({
        alertId: 999,
        userId: 42,
        seq: 2,
        dataBase64: wav2.toString("base64"),
        isLast: true,
      });
      expect(res2.isFinalized).toBe(true);
      expect(uploadSpy).toHaveBeenCalledTimes(1);

      // Verify stitched buffer has 44 byte header + 200 bytes total PCM
      const [uploadedBuffer] = uploadSpy.mock.calls[0];
      expect(Buffer.isBuffer(uploadedBuffer)).toBe(true);
      expect((uploadedBuffer as Buffer).length).toBe(44 + 200);

      // Verify database update & socket broadcast
      expect(updateAudioSpy).toHaveBeenCalledWith(
        999,
        42,
        "https://cloudinary.com/test_stitched_audio.wav",
      );
      expect(broadcastSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          alertId: 999,
          userId: 42,
          audioUrl: "https://cloudinary.com/test_stitched_audio.wav",
        }),
      );
    });

    it("should trigger watchdog timer and auto-assemble if device disconnects mid-stream", async () => {
      const uploadSpy = jest
        .spyOn(CloudinaryService, "uploadAudioEvidence")
        .mockResolvedValueOnce({
          url: "https://cloudinary.com/watchdog_stitched.wav",
          publicId: "watchdog_stitched",
        });

      jest
        .spyOn(SosRepository, "updateAudioUrl")
        .mockResolvedValueOnce({} as any);

      jest
        .spyOn(journeySocket, "broadcastSosAudio")
        .mockImplementation(() => {});

      const samplePcm = Buffer.alloc(80, 0x55);
      const wav = Buffer.concat([createWavHeader(80), samplePcm]);

      // Chunk 1 arrives, device dies before chunk 2
      await AudioStitcherService.handleIncomingChunk({
        alertId: 888,
        userId: 7,
        seq: 1,
        dataBase64: wav.toString("base64"),
        isLast: false,
      });

      expect(uploadSpy).not.toHaveBeenCalled();

      // Fast-forward past the 8-second watchdog timeout
      jest.advanceTimersByTime(8500);

      // Allow async promises triggered by timer to resolve
      await Promise.resolve();
      await Promise.resolve();

      expect(uploadSpy).toHaveBeenCalledTimes(1);
    });

    it("should cancel watchdog if mobile uploads master recording via handleMasterUploaded", async () => {
      const uploadSpy = jest.spyOn(CloudinaryService, "uploadAudioEvidence");

      const samplePcm = Buffer.alloc(80, 0x33);
      const wav = Buffer.concat([createWavHeader(80), samplePcm]);

      // Stage chunk 1
      await AudioStitcherService.handleIncomingChunk({
        alertId: 777,
        userId: 10,
        seq: 1,
        dataBase64: wav.toString("base64"),
        isLast: false,
      });

      // Mobile finishes 30s and uploads master directly
      AudioStitcherService.handleMasterUploaded(777);

      // Advance watchdog timer
      jest.advanceTimersByTime(10000);
      await Promise.resolve();

      // Watchdog should NOT have triggered upload
      expect(uploadSpy).not.toHaveBeenCalled();
    });
  });
});
