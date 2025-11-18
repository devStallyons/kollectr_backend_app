const express = require("express");
const router = express.Router();
const {
  createTimePeriod,
  getAllTimePeriods,
  getTimePeriodById,
  updateTimePeriod,
  deleteTimePeriod,
} = require("../../controllers/PredefinedTimePeriodController");

router.post("/", createTimePeriod);
router.get("/", getAllTimePeriods);
router.get("/:id", getTimePeriodById);
router.put("/:id", updateTimePeriod);
router.delete("/:id", deleteTimePeriod);

module.exports = router;
