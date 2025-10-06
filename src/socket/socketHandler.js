const Location = require("../models/locationModel");

const socketHandler = (io) => {
  io.on("connection", (socket) => {
    console.log("Client connected:", socket.id);

    socket.on("locationUpdate", async (data) => {
      const { userId, latitude, longitude } = data || {};

      console.log(
        `Received location update for user ${userId},  lat: ${latitude}, lon: ${data?.longitude}, ${data}`
      );

      if (!userId || !latitude || !longitude) return;

      await Location.findOneAndUpdate(
        { userId },
        {
          latitude,
          longitude,
          timestamp: new Date(),
        },
        { upsert: true }
      );

      console.log(`Location updated for user ${userId}`);

      // Broadcast to others
      socket.broadcast.emit("locationBroadcast", data);
    });

    socket.on("disconnect", () => {
      console.log("Client disconnected:", socket.id);
    });
  });
};

module.exports = socketHandler;
