const Company = require("../models/companyModel");
const VehicleType = require("../models/vehicleTypeModel");
const Trip = require("../models/tripModel");
const TripStops = require("../models/tripStopModel");
const { default: mongoose } = require("mongoose");
const tripStopModel = require("../models/tripStopModel");
const transportRouteModel = require("../models/transportRouteModel");
const {
  generateTripNumber,
  parseTimeToDate,
  generateStopId,
} = require("../utils/generateTripAndStopId");

const getAllQualityAssurances = async (req, res, next) => {
  try {
    const {
      startDate,
      endDate,
      status,
      page = 1,
      limit = 10,
      project_id,
      dateField,
      healthStatus,
    } = req.query;

    // console.log("req.query", req.query);
    let filter = {};

    if (project_id) {
      filter.project_id = new mongoose.Types.ObjectId(project_id);
      filter.isUploaded = true;
    }

    // if (healthStatus && healthStatus !== "all") {
    //   if (healthStatus === "healthy") {
    //     filter.gpsAccuracy = { $lte: 20 };
    //   } else if (healthStatus === "trashed") {
    //     filter.gpsAccuracy = { $gt: 20 };
    //   }
    // }

    if (healthStatus && healthStatus !== "all") {
      if (healthStatus === "healthy") {
        filter.$expr = {
          $lte: [{ $toDouble: "$gpsAccuracy" }, 20],
        };
      } else if (healthStatus === "trashed") {
        filter.$expr = {
          $gt: [{ $toDouble: "$gpsAccuracy" }, 20],
        };
      }
    }

    if (dateField && dateField !== "select") {
      const dateFieldMap = {
        uploaded: "createdAt",
        mapped: "startTime",
      };

      const dbDateField = dateFieldMap[dateField] || "createdAt";

      if (startDate && endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);

        filter[dbDateField] = {
          $gte: start,
          $lte: end,
        };
      } else if (startDate) {
        filter[dbDateField] = { $gte: new Date(startDate) };
      } else if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter[dbDateField] = { $lte: end };
      }
    }

    if (status && status !== "all") {
      filter.status = status;
    }

    const pageNumber = parseInt(page) || 1;
    const pageLimit = parseInt(limit) || 10;
    const skip = (pageNumber - 1) * pageLimit;
    const totalRecords = await Trip.countDocuments(filter);

    const trips = await Trip.find(filter)
      .populate("mapper", "name email")
      .populate("route", "routeName type")
      .populate("company", "name")
      .populate("vehicleType", "type")
      .populate("splitFrom", "tripNumber")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(pageLimit)
      .lean();

    // console.log("trips--->>", trips);

    const formattedTrips = trips.map((trip) => ({
      trip_id: trip._id || "",
      trip_number: trip.tripNumber || "",
      action: trip.status || "",
      state: trip.state || "",
      vehicleReg: trip.licensePlate || "",
      routeDesc: trip.route?.routeName || "",
      dev: "",
      tp: "",
      d: trip.direction || "F",
      company: {
        company_name: trip.company?.name || "",
        id: trip.company?._id || "",
      },
      mapper: {
        name: trip.mapper?.name || "",
        email: trip.mapper?.email || "",
        id: trip.mapper?._id || "",
      },
      vehicleType: {
        type: trip.vehicleType?.type || "",
        id: trip.vehicleType?._id || "",
      },
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
      snapped: trip.Snapped || 0,
      splitFrom: trip.splitFrom?.tripNumber || "-",
    }));

    return res.status(200).json({
      success: true,
      message: "Filtered trips data fetched successfully",
      pagination: {
        page: pageNumber,
        limit: pageLimit,
        totalRecords,
        totalPages: Math.ceil(totalRecords / pageLimit),
      },
      filters: {
        project_id: project_id || "all",
        healthStatus: healthStatus || "all",
        dateField: dateField || "select",
        startDate: startDate || null,
        endDate: endDate || null,
        status: status || "all",
      },
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

    const trips = await Trip.find({ _id: tripId })
      .populate("route", "routeName type code")
      .populate("company", "name")
      .populate("vehicleType", "type")
      .populate("mapper", "name")
      .lean();

    if (!trips || trips.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Trip not found",
      });
    }

    const tripStops = await TripStops.find({ trip: tripId })
      .sort({ stopNumber: 1 })
      .lean();

    if (!tripStops || tripStops.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No stops found for this trip",
      });
    }

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
      // trip: trips,
      trip: {
        company: trips[0].company?.name,
        dateMapped: trips[0].createdAt
          ? new Date(trips[0].createdAt).toISOString()
          : "",
        mapperName: trips[0].mapper?.name || "",
        mapperEmail: trips[0].mapper?.email || "",
        tripNumber: trips[0].tripNumber,
      },
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

const duplicateTrip = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { tripId } = req.params;
    const {
      routeCode,
      startingResidualLoad,
      endingResidualLoad,
      stops,
      addNoise,
    } = req.body;

    // Find original trip
    const originalTrip = await Trip.findById(tripId)
      .populate("route")
      .session(session);

    if (!originalTrip) {
      await session.abortTransaction();
      return res.status(404).json({
        success: false,
        message: "Original trip not found",
      });
    }

    // Find original stops
    const originalStops = await TripStops.find({ trip: tripId })
      .sort({ stopNumber: 1 })
      .session(session);

    // Find route if routeCode is different
    let routeId = originalTrip.route._id;
    if (routeCode && routeCode !== originalTrip.route?.code) {
      const TransportRoute = require("../models/transportRouteModel");
      const route = await transportRouteModel
        .findOne({ code: routeCode })
        .session(session);
      if (route) {
        routeId = route._id;
      }
    }

    // Generate new trip number
    const newTripNumber = await generateTripNumber();

    // Prepare coordinates
    let startCoords =
      originalTrip.startCoordinates?.toObject?.() ||
      originalTrip.startCoordinates;
    let endCoords =
      originalTrip.endCoordinates?.toObject?.() || originalTrip.endCoordinates;

    if (addNoise) {
      startCoords = startCoords;
      endCoords = endCoords;
      // startCoords = addNoiseToCoordinates(startCoords);
      // endCoords = addNoiseToCoordinates(endCoords);
    }

    // Calculate totals from stops if provided
    let totalFare = 0;
    let totalBoard = 0;
    let totalAlight = 0;

    const stopsToUse =
      stops && stops.length > 0
        ? stops
        : originalStops.map((s) => ({
            arrival: s.arriveTime,
            depart: s.departTime,
            board: s.passengersIn,
            alight: s.passengersOut,
            fare: s.fareAmount,
          }));

    stopsToUse.forEach((stop) => {
      totalFare += parseFloat(stop.fare) || 0;
      totalBoard += parseInt(stop.board) || 0;
      totalAlight += parseInt(stop.alight) || 0;
    });

    // Create new trip - same format as original
    const newTripData = {
      tripNumber: newTripNumber,
      project_id: originalTrip.project_id,
      mapper: originalTrip.mapper,
      route: routeId,
      company: originalTrip.company,
      vehicleType: originalTrip.vehicleType,
      licensePlate: originalTrip.licensePlate,
      startTime: originalTrip.startTime,
      endTime: originalTrip.endTime,
      actualDuration: originalTrip.actualDuration,
      startCoordinates: startCoords,
      endCoordinates: endCoords,
      gpsAccuracy: originalTrip.gpsAccuracy,
      duration: originalTrip.duration,
      distance: originalTrip.distance,
      status: "new",
      totalStops: stopsToUse.length,
      currentStop: 0,
      totalPassengersPickedUp: totalBoard,
      totalPassengersDroppedOff: totalAlight,
      finalPassengerCount: totalBoard - totalAlight,
      totalFareCollection: totalFare,
      totalPassengerAtFirstStop: startingResidualLoad
        ? parseInt(startingResidualLoad)
        : originalTrip.totalPassengerAtFirstStop,
      mappingNotes: originalTrip.mappingNotes
        ? `${originalTrip.mappingNotes} (Duplicated from ${originalTrip.tripNumber})`
        : `Duplicated from ${originalTrip.tripNumber}`,
      tripStops: [],
      isUploaded: true,
    };

    const newTrip = new Trip(newTripData);
    await newTrip.save({ session });

    // Create duplicate stops
    const newStopIds = [];
    let cumPassengers = startingResidualLoad
      ? parseInt(startingResidualLoad)
      : originalTrip.totalPassengerAtFirstStop || 0;
    let cumRevenue = 0;

    for (let i = 0; i < stopsToUse.length; i++) {
      const stopData = stopsToUse[i];
      const originalStop = originalStops[i];

      // Parse times
      let arriveTime, departTime;

      if (
        typeof stopData.arrival === "string" &&
        stopData.arrival.includes(":")
      ) {
        // Time string format HH:MM:SS - use original trip's startTime as base
        arriveTime = parseTimeToDate(stopData.arrival, originalTrip.startTime);
        departTime = parseTimeToDate(stopData.depart, originalTrip.startTime);
      } else if (stopData.arrival) {
        arriveTime = new Date(stopData.arrival);
        departTime = new Date(stopData.depart);
      } else if (originalStop) {
        arriveTime = originalStop.arriveTime;
        departTime = originalStop.departTime;
      }

      // Apply individual time adjustments (arrAdd, depAdd in seconds)
      if (stopData.arrAdd && parseInt(stopData.arrAdd) !== 0) {
        arriveTime = new Date(
          arriveTime.getTime() + parseInt(stopData.arrAdd) * 1000
        );
      }
      if (stopData.depAdd && parseInt(stopData.depAdd) !== 0) {
        departTime = new Date(
          departTime.getTime() + parseInt(stopData.depAdd) * 1000
        );
      }

      const board = parseInt(stopData.board) || 0;
      const alight = parseInt(stopData.alight) || 0;
      const fare = parseFloat(stopData.fare) || 0;

      cumPassengers += board - alight;
      cumRevenue += fare;

      // Prepare stop location
      let stopLocation = originalStop?.stopLocation?.toObject?.() ||
        originalStop?.stopLocation || {
          type: "Point",
          coordinates: [0, 0],
        };

      if (addNoise && stopLocation?.coordinates) {
        stopLocation = {
          type: "Point",
          coordinates: stopLocation.coordinates,
          // coordinates: addNoiseToLocation(stopLocation.coordinates),
        };
      }

      const newStopData = {
        stopId: await generateStopId(),
        trip: newTrip._id,
        stopNumber: i + 1,
        stopName: originalStop?.stopName,
        stopTime: arriveTime,
        passengersIn: board,
        passengersOut: alight,
        currentPassengers: cumPassengers,
        fareAmount: fare,
        stopLocation: stopLocation,
        arriveTime: arriveTime,
        departTime: departTime,
        cum_passengers: cumPassengers,
        cum_travel_time: originalStop?.cum_travel_time || 0,
        cum_distance: originalStop?.cum_distance || 0,
        cum_revenue: cumRevenue,
        speed: originalStop?.speed || 0,
        dwellTime: originalStop?.dwellTime || "0",
        distance: originalStop?.distance || 0,
      };

      const newStop = new TripStops(newStopData);
      await newStop.save({ session });
      newStopIds.push(newStop._id);
    }

    // Update trip with stop references
    newTrip.tripStops = newStopIds;
    newTrip.totalStops = newStopIds.length;
    await newTrip.save({ session });

    await session.commitTransaction();

    // Fetch complete trip with populated data
    const duplicatedTrip = await Trip.findById(newTrip._id)
      .populate("route", "code type")
      .populate("tripStops");

    res.status(201).json({
      success: true,
      message: "Trip duplicated successfully",
      data: duplicatedTrip,
    });
  } catch (error) {
    await session.abortTransaction();
    console.error("Error duplicating trip:", error);
    res.status(500).json({
      success: false,
      message: "Failed to duplicate trip",
      error: error.message,
    });
  } finally {
    session.endSession();
  }
};

const trashTrip = async (req, res) => {
  try {
    const { tripId } = req.params;

    const trip = await Trip.findByIdAndUpdate(
      tripId,
      { gpsAccuracy: "25" },
      { new: true }
    );

    if (!trip) {
      return res.status(404).json({
        success: false,
        message: "Trip not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Trip moved to trash successfully",
      data: trip,
    });
  } catch (error) {
    console.error("Error trashing trip:", error);
    res.status(500).json({
      success: false,
      message: "Failed to trash trip",
      error: error.message,
    });
  }
};

const getStopsForSplit = async (req, res) => {
  try {
    const { tripId } = req.params;
    const { page = 1, limit = 10, search = "" } = req.query;

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const trip = await Trip.findById({ _id: tripId })
      .populate("route", "code type")
      .populate("mapper", "name email");

    if (!trip) {
      return res.status(404).json({
        success: false,
        message: "Trip not found",
      });
    }

    let searchQuery = { trip: tripId };
    if (search) {
      searchQuery.stopId = { $regex: search, $options: "i" };
    }

    const totalStops = await TripStops.countDocuments(searchQuery);

    const stops = await TripStops.find(searchQuery)
      .sort({ stopNumber: 1 })
      .skip(skip)
      .limit(limitNum);

    const allStops = await TripStops.find({ trip: tripId }).sort({
      stopNumber: 1,
    });

    const formattedStops = stops.map((stop) => ({
      id: stop._id,
      stopId: stop.stopId,
      stopNumber: stop.stopNumber,
      stopName: stop.stopName || "N/A",
      on: stop.passengersIn,
      off: stop.passengersOut,
      dist: stop.distance || 0,
      cumDist: stop.cum_distance || 0,
      coordinates: stop.stopLocation?.coordinates || [0, 0],
      arriveTime: stop.arriveTime,
      departTime: stop.departTime,
    }));

    const pathCoordinates = allStops
      .map((stop) => {
        if (stop.stopLocation?.coordinates) {
          return [
            stop.stopLocation.coordinates[1],
            stop.stopLocation.coordinates[0],
          ];
        }
        return null;
      })
      .filter((coord) => coord !== null);

    const allStopsForMap = allStops.map((stop) => ({
      id: stop._id,
      stopId: stop.stopId,
      stopNumber: stop.stopNumber,
      on: stop.passengersIn,
      off: stop.passengersOut,
      coordinates: stop.stopLocation?.coordinates || [0, 0],
    }));

    const totalPages = Math.ceil(totalStops / limitNum);

    res.status(200).json({
      success: true,
      message: "Stops fetched successfully",
      data: {
        trip: {
          id: trip._id,
          tripNumber: trip.tripNumber,
          routeCode: trip.route?.code,
          routeType: trip.route?.type,
          totalStops: trip.totalStops,
        },
        stops: formattedStops,
        allStopsForMap,
        pathCoordinates,
        pagination: {
          currentPage: pageNum,
          totalPages,
          totalItems: totalStops,
          itemsPerPage: limitNum,
          hasNextPage: pageNum < totalPages,
          hasPrevPage: pageNum > 1,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching stops for split:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch stops",
      error: error.message,
    });
  }
};

const splitTrip = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { tripId } = req.params;
    const { stopId, distance = 100 } = req.body;

    // Find original trip
    const originalTrip = await Trip.findById(tripId)
      .populate("route")
      .session(session);

    if (!originalTrip) {
      await session.abortTransaction();
      return res.status(404).json({
        success: false,
        message: "Original trip not found",
      });
    }

    // Find all stops for this trip
    const allStops = await TripStops.find({ trip: tripId })
      .sort({ stopNumber: 1 })
      .session(session);

    if (allStops.length < 2) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: "Trip must have at least 2 stops to split",
      });
    }

    // Find the split point index
    const splitIndex = allStops.findIndex(
      (stop) => stop._id.toString() === stopId || stop.stopId === stopId
    );

    if (splitIndex === -1) {
      await session.abortTransaction();
      return res.status(404).json({
        success: false,
        message: "Stop not found in this trip",
      });
    }

    if (splitIndex === 0) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: "Cannot split at the first stop",
      });
    }

    if (splitIndex === allStops.length - 1) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: "Cannot split at the last stop",
      });
    }

    // Split stops into two groups
    // Trip 1: stops from 0 to splitIndex (inclusive)
    // Trip 2: stops from splitIndex to end (splitIndex stop is shared as start of trip 2)
    const trip1Stops = allStops.slice(0, splitIndex + 1);
    const trip2Stops = allStops.slice(splitIndex);

    // Calculate totals for trip 1
    let trip1TotalBoard = 0;
    let trip1TotalAlight = 0;
    let trip1TotalFare = 0;
    trip1Stops.forEach((stop) => {
      trip1TotalBoard += stop.passengersIn || 0;
      trip1TotalAlight += stop.passengersOut || 0;
      trip1TotalFare += stop.fareAmount || 0;
    });

    // Calculate totals for trip 2
    let trip2TotalBoard = 0;
    let trip2TotalAlight = 0;
    let trip2TotalFare = 0;
    trip2Stops.forEach((stop) => {
      trip2TotalBoard += stop.passengersIn || 0;
      trip2TotalAlight += stop.passengersOut || 0;
      trip2TotalFare += stop.fareAmount || 0;
    });

    // Generate new trip numbers
    const trip1Number = await generateTripNumber();
    const trip2Number = await generateTripNumber();

    // Get coordinates for trip boundaries
    const trip1StartCoords = trip1Stops[0]?.stopLocation?.coordinates;
    const trip1EndCoords =
      trip1Stops[trip1Stops.length - 1]?.stopLocation?.coordinates;
    const trip2StartCoords = trip2Stops[0]?.stopLocation?.coordinates;
    const trip2EndCoords =
      trip2Stops[trip2Stops.length - 1]?.stopLocation?.coordinates;

    // Create Trip 1
    const newTrip1 = new Trip({
      tripNumber: trip1Number,
      project_id: originalTrip.project_id,
      mapper: originalTrip.mapper,
      route: originalTrip.route._id,
      company: originalTrip.company,
      vehicleType: originalTrip.vehicleType,
      licensePlate: originalTrip.licensePlate,
      startTime: trip1Stops[0]?.arriveTime || originalTrip.startTime,
      endTime: trip1Stops[trip1Stops.length - 1]?.departTime,
      actualDuration: originalTrip.actualDuration,
      startCoordinates: trip1StartCoords
        ? {
            latitude: trip1StartCoords[1],
            longitude: trip1StartCoords[0],
          }
        : originalTrip.startCoordinates,
      endCoordinates: trip1EndCoords
        ? {
            latitude: trip1EndCoords[1],
            longitude: trip1EndCoords[0],
          }
        : originalTrip.endCoordinates,
      gpsAccuracy: originalTrip.gpsAccuracy,
      duration: 0,
      distance: 0,
      status: "completed",
      totalStops: trip1Stops.length,
      currentStop: trip1Stops.length,
      totalPassengersPickedUp: trip1TotalBoard,
      totalPassengersDroppedOff: trip1TotalAlight,
      finalPassengerCount: trip1TotalBoard - trip1TotalAlight,
      totalFareCollection: trip1TotalFare,
      totalPassengerAtFirstStop: originalTrip.totalPassengerAtFirstStop,
      mappingNotes: `Split from ${originalTrip.tripNumber} (Part 1)`,
      splitFrom: originalTrip._id,
      tripStops: [],
      isUploaded: true,
    });

    await newTrip1.save({ session });

    // Create Trip 2
    const newTrip2 = new Trip({
      tripNumber: trip2Number,
      project_id: originalTrip.project_id,
      mapper: originalTrip.mapper,
      route: originalTrip.route._id,
      company: originalTrip.company,
      vehicleType: originalTrip.vehicleType,
      licensePlate: originalTrip.licensePlate,
      startTime: trip2Stops[0]?.arriveTime,
      endTime:
        trip2Stops[trip2Stops.length - 1]?.departTime || originalTrip.endTime,
      actualDuration: originalTrip.actualDuration,
      startCoordinates: trip2StartCoords
        ? {
            latitude: trip2StartCoords[1],
            longitude: trip2StartCoords[0],
          }
        : originalTrip.startCoordinates,
      endCoordinates: trip2EndCoords
        ? {
            latitude: trip2EndCoords[1],
            longitude: trip2EndCoords[0],
          }
        : originalTrip.endCoordinates,
      gpsAccuracy: originalTrip.gpsAccuracy,
      duration: 0,
      distance: 0,
      status: "completed",
      totalStops: trip2Stops.length,
      currentStop: trip2Stops.length,
      totalPassengersPickedUp: trip2TotalBoard,
      totalPassengersDroppedOff: trip2TotalAlight,
      finalPassengerCount: trip2TotalBoard - trip2TotalAlight,
      totalFareCollection: trip2TotalFare,
      totalPassengerAtFirstStop: trip1TotalBoard - trip1TotalAlight, // Remaining passengers from trip 1
      mappingNotes: `Split from ${originalTrip.tripNumber} (Part 2)`,
      splitFrom: originalTrip._id,
      tripStops: [],
      isUploaded: true,
    });

    await newTrip2.save({ session });

    // Create new stops for Trip 1
    const trip1StopIds = [];
    let cumPassengers1 = originalTrip.totalPassengerAtFirstStop || 0;
    let cumRevenue1 = 0;

    for (let i = 0; i < trip1Stops.length; i++) {
      const originalStop = trip1Stops[i];
      cumPassengers1 +=
        (originalStop.passengersIn || 0) - (originalStop.passengersOut || 0);
      cumRevenue1 += originalStop.fareAmount || 0;

      const newStop = new TripStops({
        stopId: await generateStopId(i + 1),
        trip: newTrip1._id,
        stopNumber: i + 1,
        stopName: originalStop.stopName,
        stopTime: originalStop.stopTime,
        passengersIn: originalStop.passengersIn,
        passengersOut: originalStop.passengersOut,
        currentPassengers: cumPassengers1,
        fareAmount: originalStop.fareAmount,
        stopLocation: originalStop.stopLocation,
        arriveTime: originalStop.arriveTime,
        departTime: originalStop.departTime,
        cum_passengers: cumPassengers1,
        cum_travel_time: originalStop.cum_travel_time,
        cum_distance: originalStop.cum_distance,
        cum_revenue: cumRevenue1,
        speed: originalStop.speed,
        dwellTime: originalStop.dwellTime,
        distance: originalStop.distance,
      });

      await newStop.save({ session });
      trip1StopIds.push(newStop._id);
    }

    const trip2StopIds = [];
    let cumPassengers2 = cumPassengers1;
    let cumRevenue2 = 0;

    for (let i = 0; i < trip2Stops.length; i++) {
      const originalStop = trip2Stops[i];

      if (i === 0) {
        cumPassengers2 = cumPassengers1;
      } else {
        cumPassengers2 +=
          (originalStop.passengersIn || 0) - (originalStop.passengersOut || 0);
      }
      cumRevenue2 += originalStop.fareAmount || 0;

      const newStop = new TripStops({
        stopId: await generateStopId(i + 100),
        trip: newTrip2._id,
        stopNumber: i + 1,
        stopName: originalStop.stopName,
        stopTime: originalStop.stopTime,
        passengersIn: i === 0 ? 0 : originalStop.passengersIn,
        passengersOut: originalStop.passengersOut,
        currentPassengers: cumPassengers2,
        fareAmount: originalStop.fareAmount,
        stopLocation: originalStop.stopLocation,
        arriveTime: originalStop.arriveTime,
        departTime: originalStop.departTime,
        cum_passengers: cumPassengers2,
        cum_travel_time: originalStop.cum_travel_time,
        cum_distance: originalStop.cum_distance,
        cum_revenue: cumRevenue2,
        speed: originalStop.speed,
        dwellTime: originalStop.dwellTime,
        distance: originalStop.distance,
      });

      await newStop.save({ session });
      trip2StopIds.push(newStop._id);
    }

    // Update trips with stop references
    newTrip1.tripStops = trip1StopIds;
    newTrip2.tripStops = trip2StopIds;
    await newTrip1.save({ session });
    await newTrip2.save({ session });

    // Mark original trip as split (move to trash by setting gpsAccuracy > 20)
    // originalTrip.gpsAccuracy = "25";
    originalTrip.isUploaded = true;
    originalTrip.mappingNotes = `${
      originalTrip.mappingNotes || ""
    } [Split into ${trip1Number} and ${trip2Number}]`;
    await originalTrip.save({ session });

    await session.commitTransaction();

    res.status(201).json({
      success: true,
      message: `Trip with id ${originalTrip.tripNumber} was split into new trips with id ${trip1Number} and id ${trip2Number}.`,
      data: {
        originalTripId: originalTrip._id,
        originalTripNumber: originalTrip.tripNumber,
        trip1: {
          id: newTrip1._id,
          tripNumber: trip1Number,
          totalStops: trip1StopIds.length,
        },
        trip2: {
          id: newTrip2._id,
          tripNumber: trip2Number,
          totalStops: trip2StopIds.length,
        },
      },
    });
  } catch (error) {
    await session.abortTransaction();
    console.error("Error splitting trip:", error);
    res.status(500).json({
      success: false,
      message: "Failed to split trip",
      error: error.message,
    });
  } finally {
    session.endSession();
  }
};

const getStopsForSnap = async (req, res) => {
  try {
    const { tripId } = req.params;

    const trip = await Trip.findById(tripId)
      .populate("route", "code type")
      .populate("mapper", "name email");

    if (!trip) {
      return res.status(404).json({
        success: false,
        message: "Trip not found",
      });
    }

    const allStops = await TripStops.find({ trip: tripId }).sort({
      stopNumber: 1,
    });

    if (allStops.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No stops found for this trip",
      });
    }

    const originalCoordinates = allStops
      .filter((stop) => stop.stopLocation?.coordinates?.length === 2)
      .map((stop) => ({
        lng: stop.stopLocation.coordinates[0],
        lat: stop.stopLocation.coordinates[1],
      }));

    if (originalCoordinates.length < 2) {
      return res.status(400).json({
        success: false,
        message: "Need at least 2 stops with valid coordinates for snapping",
      });
    }

    let snappedCoordinates = [];

    try {
      const coordString = originalCoordinates
        .map((c) => `${c.lng},${c.lat}`)
        .join(";");

      const osrmUrl = `https://router.project-osrm.org/match/v1/driving/${coordString}?overview=full&geometries=geojson&radiuses=${originalCoordinates
        .map(() => "50")
        .join(";")}`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const osrmResponse = await fetch(osrmUrl, {
        method: "GET",
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!osrmResponse.ok) {
        throw new Error(
          `OSRM request failed with status ${osrmResponse.status}`
        );
      }

      const osrmData = await osrmResponse.json();

      if (osrmData.code === "Ok" && osrmData.tracepoints) {
        snappedCoordinates = osrmData.tracepoints.map((tp, index) => {
          if (tp !== null) {
            return {
              lng: tp.location[0],
              lat: tp.location[1],
            };
          }
          return originalCoordinates[index];
        });
      }
    } catch (osrmError) {
      console.error("OSRM Error:", osrmError.message);
      snappedCoordinates = originalCoordinates;
    }
    if (snappedCoordinates.length === 0) {
      snappedCoordinates = originalCoordinates;
    }

    const stopsData = allStops.map((stop, index) => {
      const originalCoord = stop.stopLocation?.coordinates || [0, 0];
      const snappedCoord = snappedCoordinates[index] || {
        lng: originalCoord[0],
        lat: originalCoord[1],
      };

      return {
        id: stop._id,
        stopId: stop.stopId,
        stopNumber: stop.stopNumber,
        stopName: stop.stopName || "N/A",
        on: stop.passengersIn || 0,
        off: stop.passengersOut || 0,
        originalCoordinates: {
          lat: originalCoord[1],
          lng: originalCoord[0],
        },
        snappedCoordinates: {
          lat: snappedCoord.lat,
          lng: snappedCoord.lng,
        },
        arriveTime: stop.arriveTime,
        departTime: stop.departTime,
      };
    });

    const originalPath = originalCoordinates.map((c) => [c.lat, c.lng]);
    const snappedPath = snappedCoordinates.map((c) => [c.lat, c.lng]);

    const hasChanges = stopsData.some(
      (stop) =>
        stop.originalCoordinates.lat !== stop.snappedCoordinates.lat ||
        stop.originalCoordinates.lng !== stop.snappedCoordinates.lng
    );

    res.status(200).json({
      success: true,
      message: "Snap data fetched successfully",
      data: {
        trip: {
          id: trip._id,
          tripNumber: trip.tripNumber,
          routeCode: trip.route?.code,
          routeType: trip.route?.type,
          totalStops: allStops.length,
        },
        stops: stopsData,
        originalPath,
        snappedPath,
        hasChanges,
      },
    });
  } catch (error) {
    console.error("Error fetching snap data:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch snap data",
      error: error.message,
    });
  }
};

const applySnapToRoad = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  // console.log("applySnapToRoad");

  try {
    const { tripId } = req.params;
    const { stops } = req.body;

    if (!stops || !Array.isArray(stops) || stops.length === 0) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: "Stops data is required",
      });
    }

    const trip = await Trip.findById(tripId).session(session);

    if (!trip) {
      await session.abortTransaction();
      return res.status(404).json({
        success: false,
        message: "Trip not found",
      });
    }

    let updatedCount = 0;

    for (const stopData of stops) {
      const { id, originalCoordinates, snappedCoordinates } = stopData;

      if (
        !id ||
        !snappedCoordinates ||
        !snappedCoordinates.lat ||
        !snappedCoordinates.lng
      ) {
        continue;
      }

      const existingStop = await TripStops.findById(id).session(session);

      if (!existingStop) {
        continue;
      }

      const updateData = {
        "stopLocation.coordinates": [
          snappedCoordinates.lng,
          snappedCoordinates.lat,
        ],
        snappedToRoad: true,
        snappedAt: new Date(),
      };

      if (!existingStop.originalLocation?.coordinates) {
        updateData["originalLocation.type"] = "Point";
        updateData["originalLocation.coordinates"] = [
          originalCoordinates.lng,
          originalCoordinates.lat,
        ];
      }

      const result = await TripStops.findByIdAndUpdate(
        id,
        { $set: updateData },
        { session, new: true }
      );

      if (result) {
        updatedCount++;
      }
    }

    if (stops.length > 0) {
      const firstStop = stops[0];
      const lastStop = stops[stops.length - 1];

      if (firstStop?.snappedCoordinates) {
        trip.startCoordinates = {
          latitude: firstStop.snappedCoordinates.lat,
          longitude: firstStop.snappedCoordinates.lng,
        };
      }

      if (lastStop?.snappedCoordinates) {
        trip.endCoordinates = {
          latitude: lastStop.snappedCoordinates.lat,
          longitude: lastStop.snappedCoordinates.lng,
        };
      }

      trip.mappingNotes = `${
        trip.mappingNotes || ""
      } [Snapped to road on ${new Date().toISOString()}]`;
      trip.Snapped = (trip.Snapped || 0) + 1;

      await trip.save({ session });
    }

    await session.commitTransaction();

    res.status(200).json({
      success: true,
      message: `Successfully snapped ${updatedCount} stops to road`,
      data: {
        tripId: trip._id,
        tripNumber: trip.tripNumber,
        updatedStops: updatedCount,
        totalSnapped: trip.Snapped,
      },
    });
  } catch (error) {
    await session.abortTransaction();
    console.error("Error applying snap to road:", error);
    res.status(500).json({
      success: false,
      message: "Failed to apply snap to road",
      error: error.message,
    });
  } finally {
    session.endSession();
  }
};

const getDamagedTripData = async (req, res) => {
  try {
    const { tripId } = req.params;

    const damagedTrip = await Trip.findById(tripId)
      .populate("route", "code type direction")
      .lean();

    if (!damagedTrip) {
      return res.status(404).json({
        success: false,
        message: "Trip not found",
      });
    }

    const damagedStops = await TripStops.find({ trip: tripId })
      .sort({ stopNumber: 1 })
      .lean();

    const damagedPath = damagedStops
      .filter((s) => s.stopLocation?.coordinates?.length === 2)
      .map((s) => [
        s.stopLocation.coordinates[1],
        s.stopLocation.coordinates[0],
      ]);

    // Find healthy matches - same route, different trip
    const healthyTrips = await Trip.find({
      _id: { $ne: tripId },
      route: damagedTrip.route?._id || damagedTrip.route,
      project_id: damagedTrip.project_id,
      // Add criteria for "healthy" trips
    })
      .populate("route", "code type direction")
      .limit(10)
      .lean();

    // Categorize healthy matches
    const categorizedMatches = {
      sameDaySameTimeSlot: [],
      sameDaySameTimeSlotType: [],
      sameDayDifferentTimeSlot: [],
      differentDaySameTimeSlot: [],
      differentDaySameTimeSlotType: [],
      differentDayDifferentTimeSlot: [],
    };

    const damagedDate = new Date(damagedTrip.startTime);
    const damagedDayOfWeek = damagedDate.getDay();
    const damagedHour = damagedDate.getHours();

    for (const trip of healthyTrips) {
      const tripDate = new Date(trip.startTime);
      const tripDayOfWeek = tripDate.getDay();
      const tripHour = tripDate.getHours();

      const sameDay = tripDayOfWeek === damagedDayOfWeek;
      const sameTimeSlot = tripHour === damagedHour;
      const sameTimeSlotType =
        (tripHour >= 6 &&
          tripHour < 12 &&
          damagedHour >= 6 &&
          damagedHour < 12) ||
        (tripHour >= 12 &&
          tripHour < 18 &&
          damagedHour >= 12 &&
          damagedHour < 18) ||
        (tripHour >= 18 &&
          tripHour < 24 &&
          damagedHour >= 18 &&
          damagedHour < 24);

      const matchData = {
        id: trip._id,
        tripNumber: trip.tripNumber,
        startTime: trip.startTime,
        routeCode: trip.route?.code,
      };

      if (sameDay && sameTimeSlot) {
        categorizedMatches.sameDaySameTimeSlot.push(matchData);
      } else if (sameDay && sameTimeSlotType) {
        categorizedMatches.sameDaySameTimeSlotType.push(matchData);
      } else if (sameDay && !sameTimeSlot) {
        categorizedMatches.sameDayDifferentTimeSlot.push(matchData);
      } else if (!sameDay && sameTimeSlot) {
        categorizedMatches.differentDaySameTimeSlot.push(matchData);
      } else if (!sameDay && sameTimeSlotType) {
        categorizedMatches.differentDaySameTimeSlotType.push(matchData);
      } else {
        categorizedMatches.differentDayDifferentTimeSlot.push(matchData);
      }
    }

    res.status(200).json({
      success: true,
      message: "Damaged trip data fetched successfully",
      data: {
        damagedTrip: {
          id: damagedTrip._id,
          tripNumber: damagedTrip.tripNumber,
          routeCode: damagedTrip.route?.code,
          startTime: damagedTrip.startTime,
          totalStops: damagedStops.length,
        },
        damagedPath,
        damagedStops: damagedStops.map((s) => ({
          id: s._id,
          stopId: s.stopId,
          stopNumber: s.stopNumber,
          stopName: s.stopName,
          coordinates: {
            lat: s.stopLocation?.coordinates?.[1],
            lng: s.stopLocation?.coordinates?.[0],
          },
        })),
        healthyMatches: categorizedMatches,
      },
    });
  } catch (error) {
    console.error("Error fetching damaged trip data:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch damaged trip data",
      error: error.message,
    });
  }
};

// Get healthy trip path for preview
const getHealthyTripPath = async (req, res) => {
  try {
    const { healthyTripId } = req.params;
    const { addNoise } = req.query;

    const healthyStops = await TripStops.find({ trip: healthyTripId })
      .sort({ stopNumber: 1 })
      .lean();

    if (healthyStops.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No stops found for healthy trip",
      });
    }

    let healthyPath = healthyStops
      .filter((s) => s.stopLocation?.coordinates?.length === 2)
      .map((s) => {
        let lat = s.stopLocation.coordinates[1];
        let lng = s.stopLocation.coordinates[0];

        // Add noise if requested (small random variations)
        if (addNoise === "true") {
          lat += (Math.random() - 0.5) * 0.0001; // ~5-10 meters variation
          lng += (Math.random() - 0.5) * 0.0001;
        }

        return [lat, lng];
      });

    const stopsData = healthyStops.map((s, index) => {
      let lat = s.stopLocation?.coordinates?.[1] || 0;
      let lng = s.stopLocation?.coordinates?.[0] || 0;

      if (addNoise === "true") {
        lat += (Math.random() - 0.5) * 0.0001;
        lng += (Math.random() - 0.5) * 0.0001;
      }

      return {
        id: s._id,
        stopId: s.stopId,
        stopNumber: s.stopNumber,
        stopName: s.stopName,
        coordinates: { lat, lng },
      };
    });

    res.status(200).json({
      success: true,
      message: "Healthy trip path fetched successfully",
      data: {
        healthyPath,
        stopsData,
      },
    });
  } catch (error) {
    console.error("Error fetching healthy trip path:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch healthy trip path",
      error: error.message,
    });
  }
};

// Apply GPS fix using healthy trip
const applyGPSFix = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { tripId } = req.params;
    const { healthyTripId, addNoise = false } = req.body;

    const damagedTrip = await Trip.findById(tripId).session(session);
    if (!damagedTrip) {
      await session.abortTransaction();
      return res.status(404).json({
        success: false,
        message: "Damaged trip not found",
      });
    }

    const healthyStops = await TripStops.find({ trip: healthyTripId })
      .sort({ stopNumber: 1 })
      .session(session)
      .lean();

    if (healthyStops.length === 0) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: "No stops found in healthy trip",
      });
    }

    const damagedStops = await TripStops.find({ trip: tripId })
      .sort({ stopNumber: 1 })
      .session(session);

    let updatedCount = 0;

    for (let i = 0; i < damagedStops.length; i++) {
      const damagedStop = damagedStops[i];
      const healthyStop =
        healthyStops[i] || healthyStops[healthyStops.length - 1];

      if (!healthyStop?.stopLocation?.coordinates) continue;

      let newLat = healthyStop.stopLocation.coordinates[1];
      let newLng = healthyStop.stopLocation.coordinates[0];

      if (addNoise) {
        newLat += (Math.random() - 0.5) * 0.0001;
        newLng += (Math.random() - 0.5) * 0.0001;
      }

      // Save original location if not already saved
      const updateData = {
        "stopLocation.coordinates": [newLng, newLat],
        snappedToRoad: true,
        snappedAt: new Date(),
      };

      if (!damagedStop.originalLocation?.coordinates) {
        updateData["originalLocation.type"] = "Point";
        updateData["originalLocation.coordinates"] =
          damagedStop.stopLocation.coordinates;
      }

      await TripStops.findByIdAndUpdate(
        damagedStop._id,
        { $set: updateData },
        { session }
      );

      updatedCount++;
    }

    // Update trip coordinates
    if (healthyStops.length > 0) {
      const firstHealthy = healthyStops[0];
      const lastHealthy = healthyStops[healthyStops.length - 1];

      damagedTrip.startCoordinates = {
        latitude: firstHealthy.stopLocation.coordinates[1],
        longitude: firstHealthy.stopLocation.coordinates[0],
      };

      damagedTrip.endCoordinates = {
        latitude: lastHealthy.stopLocation.coordinates[1],
        longitude: lastHealthy.stopLocation.coordinates[0],
      };

      damagedTrip.mappingNotes = `${
        damagedTrip.mappingNotes || ""
      } [GPS fixed using trip ${healthyTripId} on ${new Date().toISOString()}]`;
      await damagedTrip.save({ session });
    }

    await session.commitTransaction();

    res.status(200).json({
      success: true,
      message: `Successfully fixed ${updatedCount} stops using healthy trip`,
      data: {
        tripId: damagedTrip._id,
        tripNumber: damagedTrip.tripNumber,
        updatedStops: updatedCount,
        healthyTripUsed: healthyTripId,
      },
    });
  } catch (error) {
    await session.abortTransaction();
    console.error("Error applying GPS fix:", error);
    res.status(500).json({
      success: false,
      message: "Failed to apply GPS fix",
      error: error.message,
    });
  } finally {
    session.endSession();
  }
};

// Apply GPS fix using uploaded KML
const applyKMLFix = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { tripId } = req.params;
    const { coordinates, addNoise = false } = req.body;

    if (
      !coordinates ||
      !Array.isArray(coordinates) ||
      coordinates.length === 0
    ) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: "Coordinates array is required",
      });
    }

    const trip = await Trip.findById(tripId).session(session);
    if (!trip) {
      await session.abortTransaction();
      return res.status(404).json({
        success: false,
        message: "Trip not found",
      });
    }

    const stops = await TripStops.find({ trip: tripId })
      .sort({ stopNumber: 1 })
      .session(session);

    let updatedCount = 0;

    for (let i = 0; i < stops.length; i++) {
      const stop = stops[i];
      const coordIndex = Math.min(i, coordinates.length - 1);
      const newCoord = coordinates[coordIndex];

      if (!newCoord || !newCoord.lat || !newCoord.lng) continue;

      let newLat = newCoord.lat;
      let newLng = newCoord.lng;

      if (addNoise) {
        newLat += (Math.random() - 0.5) * 0.0001;
        newLng += (Math.random() - 0.5) * 0.0001;
      }

      const updateData = {
        "stopLocation.coordinates": [newLng, newLat],
        snappedToRoad: true,
        snappedAt: new Date(),
      };

      if (!stop.originalLocation?.coordinates) {
        updateData["originalLocation.type"] = "Point";
        updateData["originalLocation.coordinates"] =
          stop.stopLocation.coordinates;
      }

      await TripStops.findByIdAndUpdate(
        stop._id,
        { $set: updateData },
        { session }
      );

      updatedCount++;
    }

    // Update trip coordinates
    if (coordinates.length > 0) {
      trip.startCoordinates = {
        latitude: coordinates[0].lat,
        longitude: coordinates[0].lng,
      };

      trip.endCoordinates = {
        latitude: coordinates[coordinates.length - 1].lat,
        longitude: coordinates[coordinates.length - 1].lng,
      };

      trip.mappingNotes = `${
        trip.mappingNotes || ""
      } [GPS fixed using KML on ${new Date().toISOString()}]`;
      await trip.save({ session });
    }

    await session.commitTransaction();

    res.status(200).json({
      success: true,
      message: `Successfully fixed ${updatedCount} stops using KML`,
      data: {
        tripId: trip._id,
        tripNumber: trip.tripNumber,
        updatedStops: updatedCount,
      },
    });
  } catch (error) {
    await session.abortTransaction();
    console.error("Error applying KML fix:", error);
    res.status(500).json({
      success: false,
      message: "Failed to apply KML fix",
      error: error.message,
    });
  } finally {
    session.endSession();
  }
};

// Download damaged trip as KML
const downloadDamagedKML = async (req, res) => {
  try {
    const { tripId } = req.params;

    const trip = await Trip.findById(tripId).populate("route", "code").lean();
    if (!trip) {
      return res.status(404).json({
        success: false,
        message: "Trip not found",
      });
    }

    const stops = await TripStops.find({ trip: tripId })
      .sort({ stopNumber: 1 })
      .lean();

    const coordinates = stops
      .filter((s) => s.stopLocation?.coordinates?.length === 2)
      .map(
        (s) =>
          `${s.stopLocation.coordinates[0]},${s.stopLocation.coordinates[1]},0`
      )
      .join(" ");

    const kmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>Damaged Trip - ${trip.tripNumber}</name>
    <description>Route: ${trip.route?.code || "N/A"}</description>
    <Style id="damagedStyle">
      <LineStyle>
        <color>ff0000ff</color>
        <width>4</width>
      </LineStyle>
      <IconStyle>
        <color>ff0000ff</color>
        <Icon>
          <href>http://maps.google.com/mapfiles/kml/paddle/red-circle.png</href>
        </Icon>
      </IconStyle>
    </Style>
    <Placemark>
      <name>${trip.tripNumber}</name>
      <styleUrl>#damagedStyle</styleUrl>
      <LineString>
        <coordinates>${coordinates}</coordinates>
      </LineString>
    </Placemark>
    ${stops
      .filter((s) => s.stopLocation?.coordinates?.length === 2)
      .map(
        (s) => `
    <Placemark>
      <name>Stop ${s.stopNumber}</name>
      <description>${s.stopName || "Stop"}</description>
      <styleUrl>#damagedStyle</styleUrl>
      <Point>
        <coordinates>${s.stopLocation.coordinates[0]},${
          s.stopLocation.coordinates[1]
        },0</coordinates>
      </Point>
    </Placemark>`
      )
      .join("")}
  </Document>
</kml>`;

    res.setHeader("Content-Type", "application/vnd.google-earth.kml+xml");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=damaged_trip_${trip.tripNumber}_${Date.now()}.kml`
    );
    res.status(200).send(kmlContent);
  } catch (error) {
    console.error("Error downloading KML:", error);
    res.status(500).json({
      success: false,
      message: "Failed to download KML",
      error: error.message,
    });
  }
};
// for show gps
const getTripVisualizationData = async (req, res) => {
  try {
    const { tripId } = req.params;

    const trip = await Trip.findById(tripId)
      .populate("route", "code type direction")
      .lean();

    if (!trip) {
      return res.status(404).json({
        success: false,
        message: "Trip not found",
      });
    }

    const stops = await TripStops.find({ trip: tripId })
      .sort({ stopNumber: 1 })
      .lean();

    // Current path (current stopLocation)
    const currentPath = stops
      .filter((s) => s.stopLocation?.coordinates?.length === 2)
      .map((s) => [
        s.stopLocation.coordinates[1],
        s.stopLocation.coordinates[0],
      ]);

    // Original path (originalLocation if exists, otherwise same as current)
    const originalPath = stops
      .filter((s) => s.stopLocation?.coordinates?.length === 2)
      .map((s) => {
        if (s.originalLocation?.coordinates?.length === 2) {
          return [
            s.originalLocation.coordinates[1],
            s.originalLocation.coordinates[0],
          ];
        }
        return [s.stopLocation.coordinates[1], s.stopLocation.coordinates[0]];
      });

    // Check if trip has been modified (snapped/fixed)
    const hasOriginalData = stops.some(
      (s) => s.originalLocation?.coordinates?.length === 2
    );

    res.status(200).json({
      success: true,
      message: "Trip visualization data fetched successfully",
      data: {
        tripId: trip._id,
        tripNumber: trip.tripNumber,
        routeCode: trip.route?.code,
        totalStops: stops.length,
        hasOriginalData,
        isSnapped: stops.some((s) => s.snappedToRoad),
        originalPath,
        currentPath,
        stops: stops.map((s) => ({
          id: s._id,
          stopId: s.stopId,
          stopNumber: s.stopNumber,
          stopName: s.stopName,
          hasOriginal: !!s.originalLocation?.coordinates?.length,
          snappedToRoad: s.snappedToRoad,
          currentCoordinates: {
            lat: s.stopLocation?.coordinates?.[1],
            lng: s.stopLocation?.coordinates?.[0],
          },
          originalCoordinates:
            s.originalLocation?.coordinates?.length === 2
              ? {
                  lat: s.originalLocation.coordinates[1],
                  lng: s.originalLocation.coordinates[0],
                }
              : null,
        })),
      },
    });
  } catch (error) {
    console.error("Error fetching trip visualization data:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch trip visualization data",
      error: error.message,
    });
  }
};

// Restore original trip (revert snapped/fixed coordinates)
const restoreOriginalTrip = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { tripId } = req.params;

    const trip = await Trip.findById(tripId).session(session);
    if (!trip) {
      await session.abortTransaction();
      return res.status(404).json({
        success: false,
        message: "Trip not found",
      });
    }

    const stops = await TripStops.find({ trip: tripId }).session(session);

    // Check if any stops have original data
    const stopsWithOriginal = stops.filter(
      (s) => s.originalLocation?.coordinates?.length === 2
    );

    if (stopsWithOriginal.length === 0) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: "No original data to restore. Trip has not been modified.",
      });
    }

    let restoredCount = 0;

    for (const stop of stopsWithOriginal) {
      await TripStops.findByIdAndUpdate(
        stop._id,
        {
          $set: {
            "stopLocation.coordinates": stop.originalLocation.coordinates,
            snappedToRoad: false,
            snappedAt: null,
          },
          $unset: {
            originalLocation: 1,
          },
        },
        { session }
      );
      restoredCount++;
    }

    // Restore trip start/end coordinates
    if (stopsWithOriginal.length > 0) {
      const firstStop =
        stopsWithOriginal.find((s) => s.stopNumber === 1) ||
        stopsWithOriginal[0];
      const lastStop = stopsWithOriginal.reduce((max, s) =>
        s.stopNumber > max.stopNumber ? s : max
      );

      if (firstStop.originalLocation?.coordinates) {
        trip.startCoordinates = {
          latitude: firstStop.originalLocation.coordinates[1],
          longitude: firstStop.originalLocation.coordinates[0],
        };
      }

      if (lastStop.originalLocation?.coordinates) {
        trip.endCoordinates = {
          latitude: lastStop.originalLocation.coordinates[1],
          longitude: lastStop.originalLocation.coordinates[0],
        };
      }

      trip.mappingNotes = `${
        trip.mappingNotes || ""
      } [Original coordinates restored on ${new Date().toISOString()}]`;
      await trip.save({ session });
    }

    await session.commitTransaction();

    res.status(200).json({
      success: true,
      message: `Successfully restored ${restoredCount} stops to original coordinates`,
      data: {
        tripId: trip._id,
        tripNumber: trip.tripNumber,
        restoredStops: restoredCount,
      },
    });
  } catch (error) {
    await session.abortTransaction();
    console.error("Error restoring original trip:", error);
    res.status(500).json({
      success: false,
      message: "Failed to restore original trip",
      error: error.message,
    });
  } finally {
    session.endSession();
  }
};

const tripStateUpdate = async (req, res, next) => {
  try {
    const { tripId } = req.params;
    const { state } = req.body;

    console.log("===>>", tripId, state);
    const trip = await Trip.findById(tripId);
    if (!trip) {
      return res.status(404).json({
        success: false,
        message: "Trip not found",
      });
    }
    trip.state = state;
    await trip.save();
    return res.status(200).json({
      success: true,
      message: "Trip state updated successfully",
      data: trip,
    });
  } catch (error) {
    next(error);
  }
};
module.exports = {
  getAllQualityAssurances,
  getTripAllStops,
  duplicateTrip,
  trashTrip,
  getStopsForSplit,
  splitTrip,
  getStopsForSnap,
  applySnapToRoad,
  // gps fix
  getDamagedTripData,
  getHealthyTripPath,
  applyGPSFix,
  applyKMLFix,
  downloadDamagedKML,
  //
  getTripVisualizationData,
  restoreOriginalTrip,

  //
  tripStateUpdate,
};
