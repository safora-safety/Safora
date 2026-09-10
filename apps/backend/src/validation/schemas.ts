import { z } from "zod";

export const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional(),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

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
  speed: z.number().optional(),
  heading: z.number().optional(),
});

export const sosAlertSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  accuracy: z.number().optional(),
  battery_percentage: z.number().min(0).max(100).optional(),
  journey_id: z.number().or(z.string()).optional().nullable(),
});

export const trustedContactSchema = z.object({
  name: z.string().min(2).max(100),
  phone: z.string().min(7).max(20),
  relationship: z.string().max(50).optional(),
});
