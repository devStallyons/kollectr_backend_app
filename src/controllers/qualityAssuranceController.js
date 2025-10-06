const Company = require("../models/companyModel");
const VehicleType = require("../models/vehicleTypeModel");
const Trip = require("../models/tripModel");

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
      .populate("route", "routeName")
      .populate("company", "company_name")
      .populate("vehicleType", "type")
      .lean();

    const formattedTrips = trips.map((trip) => ({
      tripId: trip.tripNumber || "",
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

module.exports = { getAllQualityAssurances };
