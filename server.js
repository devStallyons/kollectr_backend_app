const express = require("express");
// const { Server } = require("socket.io");
// const http = require("http");
const helmet = require("helmet");
const connectDB = require("./src/config/DBConnection");
const errorHandler = require("./src/middleware/errorHandler");
const notFound = require("./src/middleware/notFound");
const { validateOrigin, corsMiddleware } = require("./src/utils/corsPolicy");
require("dotenv").config();

//route path
const adminRoutes = require("./src/routes/AdminRoutes/Index");
const userRoutes = require("./src/routes/UserRoutes/index");
const createDefaultAdmin = require("./src/utils/createDefaultAdmin");
// const socketHandler = require("./src/socket/socketHandler");
const limiter = require("./src/utils/rateLimit");
const countVehicleModel = require("./src/models/countVehicleModel");
const vehicleTypeModel = require("./src/models/vehicleTypeModel");
const tripModel = require("./src/models/tripModel");

const PORT = process.env.PORT || 3000;
// const SOCKET_PORT = process.env.SOCKET_PORT || 2000;

const app = express();
app.use(express.json());
// app.use();
app.use(corsMiddleware);
app.use(validateOrigin);
//rate limit
app.use(limiter);
//helmet
app.use(helmet());
app.disable("x-powered-by");

// const server = http.createServer(app);
// const io = new Server(server, {
//   cors: {
//     origin: "*",
//     methods: ["GET", "POST"],
//   },
// });

//connect to database
connectDB()
  .then(() => {
    // createDefaultAdmin();
  })
  .catch((err) => {
    console.error("Database connection or admin creation failed:", err);
  });

//socket //asdfs
// socketHandler(io);

const markTripsUploaded = async (limit = 10) => {
  try {
    // 1️⃣ First N trips (oldest first)
    const firstTrips = await tripModel
      .find()
      .sort({ createdAt: 1 })
      .limit(limit)
      .select("_id");

    const firstTripIds = firstTrips.map((trip) => trip._id);

    // 2️⃣ Mark first N as false
    if (firstTripIds.length > 0) {
      await tripModel.updateMany(
        { _id: { $in: firstTripIds } },
        { $set: { state: "mapped" } }
      );
    }

    // 3️⃣ Mark remaining as true
    await tripModel.updateMany(
      { _id: { $nin: firstTripIds } },
      { $set: { isUploaded: true } }
    );

    console.log(
      `Trips updated successfully ✅ (first ${limit} false, rest true)`
    );
  } catch (error) {
    console.error("Error updating trips ❌", error);
  }
};

// markTripsUploaded();

app.get("/", (req, res) => {
  res.json({
    message: "Hello from Kollect API!",
    status: "Server is running",
    timestamp: new Date().toISOString(),
  });
});

//routes
app.use("/api/admin", adminRoutes);
app.use("/api/user", userRoutes);

app.use(notFound);
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

// server.listen(SOCKET_PORT, () => {
//   console.log(`Socket.IO running on http://localhost:${SOCKET_PORT}`);
// });

module.exports = app;
