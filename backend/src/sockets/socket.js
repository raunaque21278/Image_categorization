let io;

const initializeSocket = (server) => {
  const { Server } = require("socket.io");

  io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  io.on("connection", (socket) => {
    console.log(
      "Client Connected:",
      socket.id
    );

    socket.on(
      "join",
      (userId) => {
        socket.join(userId);

        console.log(
          `User ${userId} joined`
        );
      }
    );

    socket.on(
      "disconnect",
      () => {
        console.log(
          "Client disconnected"
        );
      }
    );
  });
};

const getIO = () => {
  if (!io) {
    throw new Error(
      "Socket.IO not initialized"
    );
  }

  return io;
};

module.exports = {
  initializeSocket,
  getIO
};