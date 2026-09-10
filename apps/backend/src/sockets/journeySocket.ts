import { Server, Socket } from "socket.io";

export function setupJourneySockets(io: Server): void {
  io.on("connection", (socket: Socket) => {
    console.log(`[Socket.IO] Client connected: ${socket.id}`);

    // Join a scoped room for an active journey session
    socket.on("journey:join", (data: { journeyId: string | number }) => {
      if (data?.journeyId) {
        const room = `journey:${data.journeyId}`;
        socket.join(room);
        console.log(`[Socket.IO] Client ${socket.id} joined room ${room}`);
      }
    });

    // Client streams location update to everyone in the journey room
    socket.on(
      "journey:update-location",
      (data: {
        journeyId: string | number;
        latitude: number;
        longitude: number;
        speed?: number;
        heading?: number;
      }) => {
        if (data?.journeyId) {
          io.to(`journey:${data.journeyId}`).emit("journey:location", {
            ...data,
            timestamp: new Date().toISOString(),
          });
        }
      },
    );

    // Emergency SOS broadcast to contacts/monitoring sockets
    socket.on(
      "sos:trigger",
      (data: {
        alertId: string | number;
        userId: string | number;
        latitude: number;
        longitude: number;
      }) => {
        io.emit("sos:alert", {
          ...data,
          timestamp: new Date().toISOString(),
        });
        console.log(
          `[Socket.IO] Emergency SOS broadcast for user ${data.userId}`,
        );
      },
    );

    socket.on("disconnect", () => {
      console.log(`[Socket.IO] Client disconnected: ${socket.id}`);
    });
  });
}
