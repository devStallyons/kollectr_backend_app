const express = require("express");
const router = express.Router();
const {
  OperationSummary,
  dailyPerformance,
  sampleCompletion,
  getFrequencyCount,
  deleteCountVehicle,
} = require("../../controllers/operationController");

router.get("/summary", OperationSummary);
router.get("/daily-performance", dailyPerformance);
router.get("/sample-completion", sampleCompletion);
router.get("/frequency", getFrequencyCount);
router.delete("/frequency/:id", deleteCountVehicle);

module.exports = router;
