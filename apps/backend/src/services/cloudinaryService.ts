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
}
