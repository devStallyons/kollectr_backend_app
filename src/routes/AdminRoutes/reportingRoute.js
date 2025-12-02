const express = require("express");
const router = express.Router();
const {
  getDataDownload,
  downloadTripsCSV,
  downloadStopsCSV,
  downloadTripsKML,
  getDashboardKPIs,
  getDashboardChartData,
  getPassengerLoadByStop,
  getRouteLoadOverTime,
  getRoutesForChart,
  getAverageDailyRidershipByRoute,
  getRouteOperationalSpeed,
} = require("../../controllers/reportingController");

router.get("/", getDataDownload);
router.post("/csv/trips", downloadTripsCSV);
router.post("/csv/stops", downloadStopsCSV);
router.post("/kml", downloadTripsKML);

// dashboard
router.get("/dashboard/kpis", getDashboardKPIs);
router.get("/dashboard/chart", getDashboardChartData);

// for charts
router.get("/route-chart/passenger-load-by-stop", getPassengerLoadByStop);
router.get("/route-chart/load-over-time", getRouteLoadOverTime);
router.get("/route-chart/routes", getRoutesForChart);
router.get("/route-chart/ridership-by-route", getAverageDailyRidershipByRoute);
router.get("/route-chart/operational-speed", getRouteOperationalSpeed);

module.exports = router;
