const express = require("express");
const router = express.Router();
const {
  getAllQualityAssurances,
  getTripAllStops,
} = require("../../controllers/qualityAssuranceController");

router.get("/", getAllQualityAssurances);
router.get("/:tripId", getTripAllStops);

module.exports = router;
