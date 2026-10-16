import { Server, Socket } from "socket.io";
import jwt from "jsonwebtoken";
import { UserRepository } from "../repositories/userRepository";
import { JourneyRepository } from "../repositories/journeyRepository";
import { SosRepository } from "../repositories/sosRepository";
import { AudioStitcherService } from "../services/audioStitcherService";

const JWT_SECRET = process.env.JWT_SECRET;

let socketServerInstance: Server | null = null;

export function broadcastSosAlert(data: {
  alertId: string | number;
  userId: string | number;
  userName?: string;
  latitude: number;
  longitude: number;
  batteryPercentage?: number;
  audioUrl?: string | null;
  isTest?: boolean;
  source?: string;
  timestamp?: string;
  guardianUserIds?: (string | number)[];
}): void {
  if (socketServerInstance) {
    const payload = {
      ...data,
      isTest: Boolean(data.isTest),
      timestamp: data.timestamp || new Date().toISOString(),
    };

    // 1. Emit to operations staff command center
    socketServerInstance.to("staff").emit("sos:alert", payload);

    // 2. Emit to the user's own personal channel
    socketServerInstance.to(`user:${data.userId}`).emit("sos:alert", payload);

    // 3. Emit specifically to confirmed guardian user channels (SKIP if it's a test drill)
    if (
      !data.isTest &&
      data.guardianUserIds &&
      data.guardianUserIds.length > 0
    ) {
      for (const gid of data.guardianUserIds) {
        socketServerInstance.to(`user:${gid}`).emit("sos:alert", payload);
      }
    }

    console.log(
      `[Socket.IO] Verified SOS broadcast (isTest=${Boolean(data.isTest)}) scoped to 'staff' and ${data.isTest ? 0 : data.guardianUserIds?.length || 0} guardians for user ${data.userId}`,
    );
  }
}

export function broadcastSosAudio(data: {
  alertId: string | number;
  userId: string | number;
  audioUrl: string;
}): void {
  if (socketServerInstance) {
    const payload = {
      alertId: data.alertId,
      userId: data.userId,
      audioUrl: data.audioUrl,
      timestamp: new Date().toISOString(),
    };

    // 1. Emit audio update to operations staff command center without re-alerting
    socketServerInstance.to("staff").emit("sos:audio", payload);

    // 2. Emit to user's own channel
    socketServerInstance.to(`user:${data.userId}`).emit("sos:audio", payload);

    console.log(
      `[Socket.IO] Verified SOS audio attachment broadcast for alert ${data.alertId}`,
    );
  }
}

export function broadcastSosLiveAudioChunk(data: {
  alertId: string | number;
  seq: number;
  totalChunksExpected?: number;
  durationSec?: number;
  mimeType?: string;
  data: string;
  isLast: boolean;
  timestamp?: string;
  guardianUserIds?: (string | number)[];
}): void {
  if (socketServerInstance) {
    const payload = {
      alertId: data.alertId,
      seq: data.seq,
      totalChunksExpected: data.totalChunksExpected || 6,
      durationSec: data.durationSec || 5.0,
      mimeType: data.mimeType || "audio/wav",
      data: data.data,
      isLast: Boolean(data.isLast),
      timestamp: data.timestamp || new Date().toISOString(),
    };

    // 1. Alert-scoped room (for listeners joined via sos:join)
    socketServerInstance
      .to(`sos:alert:${data.alertId}`)
      .emit("sos:live_audio_chunk", payload);

    // 2. Staff operations command room
    socketServerInstance.to("staff").emit("sos:live_audio_chunk", payload);

    // 3. Registered guardian user personal channels
    if (data.guardianUserIds && data.guardianUserIds.length > 0) {
      for (const gid of data.guardianUserIds) {
        socketServerInstance
          .to(`user:${gid}`)
          .emit("sos:live_audio_chunk", payload);
      }
    }
  }
}

export function broadcastJourneyLocation(data: {
  journeyId: string | number;
  userId?: string | number;
  walkerName?: string;
  latitude: number;
  longitude: number;
  speed?: number | null;
  battery?: number | null;
  deviated?: boolean;
  timestamp?: string;
  guardianUserIds?: (string | number)[];
}): void {
  if (socketServerInstance) {
    const payload = {
      ...data,
      timestamp: data.timestamp || new Date().toISOString(),
    };

    // 1. Broadcast to journey-scoped room (for walker & subscribed guardians)
    socketServerInstance
      .to(`journey:${data.journeyId}`)
      .emit("journey:location", payload);

    // 2. Broadcast to staff operations radar
    socketServerInstance.to("staff").emit("journey:location", payload);

    // 3. Broadcast to all registered trusted contact guardian channels
    if (data.guardianUserIds && data.guardianUserIds.length > 0) {
      for (const gid of data.guardianUserIds) {
        socketServerInstance
          .to(`user:${gid}`)
          .emit("journey:location", payload);
      }
    }
  }
}

export function broadcastJourneyStarted(data: {
  journeyId: string | number;
  userId: string | number;
  walkerName?: string;
  origin?: any;
  destination?: any;
  plannedRoute?: any;
  guardianUserIds?: (string | number)[];
}): void {
  if (socketServerInstance) {
    const payload = {
      ...data,
      timestamp: new Date().toISOString(),
    };

    socketServerInstance.to("staff").emit("journey:start", payload);

    if (data.guardianUserIds && data.guardianUserIds.length > 0) {
      for (const gid of data.guardianUserIds) {
        socketServerInstance.to(`user:${gid}`).emit("journey:start", payload);
      }
    }
  }
}

export function broadcastJourneyEnded(data: {
  journeyId: string | number;
  userId?: string | number;
  status: "completed" | "cancelled" | "deleted";
  guardianUserIds?: (string | number)[];
}): void {
  if (socketServerInstance) {
    const payload = {
      ...data,
      timestamp: new Date().toISOString(),
    };

    socketServerInstance
      .to(`journey:${data.journeyId}`)
      .emit("journey:ended", payload);
    socketServerInstance.to("staff").emit("journey:ended", payload);

    if (data.guardianUserIds && data.guardianUserIds.length > 0) {
      for (const gid of data.guardianUserIds) {
        socketServerInstance.to(`user:${gid}`).emit("journey:ended", payload);
      }
    }
  }
}

export function setupJourneySockets(io: Server): void {
  socketServerInstance = io;

  // Socket Authentication Middleware
  io.use(async (socket: Socket, next) => {
    try {
      const authHeader =
        socket.handshake.auth?.token || socket.handshake.headers?.authorization;

      if (!authHeader) {
        return next(new Error("Authentication error: No token provided"));
      }

      const token =
        typeof authHeader === "string" && authHeader.startsWith("Bearer ")
          ? authHeader.split(" ")[1]
          : String(authHeader);

      if (!JWT_SECRET) {
        return next(
          new Error("Authentication error: Server secret not configured"),
        );
      }

      const decoded = jwt.verify(token, JWT_SECRET, {
        algorithms: ["HS256"],
      }) as {
        id: number;
        email: string;
        role?: string;
      };

      const user = await UserRepository.findById(decoded.id);
      if (!user || user.is_active === false) {
        return next(
          new Error("Authentication error: User inactive or suspended"),
        );
      }

      socket.data.user = {
        id: user.id,
        email: user.email,
        role: user.role,
      };

      next();
    } catch {
      next(new Error("Authentication error: Invalid or expired token"));
    }
  });

  io.on("connection", (socket: Socket) => {
    const user = socket.data.user;
    console.log(
      `[Socket.IO] Authenticated client connected: ${socket.id} (User: ${user?.email})`,
    );

    // 1. Join user's individual room for personal notifications & guardian alerts
    socket.join(`user:${user.id}`);

    // 2. Join staff operations room if admin or moderator
    if (user.role === "admin" || user.role === "moderator") {
      socket.join("staff");
      console.log(`[Socket.IO] User ${user.email} joined 'staff' channel`);
    }

    // Join a scoped room for an active journey session (Owner or Staff only)
    socket.on("journey:join", async (data: { journeyId: string | number }) => {
      if (!data?.journeyId) return;

      try {
        const journey = await JourneyRepository.findById(data.journeyId);
        if (!journey) {
          socket.emit("error", { message: "Journey not found" });
          return;
        }

        const isOwner = String(journey.user_id) === String(user.id);
        const isStaff = user.role === "admin" || user.role === "moderator";
        const isGuardian =
          Array.isArray(journey.trusted_contact_ids) &&
          journey.trusted_contact_ids.map(String).includes(String(user.id));

        if (!isOwner && !isStaff && !isGuardian) {
          socket.emit("error", {
            message: "Forbidden: Not authorized to join this journey channel",
          });
          return;
        }

        const room = `journey:${data.journeyId}`;
        socket.join(room);
        console.log(
          `[Socket.IO] Client ${socket.id} (${user.email}) joined room ${room}`,
        );
      } catch {
        socket.emit("error", { message: "Failed to join journey room" });
      }
    });

    // Client streams location update to everyone in the journey room (Owner only)
    socket.on(
      "journey:update-location",
      async (data: {
        journeyId: string | number;
        latitude: number;
        longitude: number;
        speed?: number;
        heading?: number;
      }) => {
        if (!data?.journeyId) return;

        try {
          const journey = await JourneyRepository.findById(data.journeyId);
          if (!journey || String(journey.user_id) !== String(user.id)) {
            socket.emit("error", {
              message:
                "Forbidden: Cannot broadcast location for unowned journey",
            });
            return;
          }

          io.to(`journey:${data.journeyId}`).emit("journey:location", {
            ...data,
            timestamp: new Date().toISOString(),
          });
        } catch {
          socket.emit("error", {
            message: "Failed to broadcast journey location",
          });
        }
      },
    );

    // Join a scoped room for an active SOS alert (Owner, Staff, or verified Guardian only)
    socket.on("sos:join", async (data: { alertId: string | number }) => {
      if (!data?.alertId) return;

      const alertIdNum = Number(data.alertId);
      if (isNaN(alertIdNum)) return;

      try {
        const alert = await SosRepository.findById(alertIdNum);
        if (!alert) {
          socket.emit("error", { message: "SOS alert not found" });
          return;
        }

        const isOwner = String(alert.user_id) === String(user.id);
        const isStaff = user.role === "admin" || user.role === "moderator";
        const isGuardian =
          !isOwner &&
          !isStaff &&
          (await SosRepository.isUserGuardian(alert.user_id, user.id));

        if (!isOwner && !isStaff && !isGuardian) {
          socket.emit("error", {
            message: "Forbidden: Not authorized to join this SOS channel",
          });
          return;
        }

        const room = `sos:alert:${data.alertId}`;
        socket.join(room);
        console.log(
          `[Socket.IO] Client ${socket.id} (${user.email}) joined SOS room ${room}`,
        );
      } catch {
        socket.emit("error", { message: "Failed to join SOS room" });
      }
    });

    socket.on("sos:leave", (data: { alertId: string | number }) => {
      if (!data?.alertId) return;
      socket.leave(`sos:alert:${data.alertId}`);
    });

    // Mobile client streams 5s audio chunk (Pipe 1)
    socket.on(
      "sos:audio_chunk",
      async (data: {
        alertId: string | number;
        seq: number;
        totalChunksExpected?: number;
        durationSec?: number;
        mimeType?: string;
        data: string;
        isLast: boolean;
        sampleRate?: number;
      }) => {
        if (!data?.alertId || !data?.data || typeof data.seq !== "number") {
          return;
        }

        const alertIdNum = Number(data.alertId);
        if (isNaN(alertIdNum)) {
          return;
        }

        try {
          const alert = await SosRepository.findById(alertIdNum);
          const isOwner =
            Boolean(alert) &&
            (String(alert?.user_id) === String(user.id) ||
              Number(alert?.user_id) === Number(user.id));
          const isStaff = user.role === "admin" || user.role === "moderator";

          if (!alert || (!isOwner && !isStaff)) {
            console.warn(
              `[Socket.IO] Forbidden audio slice #${data.seq} for alert ${alertIdNum} from user ${user.id} (owner: ${alert?.user_id})`,
            );
            socket.emit("error", {
              message: "Forbidden: Cannot stream audio for unowned SOS alert",
            });
            return;
          }

          console.log(
            `[Socket.IO] Ingested live audio slice #${data.seq} for alert ${data.alertId} (${data.durationSec || 5}s, isLast=${Boolean(data.isLast)})`,
          );

          // Fetch guardians to broadcast live slice to their personal rooms
          const guardianUserIds = await SosRepository.findGuardianUserIds(
            alert.user_id,
          );

          // 1. Instantly forward live audio slice to alert room, staff, and guardians
          broadcastSosLiveAudioChunk({
            alertId: data.alertId,
            seq: data.seq,
            totalChunksExpected: data.totalChunksExpected,
            durationSec: data.durationSec,
            mimeType: data.mimeType,
            data: data.data,
            isLast: data.isLast,
            guardianUserIds,
          });

          // 2. Acknowledge back to emitting mobile client
          socket.emit("sos:audio_chunk_ack", {
            alertId: data.alertId,
            seq: data.seq,
            receivedAt: new Date().toISOString(),
          });

          // 3. Disk staging & server watchdog management (auto-stitch fallback if client dies)
          AudioStitcherService.handleIncomingChunk({
            alertId: data.alertId,
            userId: user.id,
            seq: data.seq,
            dataBase64: data.data,
            isLast: Boolean(data.isLast),
            sampleRate: data.sampleRate,
          }).catch((err) => {
            console.warn(
              `[Socket.IO] Error staging audio chunk for alert ${data.alertId}:`,
              err,
            );
          });
        } catch (err) {
          console.error(`[Socket.IO] Error processing sos:audio_chunk:`, err);
          socket.emit("error", { message: "Failed to process audio chunk" });
        }
      },
    );

    socket.on("disconnect", () => {
      console.log(
        `[Socket.IO] Client disconnected: ${socket.id} (${user?.email})`,
      );
    });
  });
}
