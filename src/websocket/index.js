import express from "express";
import { Server } from "socket.io";
import dotenv from "dotenv";
dotenv.config({});
import http from "http";
import { addConnection, removeConnection } from "./connectionManager.js";
import { handleChatEvents } from "./handlers/chatHandler.js";
import { getOnlineUsers } from "./connectionManager.js";
import { handleNotificationEvents } from "./handlers/notificationHandle.js";
import { handleCallEvents } from "./handlers/handleCallEvents.js";

const app = express();

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONT_END_URL,
    credentials: true,
  },
});

//Connect socket
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

  client.userId = userId;
  client.userType = userType;

  console.log(`User connected: ${client.userId} (${client.userType})`);
  const onlineUsers = addConnection(client);

  io.emit("userOnlines", onlineUsers);
  client.join(client.userType);

  console.log("All users connected:", getOnlineUsers());

  //init events
  handleChatEvents(io, client);

  handleNotificationEvents(io, client);

  handleCallEvents(io, client);

  //Disconnect socket
  client.on("disconnect", () => {
    console.log(`User disconnected: ${client.userId}`);

    const remainingUsers = removeConnection(client);
    io.emit("userOnlines", remainingUsers);

    client.leave(client.userType);
  });
});

export { io, app, server };
