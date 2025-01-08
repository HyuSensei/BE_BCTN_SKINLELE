const connections = new Map();

export const addConnection = (socket) => {
  const userId = socket.userId;
  const userConnections = connections.get(userId) || [];
  userConnections.push(socket.id);
  connections.set(userId, userConnections);
  return Array.from(connections.keys());
};

export const removeConnection = (socket) => {
  const userId = socket.userId;
  let userConnections = connections.get(userId) || [];
  userConnections = userConnections.filter((id) => id !== socket.id);

  if (userConnections.length === 0) {
    connections.delete(userId);
  } else {
    connections.set(userId, userConnections);
  }
  return Array.from(connections.keys());
};

export const isUserOnline = (userId) => {
  return connections.has(userId);
};

export const getOnlineUsers = () => {
  return Array.from(connections.keys());
};

export const getUserBySocketId = (socketId) => {
  return connections[socketId]?.userId || "";
};

export const getAllSocketsForUser = (userId) => {
  return connections.get(userId) || [];
};

export const getAdminSocketIds = (io) => {
  const adminSocketIds = [];
  for (const [socketId, socket] of io.sockets.sockets) {
    if (socket.userType === "admin") {
      adminSocketIds.push(socketId);
    }
  }
  return adminSocketIds;
};
