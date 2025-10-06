const express = require("express");
const router = express.Router();
const {
  createSurveyPeriod,
  getAllSurveyPeriods,
  getSurveyPeriodById,
  updateSurveyPeriod,
  deleteSurveyPeriod,
} = require("../../controllers/PredefinedSurveyPeriodController");

router.post("/", createSurveyPeriod);
router.get("/", getAllSurveyPeriods);
router.get("/:id", getSurveyPeriodById);
router.put("/:id", updateSurveyPeriod);
router.delete("/:id", deleteSurveyPeriod);

module.exports = router;
