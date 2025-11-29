const express = require("express");
const router = express.Router();
const {
  getAllQualityAssurances,
  getTripAllStops,
} = require("../../controllers/qualityAssuranceController");

router.get("/", getAllQualityAssurances);
router.get("/stops/:tripId", getTripAllStops);

module.exports = router;
