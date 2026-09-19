import { Server, Socket } from "socket.io";
import jwt from "jsonwebtoken";
import { UserRepository } from "../repositories/userRepository";
import { JourneyRepository } from "../repositories/journeyRepository";

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

export function setupJourneySockets(io: Server): void {
  socketServerInstance = io;

  // Socket Authentication Middleware
  io.use(async (socket: Socket, next) => {
    try {
      const authHeader =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization ||
        socket.handshake.query?.token;

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

      const decoded = jwt.verify(token, JWT_SECRET) as {
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

        if (!isOwner && !isStaff) {
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

    socket.on("disconnect", () => {
      console.log(
        `[Socket.IO] Client disconnected: ${socket.id} (${user?.email})`,
      );
    });
  });
}
