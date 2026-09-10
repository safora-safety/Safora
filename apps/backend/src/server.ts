import http from "http";
import { Server as SocketIOServer } from "socket.io";
import { app } from "./app";
import { initDatabase } from "./config/database";
import { runSystemDiagnostics } from "./config/diagnostics";
import { setupJourneySockets } from "./sockets/journeySocket";

const PORT = process.env.PORT || 5000;

const server = http.createServer(app);

const io = new SocketIOServer(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST", "PATCH", "DELETE"],
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
    await initDatabase();

    // Run startup system diagnostics
    await runSystemDiagnostics();
  });
}

// Graceful Shutdown
function handleShutdown(signal: string): void {
  console.log(`[INFO] Received ${signal}. Gracefully closing server...`);
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
