const express = require("express");
const router = express.Router();
const {
  createCountVehicle,
  getAllCountVehicles,
  getCountVehicleById,
  updateCountVehicle,
  deleteCountVehicle,
} = require("../../controllers/countVehicleController");

router.post("/", createCountVehicle);
router.get("/", getAllCountVehicles);
router.get("/:id", getCountVehicleById);
router.patch("/:id", updateCountVehicle);
router.delete("/:id", deleteCountVehicle);

module.exports = router;
