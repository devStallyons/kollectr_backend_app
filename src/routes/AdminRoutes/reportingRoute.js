const express = require("express");
const router = express.Router();
const {
  getDataDownload,
  downloadTripsCSV,
  downloadStopsCSV,
  downloadTripsKML,
  getDashboardKPIs,
  getDashboardChartData,
} = require("../../controllers/reportingController");

router.get("/", getDataDownload);
router.post("/csv/trips", downloadTripsCSV);
router.post("/csv/stops", downloadStopsCSV);
router.post("/kml", downloadTripsKML);

// dashboard
router.get("/dashboard/kpis", getDashboardKPIs);
router.get("/dashboard/chart", getDashboardChartData);

module.exports = router;
