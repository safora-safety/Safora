import { z } from "zod";

export const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional(),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export const changePasswordSchema = z
  .object({
    oldPassword: z.string().optional(),
    old_password: z.string().optional(),
    newPassword: z.string().optional(),
    new_password: z.string().optional(),
  })
  .refine(
    (data) => {
      const current = data.oldPassword || data.old_password;
      const next = data.newPassword || data.new_password;
      return Boolean(current && next && next.length >= 8);
    },
    {
      message:
        "Both current password and new password (min 8 characters) are required",
    },
  );

export const updateProfileSchema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(100)
    .optional(),
  email: z.string().email("Invalid email address").optional(),
  phone: z.string().max(25).optional().nullable(),
  blood_group: z.string().max(10).optional().nullable(),
  emergency_notes: z.string().max(500).optional().nullable(),
  age: z.coerce.number().int().min(1).max(120).optional().nullable(),
  ageNoticeAck: z.boolean().optional(),
  age_notice_ack: z.boolean().optional(),
  termsAcceptedAt: z.string().optional(),
  terms_accepted_at: z.string().optional(),
});

export const createReportSchema = z.object({
  category: z.enum([
    "lighting",
    "road_hazard",
    "waterlogging",
    "isolated_area",
    "traffic",
    "other",
  ]),
  title: z.string().min(3, "Title must be at least 3 characters").max(200),
  description: z.string().max(1000).optional(),
  severity: z.coerce.number().int().min(1).max(5),
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  photo_url: z.string().url().optional().nullable(),
});

export const nearbyReportsQuerySchema = z.object({
  lat: z.coerce.number().min(-90).max(90).default(30.3165),
  lng: z.coerce.number().min(-180).max(180).default(78.0322),
  radius: z.coerce.number().positive().default(5000),
  limit: z.coerce.number().int().positive().max(200).default(50),
});

export const startJourneySchema = z.object({
  origin: z.object({
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
  }),
  destination: z.object({
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
  }),
  planned_route: z.array(z.tuple([z.number(), z.number()])).optional(),
  expected_duration_minutes: z.number().positive().default(30),
  trusted_contact_ids: z.array(z.number().or(z.string())).default([]),
});

export const updateLocationSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  speed: z.number().optional().nullable(),
  battery: z.number().optional().nullable(),
  heading: z.number().optional(),
});

const getExpectedCloudinaryPrefix = (): string => {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME || "safora";
  return `https://res.cloudinary.com/${cloudName}/`;
};

const cloudinaryAudioUrl = z
  .string()
  .url("Audio evidence must be a valid URL")
  .refine(
    (url) => {
      if (!url) return true;
      const prefix = getExpectedCloudinaryPrefix();
      if (!url.startsWith(prefix)) return false;
      if (!url.includes("/safora/sos_audio/")) return false;
      return (
        url.includes("/video/upload/") || url.includes("/video/authenticated/")
      );
    },
    `Audio evidence URL must be hosted on SAFORA Cloudinary storage in /safora/sos_audio/ (https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME || "<cloud-name>"}/)`,
  )
  .optional()
  .nullable();

export const sosAlertSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  accuracy: z.number().optional(),
  battery_percentage: z.number().min(0).max(100).optional(),
  journey_id: z.number().or(z.string()).optional().nullable(),
  audio_url: cloudinaryAudioUrl,
  audioUrl: cloudinaryAudioUrl,
  is_test: z.boolean().optional(),
  isTest: z.boolean().optional(),
});

export const attachAudioSchema = z.object({
  audio_url: cloudinaryAudioUrl.refine(
    (url) => typeof url === "string" && url.length > 0,
    "Valid Cloudinary audio URL is required",
  ),
});

export const updateSosStatusSchema = z.object({
  status: z.enum(["dispatched", "acknowledged", "resolved"]),
});

export const trustedContactSchema = z.object({
  name: z.string().min(2).max(100),
  phone: z.string().min(7).max(20),
  email: z.string().email().optional().nullable().or(z.literal("")),
  relationship: z.string().max(50).optional(),
});

export const testGuardianSchema = z.object({
  contactId: z.union([z.string(), z.number()]),
});
