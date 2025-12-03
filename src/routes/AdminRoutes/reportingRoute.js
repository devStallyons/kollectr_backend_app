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
  getRouteBusCrowding,
  getRoutesForBusCrowding,
  exportRouteBusCrowdingCSV,
  getStopBoardingAlighting,
  getRouteSegmentsBph,
  getRoutesForMap,
  exportRouteMapData,
  getStopsForIsochrone,
  calculateTravelTime,
  exportIsochroneData,
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

router.get("/route-chart/route-datatable", getRouteBusCrowding);
router.get("/route-chart/route-datatable/routes", getRoutesForBusCrowding);
router.get("/route-chart/route-datatable/export", exportRouteBusCrowdingCSV);

router.get("/route-chart/map/stops", getStopBoardingAlighting);
router.get("/route-chart/map/segments", getRouteSegmentsBph);
router.get("/route-chart/map/routes", getRoutesForMap);
router.get("/route-chart/map/export", exportRouteMapData);

router.get("/route-chart/isochrone/stops", getStopsForIsochrone);
router.get("/route-chart/isochrone/travel-time", calculateTravelTime);
router.get("/route-chart/isochrone/export", exportIsochroneData);

module.exports = router;
