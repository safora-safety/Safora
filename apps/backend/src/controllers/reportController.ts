import { Request, Response } from "express";
import { db } from "../config/database";
import { AuthenticatedRequest } from "../middleware/auth";

export async function createReport(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const {
    category,
    title,
    description,
    severity,
    latitude,
    longitude,
    photo_url,
  } = req.body;
  const userId = req.user?.id || null;

  if (
    !category ||
    !title ||
    severity === undefined ||
    latitude === undefined ||
    longitude === undefined
  ) {
    res.status(400).json({
      success: false,
      message:
        "category, title, severity, latitude, and longitude are required",
    });
    return;
  }

  const parsedSeverity = Math.min(5, Math.max(1, parseInt(severity, 10) || 3));
  const lat = parseFloat(latitude);
  const lng = parseFloat(longitude);

  try {
    const result = await db.query(
      `INSERT INTO reports (user_id, category, title, description, severity, latitude, longitude, photo_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *;`,
      [
        userId,
        category,
        title,
        description || "",
        parsedSeverity,
        lat,
        lng,
        photo_url || null,
      ],
    );

    res.status(201).json({
      success: true,
      message: "Hazard report published",
      report: result.rows[0],
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("[ERROR] createReport failed:", errorMsg);
    res.status(500).json({ success: false, message: errorMsg });
  }
}

export async function getReports(req: Request, res: Response): Promise<void> {
  const limit = Math.min(100, parseInt(req.query.limit as string, 10) || 50);

  try {
    const result = await db.query(
      `SELECT r.*, u.name as reporter_name
       FROM reports r
       LEFT JOIN users u ON r.user_id = u.id
       ORDER BY r.created_at DESC
       LIMIT $1;`,
      [limit],
    );

    res.status(200).json({
      success: true,
      count: result.rows.length,
      reports: result.rows,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("[ERROR] getReports failed:", errorMsg);
    res.status(500).json({ success: false, message: errorMsg });
  }
}

export async function getNearbyReports(
  req: Request,
  res: Response,
): Promise<void> {
  const lat = parseFloat(req.query.lat as string) || 30.3165;
  const lng = parseFloat(req.query.lng as string) || 78.0322;
  const radiusMeters = parseFloat(req.query.radius as string) || 5000; // default 5km

  try {
    // Try PostGIS ST_DWithin query first
    try {
      const spatialResult = await db.query(
        `SELECT *,
          ROUND(ST_Distance(
            ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography,
            ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography
          )) as distance_meters
         FROM reports
         WHERE ST_DWithin(
           ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography,
           ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
           $3
         )
         ORDER BY distance_meters ASC;`,
        [lng, lat, radiusMeters],
      );

      res.status(200).json({
        success: true,
        source: "postgis",
        center: { lat, lng },
        radiusMeters,
        count: spatialResult.rows.length,
        reports: spatialResult.rows,
      });
      return;
    } catch {
      // Fallback: Haversine distance calculation
      const haversineResult = await db.query(
        `SELECT *,
          ROUND(6371000 * acos(
            cos(radians($1)) * cos(radians(latitude)) *
            cos(radians(longitude) - radians($2)) +
            sin(radians($1)) * sin(radians(latitude))
          )) AS distance_meters
         FROM reports
         ORDER BY distance_meters ASC
         LIMIT 50;`,
        [lat, lng],
      );

      res.status(200).json({
        success: true,
        source: "haversine_fallback",
        center: { lat, lng },
        radiusMeters,
        count: haversineResult.rows.length,
        reports: haversineResult.rows,
      });
    }
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ success: false, message: errorMsg });
  }
}
