const express = require("express");
const router = express.Router();
const {
  getAllTrips,
  createTrip,
  addStop,
  completeTrip,
  getTripDetails,
  updateStop,
  deleteStop,
  cancelTrip,
  updateTrip,
  getUserTrips,
  startTrip,
  deleteTrip,
  updateByFirstStop,
} = require("../../controllers/tripController");

router.get("/", getAllTrips);

router.post("/", createTrip);
router.get("/all", getUserTrips);
router.get("/:tripId", getTripDetails);
router.patch("/:tripId", updateTrip);
router.delete("/:tripId", deleteTrip);

// Trip status management
router.patch("/:tripId/start", startTrip);
router.patch("/:tripId/complete", completeTrip);
router.patch("/:tripId/cancel", cancelTrip);

// Stop management
router.post("/:tripId/stops", addStop);
router.patch("/:tripId/stops/:stopId", updateStop);
router.patch("/:tripId/stops/:stopId/passengers", updateByFirstStop);

router.delete("/:tripId/stops/:stopId", deleteStop);

module.exports = router;
