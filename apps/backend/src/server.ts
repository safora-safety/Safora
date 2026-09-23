import http from "http";
import { Server as SocketIOServer } from "socket.io";
import { app } from "./app";
import { initDatabase } from "./config/database";
import { runSystemDiagnostics } from "./config/diagnostics";
import { setupJourneySockets } from "./sockets/journeySocket";
import { WatchdogService } from "./services/watchdogService";

const PORT = process.env.PORT || 5000;

const server = http.createServer(app);

const allowedOrigins = [
  "https://safora-admin.onrender.com",
  "http://localhost:5173",
  "http://localhost:3000",
  ...(process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(",").map((o) => o.trim())
    : []),
];

const io = new SocketIOServer(server, {
  cors: {
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`Socket CORS origin not allowed: ${origin}`));
      }
    },
    methods: ["GET", "POST", "PATCH", "DELETE"],
    credentials: true,
  },
});

// Attach standard journey & SOS socket event handlers
setupJourneySockets(io);

// Server startup and database bootstrap
async function startServer(): Promise<void> {
  server.listen(PORT, async () => {
    console.log(`[INFO] SAFORA Server running on port ${PORT}`);
    console.log(`[INFO] Health check: http://localhost:${PORT}/api/health`);
    console.log(
      `[INFO] Diagnostics:  http://localhost:${PORT}/api/diagnostics`,
    );
    console.log(`[INFO] Auth API:     http://localhost:${PORT}/api/auth`);
    console.log(`[INFO] Reports API:  http://localhost:${PORT}/api/reports`);
    console.log(`[INFO] Journeys API: http://localhost:${PORT}/api/journeys`);
    console.log(`[INFO] SOS API:      http://localhost:${PORT}/api/sos`);

    // Initialize PostGIS schema, geography columns, and GiST indexes
    try {
      await initDatabase();
    } catch (dbErr) {
      console.warn(
        "[WARN] Background database initialization deferred:",
        dbErr,
      );
    }

    // Run startup system diagnostics
    try {
      await runSystemDiagnostics();
    } catch (diagErr) {
      console.warn("[WARN] Background system diagnostics deferred:", diagErr);
    }

    // Initialize server-side deviation watchdog (SYN-5)
    try {
      await WatchdogService.initialize();
      WatchdogService.startTick();
    } catch (watchdogErr) {
      console.warn("[WARN] Watchdog initialization deferred:", watchdogErr);
    }
  });
}

// Graceful Shutdown
function handleShutdown(signal: string): void {
  console.log(`[INFO] Received ${signal}. Gracefully closing server...`);
  WatchdogService.stopTick();
  server.close(() => {
    console.log("[INFO] HTTP server closed.");
    process.exit(0);
  });
}

process.on("SIGTERM", () => handleShutdown("SIGTERM"));
process.on("SIGINT", () => handleShutdown("SIGINT"));

startServer().catch((err) => {
  console.error("[FATAL] Server startup failed:", err);
  process.exit(1);
});

export { server, io };
