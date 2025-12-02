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
  getDamagedTripData,
  getHealthyTripPath,
  applyGPSFix,
  applyKMLFix,
  downloadDamagedKML,
  getTripVisualizationData,
  restoreOriginalTrip,
} = require("../../controllers/qualityAssuranceController");

router.get("/", getAllQualityAssurances);
router.get("/stops/:tripId", getTripAllStops);
router.post("/duplicate/:tripId", duplicateTrip);
router.patch("/trash/:tripId", trashTrip);
router.get("/split/stops/:tripId", getStopsForSplit);
router.post("/split/:tripId", splitTrip);

router.get("/snap/stops/:tripId", getStopsForSnap);
router.post("/snap/apply/:tripId", applySnapToRoad);

// for fix gps
router.get("/gps-fixer/damaged/:tripId", getDamagedTripData);
router.get("/gps-fixer/healthy/:healthyTripId", getHealthyTripPath);
router.post("/gps-fixer/fix/:tripId", applyGPSFix);
router.post("/gps-fixer/fix-kml/:tripId", applyKMLFix);
router.get("/gps-fixer/download-kml/:tripId", downloadDamagedKML);
// for show gps
router.get("/:tripId", getTripVisualizationData);
router.post("/restore/:tripId", restoreOriginalTrip);

module.exports = router;

module.exports = router;
