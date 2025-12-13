const express = require("express");
const router = express.Router();
const {
  OperationSummary,
  dailyPerformance,
  sampleCompletion,
  getFrequencyCount,
  deleteCountVehicle,
  createCountVehicle,
  updateCountVehicle,
  getRouteCompletion,
  updatePlannedTrips,
  exportRouteCompletionCSV,
  setTargetTrips,
  updateRouteCompletionPlannedTrips,
} = require("../../controllers/operationController");
const { route } = require("./authRoutes");

router.get("/summary", OperationSummary);
router.get("/daily-performance", dailyPerformance);
router.get("/sample-completion", sampleCompletion);
router.get("/frequency", getFrequencyCount);
router.delete("/frequency/:id", deleteCountVehicle);
router.post("/frequency", createCountVehicle);
router.patch("/frequency/:id", updateCountVehicle);

router.post("/set-target-trips", setTargetTrips);

// for route completion
router.get("/route-completion", getRouteCompletion);
router.put("/route-completion/planned", updatePlannedTrips);
router.get("/route-completion/export", exportRouteCompletionCSV);
router.post(
  "/route-completion/update-planned-trips",
  updateRouteCompletionPlannedTrips
);

module.exports = router;
