import {
  getAllCustomerConversation,
  getAllSupportConversation,
  getConversation,
} from "../../services/conversation.service.js";
import {
  createMessage,
  getMessages,
  updateSeenMessage,
} from "../../services/message.service.js";
import {
  getAllSocketsForUser,
  getUserBySocketId,
} from "../connectionManager.js";

export const handleChatEvents = (io, socket) => {
  socket.on("getAllCustomer", async (adminId) => {
    const conversations = await getAllCustomerConversation(adminId);
    socket.emit("resGetAllCustomer", conversations);
  });

  socket.on("getAllSupport", async (userId) => {
    const conversations = await getAllSupportConversation(userId);
    socket.emit("resGetAllSupport", conversations);
  });

  socket.on("getConversation", async (conversationId) => {
    const conversation = await getConversation(conversationId);
    socket.emit("resConversation", conversation);
  });

  socket.on("createMessage", async (data) => {
    const payload = JSON.parse(data);
    const { sender, receiver } = payload;
    const message = await createMessage(payload);
    const messages = await getMessages(message.conversation);

    const receiverSockets = getAllSocketsForUser(receiver._id);
    const senderSockets = getAllSocketsForUser(sender._id);

    receiverSockets.forEach((socketId) => {
      io.to(socketId).emit("resGetMessages", messages);
    });

    senderSockets.forEach((socketId) => {
      io.to(socketId).emit("resGetMessages", messages);
    });
  });

  socket.on("getMessages", async (conversationId) => {
    const messages = await getMessages(conversationId);
    socket.emit("resGetMessages", messages);
  });

  socket.on("seenMessage", async (data) => {
    const payload = JSON.parse(data);
    const { sender, receiver, conversationId } = payload;
    const messages = await updateSeenMessage(conversationId);

    const receiverSockets = getAllSocketsForUser(receiver._id);
    const senderSockets = getAllSocketsForUser(sender._id);

    if (senderSockets && receiverSockets) {
      receiverSockets.forEach((socketId) => {
        io.to(socketId).emit("resMessages", messages);
      });
      senderSockets.forEach((socketId) => {
        io.to(socketId).emit("resMessages", messages);
      });
    }
  });

  socket.on("onTyping", (receiver) => {
    const payloadReceiver = JSON.parse(receiver);
    const sender = getUserBySocketId(socket.id);
    if (!sender) return;

    const receiverSockets = getAllSocketsForUser(payloadReceiver._id);
    receiverSockets.forEach((socketId) => {
      io.to(socketId).emit("resTyping", {
        sender,
        isTyping: true,
      });
    });
  });

  socket.on("stopTyping", (receiver) => {
    const payloadReceiver = JSON.parse(receiver);
    const sender = getUserBySocketId(socket.id);
    if (!sender) return;

    const receiverSockets = getAllSocketsForUser(payloadReceiver._id);
    receiverSockets.forEach((socketId) => {
      io.to(socketId).emit("resTyping", {
        sender,
        isTyping: false,
      });
    });
  });
};
