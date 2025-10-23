const Company = require("../models/companyModel");
const VehicleType = require("../models/vehicleTypeModel");
const Trip = require("../models/tripModel");
const TripStops = require("../models/tripStopModel");

const getAllQualityAssurances = async (req, res, next) => {
  try {
    const { startDate, endDate, status } = req.query;

    let filter = {};

    if (startDate && endDate) {
      filter.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    } else if (startDate) {
      filter.createdAt = { $gte: new Date(startDate) };
    } else if (endDate) {
      filter.createdAt = { $lte: new Date(endDate) };
    }

    if (status) {
      filter.status = status;
    }

    const trips = await Trip.find(filter)
      .populate("mapper", "name email")
      .populate("route", "routeName type")
      .populate("company", "company_name")
      .populate("vehicleType", "type")
      .lean();

    // console.log("trips", trips[0]);

    const formattedTrips = trips.map((trip) => ({
      id: trip._id,
      trip_id: trip.tripNumber || "",
      action: trip.status || "",
      state: "",
      vehicleReg: trip.licensePlate || "",
      routeDesc: trip.route?.routeName || "",
      dev: "",
      tp: "",
      d: "",
      company: trip.company?.company_name || "",
      mapper: trip.mapper?.name || "",
      startTime: trip.startTime ? new Date(trip.startTime).toISOString() : "",
      travelTime: trip.actualDuration || 0,
      distance: trip.distance || 0,
      revenue: trip.totalFareCollection || 0,
      dateMapped: trip.createdAt ? new Date(trip.createdAt).toISOString() : "",
      discrepancy: "",
      fares: trip.totalFareCollection || 0,
      noOfStops: trip.totalStops || 0,
      pax: trip.finalPassengerCount || 0,
      gpsIssueKm: "",
      gpsIssuePercent: "",
      snapped: "",
      splitFrom: "",
    }));

    return res.status(200).json({
      success: true,
      message: "Filtered trips data fetched successfully",
      data: formattedTrips,
    });
  } catch (error) {
    console.error("Error fetching filtered trip data:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching trip data",
      error: error.message,
    });
  }
};

const getTripAllStops = async (req, res, next) => {
  try {
    const { tripId } = req.params;

    const trip = await Trip.findById(tripId);
    if (!trip) {
      return res.status(404).json({
        success: false,
        message: "Trip not found",
      });
    }

    const tripStops = await TripStops.find({ trip: tripId })
      .sort({ stopNumber: 1 })
      .lean();

    const formattedStops = tripStops.map((stop) => ({
      id: stop._id,
      stop_id: stop.stopId,
      stop_no: stop.stopNumber ?? null,
      stop_name: stop.stop?.name || "N/A",
      pass_board: stop.passengersIn ?? 0,
      pass_alight: stop.passengersOut ?? 0,
      stop_fare: stop.fare ?? 0,
      arrival_time: stop.arriveTime
        ? new Date(stop.arriveTime).toISOString()
        : null,
      departure_time: stop.departTime
        ? new Date(stop.departTime).toISOString()
        : null,
      occ: stop.currentPassengers ?? 0,
      cum_pax: stop.cum_passengers ?? 0,
      cum_travel_time_min: stop.cum_travel_time ?? 0,
      cum_dist_km: stop.cum_distance ?? 0,
      cum_rev: stop.cum_revenue ?? 0,
      speed: stop.speed ?? 0,
    }));

    return res.status(200).json({
      success: true,
      message: "Trip stops fetched successfully",
      data: formattedStops,
    });
  } catch (error) {
    console.error("Error fetching trip stops:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching trip stops",
      error: error.message,
    });
  }
};

module.exports = { getAllQualityAssurances, getTripAllStops };
