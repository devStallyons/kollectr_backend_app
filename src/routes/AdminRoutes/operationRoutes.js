const express = require("express");
const router = express.Router();
const {
  OperationSummary,
  dailyPerformance,
  sampleCompletion,
  getFrequencyCount,
} = require("../../controllers/operationController");

router.get("/summary", OperationSummary);
router.get("/daily-performance", dailyPerformance);
router.get("/sample-completion", sampleCompletion);
router.get("/frequency", getFrequencyCount);

module.exports = router;
