import { v2 as cloudinary } from "cloudinary";
// @ts-ignore - multer untyped module declaration fallback
import multer from "multer";
import { AppError } from "../errors/AppError";

// Configure Cloudinary strictly from environment variables
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
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
}
