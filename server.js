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

// const markTripsUploaded = async () => {
//   try {
//     // 1️⃣ First, mark first 10 trips as false
//     const first10Trips = await tripModel
//       .find()
//       .sort({ createdAt: 1 })
//       .limit(10);

//     const first10Ids = first10Trips.map((t) => t._id);

//     if (first10Ids.length > 0) {
//       await tripModel.updateMany(
//         { _id: { $in: first10Ids } },
//         { $set: { isUploaded: false } }
//       );
//     }

//     // 2️⃣ Remaining trips → true
//     await tripModel.updateMany(
//       { _id: { $nin: first10Ids } },
//       { $set: { isUploaded: true } }
//     );

//     console.log("Trips updated successfully ✅");
//   } catch (err) {
//     console.error("Error updating trips:", err);
//   }
// };

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
