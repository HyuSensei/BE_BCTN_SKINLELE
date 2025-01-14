// handlers/callHandler.js
import { getAllSocketsForUser } from "../connectionManager.js";

export const handleCallEvents = (io, socket) => {
  socket.on("initiateCall", async (data) => {
    const { to, from, offer } = data;
    const receiverSockets = getAllSocketsForUser(to);

    receiverSockets.forEach((socketId) => {
      io.to(socketId).emit("incomingCall", {
        from,
        offer,
        conversationId: data.conversationId,
      });
    });
  });

  socket.on("acceptCall", async (data) => {
    const { to, from, answer } = data;
    const callerSockets = getAllSocketsForUser(to);

    callerSockets.forEach((socketId) => {
      io.to(socketId).emit("callAccepted", {
        from,
        answer,
      });
    });
  });

  socket.on("rejectCall", (data) => {
    const { to, from } = data;
    const callerSockets = getAllSocketsForUser(to);

    callerSockets.forEach((socketId) => {
      io.to(socketId).emit("callRejected", {
        from,
        reason: "Call rejected",
      });
    });
  });

  socket.on("endCall", (data) => {
    const { to, from } = data;
    const receiverSockets = getAllSocketsForUser(to);

    receiverSockets.forEach((socketId) => {
      io.to(socketId).emit("callEnded", { from });
    });
  });

  // Xử lý trao đổi ICE candidates
  socket.on("iceCandidate", (data) => {
    const { to, from, candidate } = data;
    const receiverSockets = getAllSocketsForUser(to);

    receiverSockets.forEach((socketId) => {
      io.to(socketId).emit("iceCandidate", {
        from,
        candidate,
      });
    });
  });
};
