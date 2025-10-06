const express = require("express");
const router = express.Router();

const {
  getAllVehiclesAndRoutes,
} = require("../../controllers/VehicleAndRoutesController");

router.get("/", getAllVehiclesAndRoutes);

module.exports = router;
