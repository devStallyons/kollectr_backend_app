const express = require("express");
const router = express.Router();
const {
  OperationSummary,
  dailyPerformance,
} = require("../../controllers/operationController");

router.get("/summary", OperationSummary);
router.get("/daily-performance", dailyPerformance);

module.exports = router;
