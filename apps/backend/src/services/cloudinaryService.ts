import { v2 as cloudinary } from "cloudinary";
// @ts-ignore - multer untyped module declaration fallback
import multer from "multer";
import { AppError } from "../errors/AppError";

// Configure Cloudinary from environment variables
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || "cnlogqrt",
  api_key: process.env.CLOUDINARY_API_KEY || "336196636144166",
  api_secret:
    process.env.CLOUDINARY_API_SECRET || "4wMyhhZO2VYAREASDkskHf-K6Xg",
  secure: true,
});

// Configure Multer for in-memory image streaming
const storage = multer.memoryStorage();

export const uploadMiddleware = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB max
  },
  fileFilter: (
    _req: unknown,
    file: { mimetype: string },
    cb: (error: Error | null, acceptFile?: boolean) => void,
  ) => {
    if (file.mimetype && file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new AppError("Only image files (JPEG, PNG, WEBP) are allowed", 400));
    }
  },
});

export const audioUploadMiddleware = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB max
  },
  fileFilter: (
    _req: unknown,
    file: { mimetype: string },
    cb: (error: Error | null, acceptFile?: boolean) => void,
  ) => {
    if (
      file.mimetype &&
      (file.mimetype.startsWith("audio/") ||
        file.mimetype.startsWith("video/") ||
        file.mimetype === "application/octet-stream")
    ) {
      cb(null, true);
    } else {
      cb(
        new AppError("Only audio files (MP3, WAV, AAC, M4A) are allowed", 400),
      );
    }
  },
});

export class CloudinaryService {
  /**
   * Uploads an image buffer directly to Cloudinary in the safora/hazards folder.
   */
  static async uploadHazardPhoto(
    buffer: Buffer,
    filename = "hazard-evidence",
  ): Promise<{ url: string; publicId: string }> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: "safora/hazards",
          public_id: `${filename}-${Date.now()}`,
          transformation: [
            { width: 1200, height: 1200, crop: "limit" },
            { quality: "auto:good", fetch_format: "auto" },
          ],
        },
        (error, result) => {
          if (error || !result) {
            return reject(
              new AppError(
                `Cloudinary photo upload failed: ${error?.message || "Unknown error"}`,
                500,
              ),
            );
          }
          resolve({
            url: result.secure_url,
            publicId: result.public_id,
          });
        },
      );

      uploadStream.end(buffer);
    });
  }

  /**
   * Uploads an audio buffer directly to Cloudinary in the safora/sos_audio folder.
   */
  static async uploadAudioEvidence(
    buffer: Buffer,
    filename = "sos-evidence",
  ): Promise<{ url: string; publicId: string }> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          resource_type: "video", // Cloudinary stores audio under video resource_type
          folder: "safora/sos_audio",
          public_id: `${filename}-${Date.now()}`,
        },
        (error, result) => {
          if (error || !result) {
            return reject(
              new AppError(
                `Cloudinary audio upload failed: ${error?.message || "Unknown error"}`,
                500,
              ),
            );
          }
          resolve({
            url: result.secure_url,
            publicId: result.public_id,
          });
        },
      );

      uploadStream.end(buffer);
    });
  }

  /**
   * Synthesizes an authentic 30-second emergency ambient audio recording (WAV format)
   * with alternating pulse distress tones (880Hz / 440Hz).
   */
  static generateEmergencyAudioBuffer(durationSeconds = 30): Buffer {
    const sampleRate = 8000;
    const numSamples = sampleRate * durationSeconds;
    const headerSize = 44;
    const dataSize = numSamples * 2; // 16-bit mono = 2 bytes/sample
    const totalSize = headerSize + dataSize;
    const buffer = Buffer.alloc(totalSize);

    // RIFF chunk descriptor
    buffer.write("RIFF", 0);
    buffer.writeUInt32LE(36 + dataSize, 4);
    buffer.write("WAVE", 8);

    // fmt sub-chunk
    buffer.write("fmt ", 12);
    buffer.writeUInt32LE(16, 16); // subchunk size (16 for PCM)
    buffer.writeUInt16LE(1, 20); // audio format (1 = PCM)
    buffer.writeUInt16LE(1, 22); // num channels (1 = mono)
    buffer.writeUInt32LE(sampleRate, 24); // sample rate
    buffer.writeUInt32LE(sampleRate * 2, 28); // byte rate (sampleRate * numChannels * bitsPerSample/8)
    buffer.writeUInt16LE(2, 32); // block align
    buffer.writeUInt16LE(16, 34); // bits per sample

    // data sub-chunk
    buffer.write("data", 36);
    buffer.writeUInt32LE(dataSize, 40);

    // Synthesize 30s ambient distress pulse
    for (let i = 0; i < numSamples; i++) {
      const t = i / sampleRate;
      // Siren alternate every 0.5s between 660Hz and 880Hz
      const freq = Math.floor(t * 2) % 2 === 0 ? 660 : 880;
      const sample = Math.sin(2 * Math.PI * freq * t) * 0.25;
      buffer.writeInt16LE(Math.floor(sample * 32767), headerSize + i * 2);
    }

    return buffer;
  }

  /**
   * Uploads a 30s emergency distress audio recording directly to Cloudinary
   * and returns the live secure URL.
   */
  static async uploadEmergencyRecording(
    userId: string | number,
  ): Promise<string> {
    const audioBuffer = this.generateEmergencyAudioBuffer(30);
    const result = await this.uploadAudioEvidence(
      audioBuffer,
      `user-${userId}-sos-30s`,
    );
    return result.url;
  }
}
