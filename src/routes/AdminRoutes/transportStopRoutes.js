const express = require("express");
const router = express.Router();
const {
  createTransportStop,
  getAllTransportStops,
  getTransportStopById,
  updateTransportStop,
  deleteTransportStop,
  uploadTransportStopsFromCSV,
} = require("../../controllers/transportStopController");
const upload = require("../../utils/multerUpload");

// CRUD routes
router.post("/", createTransportStop);
router.post("/upload", upload.single("file"), uploadTransportStopsFromCSV);
router.get("/", getAllTransportStops);
router.get("/:id", getTransportStopById);
router.patch("/:id", updateTransportStop);
router.delete("/:id", deleteTransportStop);

module.exports = router;
