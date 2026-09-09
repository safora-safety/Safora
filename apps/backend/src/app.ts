import express, { Request, Response } from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import dotenv from "dotenv";
import http from "http";
import { Server as SocketIOServer } from "socket.io";
import { runSystemDiagnostics } from "./config/diagnostics";
import { initDatabase } from "./config/database";
import authRoutes from "./routes/authRoutes";
import reportRoutes from "./routes/reportRoutes";

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST", "PATCH", "DELETE"],
  },
});

const PORT = process.env.PORT || 5000;

// Core Middleware
app.use(helmet());
app.use(cors());
app.use(morgan("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/reports", reportRoutes);

// Health Check Endpoint
app.get("/api/health", (_req: Request, res: Response) => {
  res.status(200).json({
    status: "online",
    project: "SAFORA - Community Safety & Safe Walk App",
    timestamp: new Date().toISOString(),
  });
});

// Live Diagnostics Endpoint
app.get("/api/diagnostics", async (_req: Request, res: Response) => {
  try {
    const report = await runSystemDiagnostics();
    res.status(200).json(report);
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    res
      .status(500)
      .json({ error: "Failed to run diagnostics", details: errorMsg });
  }
});

// Root route
app.get("/", (_req: Request, res: Response) => {
  res.send("Welcome to SAFORA Backend API");
});

// Socket.IO connection
io.on("connection", (socket) => {
  console.log(`[Socket.IO] Client connected: ${socket.id}`);

  socket.on("disconnect", () => {
    console.log(`[Socket.IO] Client disconnected: ${socket.id}`);
  });
});

// Start Server and trigger database setup + diagnostics
server.listen(PORT, async () => {
  console.log(`[INFO] Server running on port ${PORT}`);
  console.log(`[INFO] Health check: http://localhost:${PORT}/api/health`);
  console.log(`[INFO] Diagnostics:  http://localhost:${PORT}/api/diagnostics`);
  console.log(`[INFO] Auth API:     http://localhost:${PORT}/api/auth`);
  console.log(`[INFO] Reports API:  http://localhost:${PORT}/api/reports`);

  // Initialize DB tables & seed
  await initDatabase();

  // Run initial diagnostic check on startup
  await runSystemDiagnostics();
});

export { app, server, io };
