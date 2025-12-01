const express = require("express");
const router = express.Router();
const {
  getAllQualityAssurances,
  getTripAllStops,
  duplicateTrip,
  trashTrip,
  splitTrip,
  getStopsForSplit,
  getStopsForSnap,
  applySnapToRoad,
} = require("../../controllers/qualityAssuranceController");

router.get("/", getAllQualityAssurances);
router.get("/stops/:tripId", getTripAllStops);
router.post("/duplicate/:tripId", duplicateTrip);
router.patch("/trash/:tripId", trashTrip);
router.get("/split/stops/:tripId", getStopsForSplit);
router.post("/split/:tripId", splitTrip);

router.get("/snap/stops/:tripId", getStopsForSnap);
router.post("/snap/apply/:tripId", applySnapToRoad);

module.exports = router;
