import express, { Request, Response } from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import dotenv from "dotenv";
import { runSystemDiagnostics } from "./config/diagnostics";
import { authMiddleware, requireAdmin } from "./middleware/auth";
import authRoutes from "./routes/authRoutes";
import reportRoutes from "./routes/reportRoutes";
import journeyRoutes from "./routes/journeyRoutes";
import sosRoutes from "./routes/sosRoutes";
import notificationRoutes from "./routes/notificationRoutes";
import userRoutes from "./routes/userRoutes";
import internalRoutes from "./routes/internalRoutes";
import { errorHandler } from "./middleware/errorHandler";

dotenv.config();

const app = express();

// Enable reverse proxy support (Render / Cloudflare / AWS ALB)
app.set("trust proxy", 1);

// Core Security & Request Middleware
app.use(helmet());

const allowedOrigins = [
  "https://safora-admin.onrender.com",
  "http://localhost:5173",
  "http://localhost:3000",
  ...(process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(",").map((o) => o.trim())
    : []),
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (such as mobile apps, curl, server-to-server)
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS origin not allowed: ${origin}`));
      }
    },
    credentials: true,
  }),
);

app.use(morgan("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Root route
app.get("/", (_req: Request, res: Response) => {
  res.send("Welcome to SAFORA Backend API");
});

// Health Check Endpoint
app.get("/api/health", (_req: Request, res: Response) => {
  res.status(200).json({
    status: "online",
    project: "SAFORA - Community Safety & Safe Walk App",
    timestamp: new Date().toISOString(),
  });
});

// Live Diagnostics Endpoint (Admin-only to avoid leaking infrastructure telemetry)
app.get(
  "/api/diagnostics",
  authMiddleware as any,
  requireAdmin as any,
  async (_req: Request, res: Response) => {
    try {
      const report = await runSystemDiagnostics();
      res.status(200).json(report);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      res
        .status(500)
        .json({ error: "Failed to run diagnostics", details: errorMsg });
    }
  },
);

// Modular API Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/journeys", journeyRoutes);
app.use("/api/sos", sosRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/internal", internalRoutes);

// Centralized Error Handling Middleware (Always registered last)
app.use(errorHandler);

export { app };
export default app;
