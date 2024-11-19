import express from "express";
import { Server } from "socket.io";
import dotenv from "dotenv";
dotenv.config({});
import http from "http";

const app = express();

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONT_END_URL,
    credentials: true,
  },
});

const PORT = process.env.PORT;

const connections = {};

const getAllUserIds = () => {
  return [...new Set(Object.values(connections).map((conn) => conn.userId))];
};

const getUserBySocketId = (socketId) => {
  return connections[socketId]?.userId || "";
};

const getAllSocketsForUser = (userId) => {
  return Object.entries(connections)
    .filter(([_, conn]) => conn.userId === userId)
    .map(([socketId]) => socketId);
};

io.on("connection", (client) => {
  const userId = client.handshake.query.userId;
  const userType = client.handshake.query.userType;

  if (
    !userId ||
    !userType ||
    !["admin", "customer", "doctor"].includes(userType)
  ) {
    client.disconnect();
    return;
  }

  connections[client.id] = { userId, userType };
  client.join(userType);
  io.emit("userOnlines", getAllUserIds());

  console.log("User connected:", getAllUserIds());

  client.on("disconnect", () => {
    const userId = getUserBySocketId(client.id);
    console.log("User disconnected:", userId);

    if (userId) {
      delete connections[client.id];
      const userStillHasOtherConnections = Object.values(connections).some(
        (conn) => conn.userId === userId
      );

      if (!userStillHasOtherConnections) {
        io.emit("userOnlines", getAllUserIds());
      }
    }
  });
});

export { io, app, server };
