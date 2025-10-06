// src/api/vehicleType/vehicleTypeRoutes.js
const express = require("express");
const router = express.Router();
const {
  createVehicleType,
  getAllVehicleTypes,
  getVehicleTypeById,
  updateVehicleType,
  deleteVehicleType,
  uploadVehicleTypesFromCSV,
} = require("../../controllers/vehicleTypeController");
const upload = require("../../utils/multerUpload");

router.post("/", createVehicleType);
router.post("/upload", upload.single("file"), uploadVehicleTypesFromCSV);
router.get("/", getAllVehicleTypes);
router.get("/:id", getVehicleTypeById);
router.patch("/:id", updateVehicleType);
router.delete("/:id", deleteVehicleType);

module.exports = router;
