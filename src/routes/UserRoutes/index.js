const express = require("express");
const router = express.Router();

const { protect, roleCheck } = require("../../middleware/authMiddleware");
const authRoutes = require("./authRoutes");
const tripRoutes = require("./tripRoutes");
const locationRoutes = require("../CommonRoutes/countLocationRoutes");
const vehicleAndRoutes = require("./vehicleAndRoutes");
const countVehicle = require("./countVehicleRoutes");
const deviceRoutes = require("../CommonRoutes/deviceRoutes");

router.use("/auth", authRoutes);

router.use("/trip", protect, tripRoutes);
router.use("/count-location", protect, locationRoutes);
router.use("/vehicle-and-routes", protect, vehicleAndRoutes);
router.use(
  "/count-vehicle",
  protect,
  roleCheck(["admin", "user", "mapper"]),
  countVehicle
);
router.use("/device", protect, deviceRoutes);

module.exports = router;
