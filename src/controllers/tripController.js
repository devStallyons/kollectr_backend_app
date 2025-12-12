const Company = require("../models/companyModel");
const TransportRoute = require("../models/transportRouteModel");
const VehicleType = require("../models/vehicleTypeModel");
const Trip = require("../models/tripModel");
const TripStop = require("../models/tripStopModel");
const {
  getGraphHopperRoute,
  haversineDistance,
  haversineDistanceCord,
  getGoogleRoute,
} = require("../utils/distanceTimeCal");
const {
  generateTripNumber,
  generateStopId,
} = require("../utils/generateTripAndStopId");
const { default: mongoose } = require("mongoose");
const userProjectModel = require("../models/userProjectModel");
const PredefinedAssociatingNameModel = require("../models/PredefinedAssociatingNameModel");

const getAllTrips = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    const { project_id } = req.body;

    // console.log("project_id", project_id);

    if (!project_id) {
      return res.status(400).json({
        success: false,
        message: "Project ID is required",
      });
    }

    const hasAccess = await userProjectModel.findOne({
      user_id: userId,
      project_id: project_id,
      status: "active",
    });

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: "You don't have access to this project",
      });
    }

    const companies = await PredefinedAssociatingNameModel.find(
      { project_id: project_id },
      "_id name"
    ).lean();

    const routes = await TransportRoute.find(
      { project_id: project_id },
      "_id code type"
    ).lean();

    const vehicles = await VehicleType.find(
      { project_id: project_id },
      "_id type"
    ).lean();

    const activeTrips = await Trip.find({
      mapper: userId,
      project_id: project_id,
      status: { $in: ["new", "in-progress", "completed"] },
    })
      .populate("route", "code")
      .lean();

    // console.log("activeTrips", companies);

    const transformedCompanies = (companies || []).map((company) => ({
      company_name: company.name,
      _id: company._id,
    }));

    res.status(200).json({
      success: true,
      data: {
        companies: transformedCompanies,
        routes,
        vehicles,
        activeTrips,
      },
    });
  } catch (error) {
    next(error);
  }
};

// const getAllTrips = async (req, res, next) => {
//   try {
//     const companies = await Company.find({}, "_id company_name").lean();
//     const routes = await TransportRoute.find({}, "_id code type").lean();
//     const vehicles = await VehicleType.find({}, "_id type").lean();

//     const activeTrips = await Trip.find({
//       mapper: req.user?.id,
//       status: { $in: ["new", "in-progress", "completed"] },
//     })
//       .populate("route", "code")
//       .lean();

//     res.status(200).json({
//       success: true,
//       data: {
//         companies,
//         routes,
//         vehicles,
//         // activeTrips,
//       },
//     });
//   } catch (error) {
//     next(error);
//   }
// };

// Create new trip
const createTrip = async (req, res, next) => {
  try {
    const { routeId, companyId, vehicleTypeId, mappingNotes, project_id } =
      req.body;

    if (!routeId || !companyId || !vehicleTypeId) {
      return res.status(400).json({
        success: false,
        message: "Route, Company, and Vehicle Type are required",
      });
    }

    const route = await TransportRoute.findById(routeId, "_id code type")
      .populate("forwardStops", "name code coordinates")
      .populate("reverseStops", "name code coordinates")
      .populate("project_id", "_id project_code name")
      .lean();

    // console.log(route);

    if (!route) {
      return res.status(404).json({
        success: false,
        message: "Route not found",
      });
    }

    if (!route.forwardStops || route.forwardStops.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Route must have forward stops",
      });
    }

    const [lat1, lon1] = route.forwardStops[0].coordinates;
    const [lat2, lon2] =
      route.forwardStops[route.forwardStops.length - 1].coordinates;

    if (!lat1 || !lon1 || !lat2 || !lon2) {
      return res.status(400).json({
        success: false,
        message: "Invalid route coordinates",
      });
    }

    // const ghResponse = await getGoogleRoute(lat1, lon1, lat2, lon2);
    // const { distance, duration, gpsAccuracy } = ghResponse || {};
    // const startCoordinates = { latitude: lat1, longitude: lon1 };
    // const endCoordinates = { latitude: lat2, longitude: lon2 };

    // if (!ghResponse || !ghResponse.distance || !ghResponse.duration) {
    //   return res.status(500).json({
    //     success: false,
    //     message: "Unable to fetch route info from GraphHopper",
    //   });
    // }
    const endCoordinates = { latitude: lat2, longitude: lon2 };
    const gpsAccuracy = 0;
    const distance = 0;
    const duration = 0;
    const startCoordinates = { latitude: lat1, longitude: lon1 };
    const tripNumber = await generateTripNumber();
    // Create new trip
    const newTrip = new Trip({
      tripNumber,
      project_id: project_id,
      mapper: req.user.id,
      route: routeId,
      company: companyId,
      vehicleType: vehicleTypeId,
      startTime: new Date(),
      startCoordinates,
      endCoordinates,
      gpsAccuracy,
      distance,
      duration,
      mappingNotes,
      status: "new",
      totalStops: 0,
      currentStop: 0,
      totalPassengersPickedUp: 0,
      totalPassengersDroppedOff: 0,
      finalPassengerCount: 0,
      totalFareCollection: 0,
    });

    await newTrip.save();

    await newTrip.populate([
      { path: "route", select: "code type" },
      { path: "company", select: "company_name" },
      { path: "vehicleType", select: "type" },
      { path: "mapper", select: "name" },
    ]);

    res.status(201).json({
      success: true,
      data: newTrip,
      message: `Trip created successfully`,
    });
  } catch (error) {
    next(error);
  }
};

// upload trips
const uploadTrips = async (req, res, next) => {
  try {
    const {
      routeId,
      companyId,
      vehicleTypeId,
      mappingNotes,
      startCoordinates,
      endCoordinates,
      gpsAccuracy,
      distance,
      duration,
    } = req.body;

    if (!routeId || !companyId || !vehicleTypeId) {
      return res.status(400).json({
        success: false,
        message: "Route, Company, and Vehicle Type are required",
      });
    }

    const route = await TransportRoute.findById(routeId, "_id code type")
      .populate("forwardStops", "name code coordinates")
      .populate("reverseStops", "name code coordinates")
      .lean();

    if (!route) {
      return res.status(404).json({
        success: false,
        message: "Route not found",
      });
    }

    if (!route.forwardStops || route.forwardStops.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Route must have forward stops",
      });
    }

    // Create new trip
    const newTrip = new Trip({
      mapper: req.user.id,
      route: routeId,
      company: companyId,
      vehicleType: vehicleTypeId,
      startTime: new Date(),
      startCoordinates,
      endCoordinates,
      gpsAccuracy,
      distance,
      duration,
      mappingNotes,
      status: "completed",
      totalStops: route.forwardStops.length,
      currentStop: 0,
      totalPassengersPickedUp: 0,
      totalPassengersDroppedOff: 0,
      finalPassengerCount: 0,
      totalFareCollection: 0,
    });

    await newTrip.save();

    await newTrip.populate([
      { path: "route", select: "code type" },
      { path: "company", select: "company_name" },
      { path: "vehicleType", select: "type" },
      { path: "mapper", select: "name" },
    ]);

    res.status(201).json({
      success: true,
      data: newTrip,
      message: `Trip created successfully`,
    });
  } catch (error) {
    next(error);
  }
};
const deleteTrip = async (req, res, next) => {
  try {
    const { tripId } = req.params;

    const trip = await Trip.findById(tripId);
    if (!trip) {
      return res.status(404).json({
        success: false,
        message: "Trip not found",
      });
    }

    // Check user authorization
    // if (trip.mapper.toString() !== req.user.id.toString()) {
    //   return res.status(403).json({
    //     success: false,
    //     message: "Unauthorized to delete this trip",
    //   });
    // }

    // Prevent deleting a completed trip
    // if (trip.status === "completed") {
    //   return res.status(400).json({
    //     success: false,
    //     message: "Cannot delete a completed trip",
    //   });
    // }

    // Delete associated TripStop entries
    await TripStop.deleteMany({ trip: tripId });

    // Delete the trip
    await Trip.findByIdAndDelete(tripId);

    res.json({
      success: true,
      message: "Trip and associated stops deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

// Add stop data

const addStop = async (req, res, next) => {
  try {
    const { tripId } = req.params;
    let { stopsData, totalPassengerAtFirstStop } = req.body;

    const project_id = req?.body?.project_id;

    // console.log(
    //   "totalPassengerAtFirstStop",
    //   req.body,
    //   "tripId",
    //   req?.body?.project_id
    // );
    const trip = await Trip.findById(tripId);
    if (!trip) {
      return res
        .status(404)
        .json({ success: false, message: "Trip not found" });
    }

    if (trip.mapper.toString() !== req.user.id.toString()) {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    // Normalize single stop input
    if (!Array.isArray(stopsData)) {
      const singleStop = stopsData || req.body;

      if (singleStop.totalPassengerAtFirstStop !== undefined) {
        totalPassengerAtFirstStop = singleStop.totalPassengerAtFirstStop;
        delete singleStop.totalPassengerAtFirstStop;
      }

      stopsData = [singleStop];
    }

    const existingStops = await TripStop.find({ trip: tripId }).sort({
      stopNumber: 1,
    });

    let currentPassengers =
      existingStops.length > 0
        ? existingStops[existingStops.length - 1].currentPassengers
        : 0;

    let stopNumber = existingStops.length;
    let lastCoordinates =
      existingStops.length > 0
        ? existingStops[existingStops.length - 1].stopLocation.coordinates
        : null;
    let lastDepartTime =
      existingStops.length > 0 &&
      existingStops[existingStops.length - 1].departTime
        ? new Date(existingStops[existingStops.length - 1].departTime)
        : null;
    let firstDepartTime =
      existingStops.length > 0 && existingStops[0].departTime
        ? new Date(existingStops[0].departTime)
        : null;

    let cumulativePassengers =
      existingStops.reduce((sum, stop) => sum + stop.passengersIn, 0) || 0;
    let cumulativeRevenue =
      existingStops.reduce(
        (sum, stop) => sum + stop.passengersIn * stop.fareAmount,
        0
      ) || 0;
    let cumulativeDistance =
      existingStops.length > 0
        ? existingStops[existingStops.length - 1].cum_distance || 0
        : 0;

    if (stopNumber === 0 && totalPassengerAtFirstStop !== undefined) {
      trip.totalPassengerAtFirstStop = totalPassengerAtFirstStop;
      await trip.save();
      currentPassengers = totalPassengerAtFirstStop;
    }

    const newStops = [];
    const AVERAGE_SPEED_KMH = 30; // Average bus speed in km/h (adjust as needed)
    const AVERAGE_DWELL_TIME_MINUTES = 2; // Average time spent at each stop

    for (let stop of stopsData) {
      let {
        passengersIn = 0,
        passengersOut = 0,
        fareAmount = 0,
        dwellTime,
        coordinates,
        distance,
        previousStopId,
      } = stop;

      // Validate coordinates
      if (
        !Array.isArray(coordinates) ||
        coordinates.length !== 2 ||
        typeof coordinates[0] !== "number" ||
        typeof coordinates[1] !== "number"
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid coordinates format. Use: [longitude, latitude]",
        });
      }

      passengersIn = parseInt(passengersIn) || 0;
      passengersOut = parseInt(passengersOut) || 0;
      fareAmount = parseFloat(fareAmount) || 0;

      stopNumber += 1;
      currentPassengers = Math.max(
        0,
        currentPassengers + passengersIn - passengersOut
      );
      cumulativePassengers += passengersIn;
      cumulativeRevenue += passengersIn * fareAmount;

      const stopId = await generateStopId();

      // ============ AUTOMATIC TIME CALCULATION ============
      let arrive = null;
      let depart = null;
      let segmentDistance = 0;
      let segmentTime = 0;
      let speed = 0;
      let cumTravelTime = 0;

      const actualDwellTime = dwellTime
        ? parseFloat(dwellTime)
        : AVERAGE_DWELL_TIME_MINUTES;

      if (stopNumber === 1) {
        // First stop - use current time or trip start time
        arrive = new Date();
        depart = new Date(arrive.getTime() + actualDwellTime * 60000);
        firstDepartTime = depart;
        speed = 0;
      } else {
        // Calculate distance from last stop
        if (lastCoordinates) {
          segmentDistance = haversineDistanceCord(lastCoordinates, coordinates);
          cumulativeDistance += segmentDistance;
        }

        // Calculate travel time based on distance and average speed
        if (segmentDistance > 0) {
          segmentTime = (segmentDistance / AVERAGE_SPEED_KMH) * 60; // in minutes
          speed = AVERAGE_SPEED_KMH;
        }

        // Calculate arrival time = last depart time + travel time
        if (
          lastDepartTime &&
          lastDepartTime instanceof Date &&
          !isNaN(lastDepartTime)
        ) {
          arrive = new Date(lastDepartTime.getTime() + segmentTime * 60000);

          // Departure time = arrival time + dwell time
          depart = new Date(arrive.getTime() + actualDwellTime * 60000);
        } else {
          // Fallback if lastDepartTime is invalid
          arrive = new Date();
          depart = new Date(arrive.getTime() + actualDwellTime * 60000);
        }
      }

      // Calculate cumulative travel time from first stop
      if (
        firstDepartTime &&
        firstDepartTime instanceof Date &&
        !isNaN(firstDepartTime) &&
        depart &&
        depart instanceof Date &&
        !isNaN(depart)
      ) {
        cumTravelTime = (depart - firstDepartTime) / 60000; // in minutes
      }

      // Update previous stop's departure time if needed
      if (previousStopId && mongoose.Types.ObjectId.isValid(previousStopId)) {
        const previousStop = await TripStop.findById(previousStopId);
        if (previousStop && previousStop.arriveTime) {
          const updatedDepartTime = new Date(
            previousStop.arriveTime.getTime() + actualDwellTime * 60000
          );
          await TripStop.findByIdAndUpdate(previousStopId, {
            $set: { departTime: updatedDepartTime },
          });
        }
      }

      const newStop = new TripStop({
        trip: tripId,
        stopId,
        stopNumber,
        passengersIn,
        passengersOut,
        currentPassengers,
        distance,
        fareAmount,
        dwellTime: actualDwellTime.toString(),
        stopLocation: {
          type: "Point",
          coordinates,
        },
        arriveTime: arrive,
        departTime: depart,
        cum_passengers: cumulativePassengers,
        // cum_travel_time: cumTravelTime,
        // cum_distance: cumulativeDistance,
        cum_revenue: cumulativeRevenue,
        speed,
        project_id: project_id,
      });

      await newStop.save();
      newStops.push(newStop);

      lastCoordinates = coordinates;
      lastDepartTime = depart;
    }

    const allStops = await TripStop.find({ trip: tripId });

    const totalPassengersPickedUp = allStops.reduce(
      (sum, stop) => sum + stop.passengersIn,
      0
    );
    const totalPassengersDroppedOff = allStops.reduce(
      (sum, stop) => sum + stop.passengersOut,
      0
    );
    const totalFareCollection = allStops.reduce(
      (sum, stop) => sum + stop.fareAmount * stop.passengersIn,
      0
    );

    await Trip.findByIdAndUpdate(tripId, {
      currentStop: stopNumber,
      totalPassengersPickedUp,
      totalPassengersDroppedOff,
      finalPassengerCount: currentPassengers,
      totalFareCollection,
      totalStops: stopNumber,
      tripStops: allStops.map((stop) => stop._id),
    });

    return res.status(201).json({
      success: true,
      data: newStops.length === 1 ? newStops[0] : newStops,
      message: `${newStops.length} stop(s) added successfully`,
    });
  } catch (error) {
    next(error);
  }
};

// const addStop = async (req, res, next) => {
//   try {
//     const { tripId } = req.params;
//     let { stopsData, totalPassengerAtFirstStop } = req.body;

//     const trip = await Trip.findById(tripId);
//     if (!trip) {
//       return res
//         .status(404)
//         .json({ success: false, message: "Trip not found" });
//     }

//     if (trip.mapper.toString() !== req.user.id.toString()) {
//       return res.status(403).json({ success: false, message: "Unauthorized" });
//     }

//     // Normalize single stop input
//     if (!Array.isArray(stopsData)) {
//       const singleStop = stopsData || req.body;

//       if (singleStop.totalPassengerAtFirstStop !== undefined) {
//         totalPassengerAtFirstStop = singleStop.totalPassengerAtFirstStop;
//         delete singleStop.totalPassengerAtFirstStop;
//       }

//       stopsData = [singleStop];
//     }

//     const existingStops = await TripStop.find({ trip: tripId }).sort({
//       stopNumber: 1,
//     });

//     let currentPassengers =
//       existingStops.length > 0
//         ? existingStops[existingStops.length - 1].currentPassengers
//         : 0;

//     let stopNumber = existingStops.length;
//     let lastCoordinates =
//       existingStops.length > 0
//         ? existingStops[existingStops.length - 1].stopLocation.coordinates
//         : null;
//     let lastDepartTime =
//       existingStops.length > 0
//         ? new Date(existingStops[existingStops.length - 1].departTime)
//         : null;
//     let firstDepartTime =
//       existingStops.length > 0 ? new Date(existingStops[0].departTime) : null;

//     let cumulativePassengers =
//       existingStops.reduce((sum, stop) => sum + stop.passengersIn, 0) || 0;
//     let cumulativeRevenue =
//       existingStops.reduce(
//         (sum, stop) => sum + stop.passengersIn * stop.fareAmount,
//         0
//       ) || 0;
//     let cumulativeDistance =
//       existingStops.length > 0
//         ? existingStops[existingStops.length - 1].cum_distance || 0
//         : 0;

//     if (stopNumber === 0 && totalPassengerAtFirstStop !== undefined) {
//       trip.totalPassengerAtFirstStop = totalPassengerAtFirstStop;
//       await trip.save();
//       currentPassengers = totalPassengerAtFirstStop;
//     }

//     const newStops = [];

//     for (let stop of stopsData) {
//       let {
//         passengersIn = 0,
//         passengersOut = 0,
//         fareAmount = 0,
//         dwellTime,
//         coordinates,
//         arriveTime,
//         departTime,
//         distance,
//         previousStopId,
//       } = stop;

//       // Validate coordinates
//       if (
//         !Array.isArray(coordinates) ||
//         coordinates.length !== 2 ||
//         typeof coordinates[0] !== "number" ||
//         typeof coordinates[1] !== "number"
//       ) {
//         return res.status(400).json({
//           success: false,
//           message: "Invalid coordinates format. Use: [longitude, latitude]",
//         });
//       }

//       passengersIn = parseInt(passengersIn) || 0;
//       passengersOut = parseInt(passengersOut) || 0;
//       fareAmount = parseFloat(fareAmount) || 0;

//       // if (typeof dwellTime === "string" && dwellTime.includes(":")) {
//       //   const [hours = 0, minutes = 0] = dwellTime.split(":").map(Number);
//       //   dwellTime = hours * 60 + minutes;
//       // } else {
//       //   dwellTime = parseFloat(dwellTime) || 0;
//       // }

//       if (previousStopId && mongoose.Types.ObjectId.isValid(previousStopId)) {
//         await TripStop.findByIdAndUpdate(previousStopId, {
//           $set: { departTime: departTime || null },
//         });
//       }

//       stopNumber += 1;
//       currentPassengers = Math.max(
//         0,
//         currentPassengers + passengersIn - passengersOut
//       );
//       cumulativePassengers += passengersIn;
//       cumulativeRevenue += passengersIn * fareAmount;

//       const stopId = await generateStopId();
//       const arrive = arriveTime ? new Date(arriveTime) : null;
//       const depart = departTime ? new Date(departTime) : null;

//       // Distance and speed calculations
//       let segmentDistance = 0;
//       let segmentTime = 0;
//       let speed = 0;
//       let cumTravelTime = 0;

//       if (lastCoordinates) {
//         segmentDistance = haversineDistanceCord(lastCoordinates, coordinates);
//         cumulativeDistance += segmentDistance;
//       }

//       if (lastDepartTime) {
//         segmentTime = (depart - lastDepartTime) / 60000; // in minutes
//         if (segmentTime > 0) {
//           speed = (segmentDistance / segmentTime) * 60; // km/h
//         }
//       }

//       if (firstDepartTime) {
//         cumTravelTime = (depart - firstDepartTime) / 60000; // in minutes
//       } else {
//         firstDepartTime = depart;
//         cumTravelTime = 0;
//       }

//       const newStop = new TripStop({
//         trip: tripId,
//         stopId,
//         stopNumber,
//         passengersIn,
//         passengersOut,
//         currentPassengers,
//         distance,
//         fareAmount,
//         dwellTime,
//         stopLocation: {
//           type: "Point",
//           coordinates,
//         },
//         arriveTime: arrive,
//         departTime: depart,
//         cum_passengers: cumulativePassengers,
//         cum_travel_time: cumTravelTime,
//         cum_distance: cumulativeDistance,
//         cum_revenue: cumulativeRevenue,
//         speed,
//       });

//       await newStop.save();
//       newStops.push(newStop);

//       lastCoordinates = coordinates;
//       lastDepartTime = depart;
//     }

//     const allStops = await TripStop.find({ trip: tripId });

//     const totalPassengersPickedUp = allStops.reduce(
//       (sum, stop) => sum + stop.passengersIn,
//       0
//     );
//     const totalPassengersDroppedOff = allStops.reduce(
//       (sum, stop) => sum + stop.passengersOut,
//       0
//     );
//     const totalFareCollection = allStops.reduce(
//       (sum, stop) => sum + stop.fareAmount * stop.passengersIn,
//       0
//     );

//     await Trip.findByIdAndUpdate(tripId, {
//       currentStop: stopNumber,
//       totalPassengersPickedUp,
//       totalPassengersDroppedOff,
//       finalPassengerCount: currentPassengers,
//       totalFareCollection,
//       totalStops: stopNumber,
//       tripStops: allStops.map((stop) => stop._id),
//     });

//     return res.status(201).json({
//       success: true,
//       data: newStops.length === 1 ? newStops[0] : newStops,
//       message: `${newStops.length} stop(s) added successfully`,
//     });
//   } catch (error) {
//     next(error);
//   }
// };

// Update stop data

const updateStop = async (req, res, next) => {
  try {
    const { tripId, stopId } = req.params;
    const {
      passengersIn,
      passengersOut,
      fareAmount,
      dwellTime,
      stopLocation,
      nearestPredefinedStop,
      arriveTime, // ✅ NEW
      departTime, // ✅ NEW
    } = req.body;

    const trip = await Trip.findById(tripId);
    if (!trip) {
      return res.status(404).json({
        success: false,
        message: "Trip not found",
      });
    }

    if (trip.mapper.toString() !== req.user.id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const stop = await TripStop.findOne({ _id: stopId, trip: tripId });
    if (!stop) {
      return res.status(404).json({
        success: false,
        message: "Stop not found",
      });
    }

    // ✅ Update fields only if they are provided
    if (passengersIn !== undefined) stop.passengersIn = passengersIn;
    if (passengersOut !== undefined) stop.passengersOut = passengersOut;
    if (fareAmount !== undefined) stop.fareAmount = fareAmount;
    if (dwellTime !== undefined) stop.dwellTime = dwellTime;
    if (stopLocation !== undefined) stop.stopLocation = stopLocation;
    if (nearestPredefinedStop !== undefined)
      stop.nearestPredefinedStop = nearestPredefinedStop;
    if (arriveTime !== undefined) stop.arriveTime = arriveTime; // ✅ Added
    if (departTime !== undefined) stop.departTime = departTime; // ✅ Added

    // ✅ Recalculate current passengers for this stop
    const previousStop = await TripStop.findOne({
      trip: tripId,
      stopNumber: stop.stopNumber - 1,
    });

    const previousPassengers = previousStop
      ? previousStop.currentPassengers
      : 0;

    stop.currentPassengers = Math.max(
      0,
      previousPassengers + stop.passengersIn - stop.passengersOut
    );

    await stop.save();

    // ✅ Recalculate subsequent stops
    const subsequentStops = await TripStop.find({
      trip: tripId,
      stopNumber: { $gt: stop.stopNumber },
    }).sort({ stopNumber: 1 });

    let runningPassengerCount = stop.currentPassengers;

    for (const subsequentStop of subsequentStops) {
      runningPassengerCount = Math.max(
        0,
        runningPassengerCount +
          subsequentStop.passengersIn -
          subsequentStop.passengersOut
      );
      subsequentStop.currentPassengers = runningPassengerCount;
      await subsequentStop.save();
    }

    // ✅ Update trip summary
    const allStops = await TripStop.find({ trip: tripId });

    const totalPassengersPickedUp = allStops.reduce(
      (sum, stop) => sum + stop.passengersIn,
      0
    );
    const totalPassengersDroppedOff = allStops.reduce(
      (sum, stop) => sum + stop.passengersOut,
      0
    );
    const totalFareCollection = allStops.reduce(
      (sum, stop) => sum + stop.fareAmount,
      0
    );

    await Trip.findByIdAndUpdate(tripId, {
      totalPassengersPickedUp,
      totalPassengersDroppedOff,
      finalPassengerCount: runningPassengerCount,
      totalFareCollection,
    });

    res.json({
      success: true,
      data: stop,
      message: "Stop updated successfully",
    });
  } catch (error) {
    next(error);
  }
};

const updateByFirstStop = async (req, res, next) => {
  try {
    const { tripId, stopId } = req.params;
    const { currentPassengers } = req.body;

    console.log(
      "currentPassengers",
      currentPassengers,
      "stopId",
      stopId,
      "tripId",
      tripId
    );

    const trip = await Trip.findById(tripId);
    if (!trip) {
      return res.status(404).json({
        success: false,
        message: "Trip not found",
      });
    }

    const updateTrip = await Trip.findOneAndUpdate(
      { _id: tripId },
      { totalPassengerAtFirstStop: currentPassengers },
      { new: true }
    );

    const updateStop = await TripStop.findOneAndUpdate(
      { _id: stopId },
      { currentPassengers },
      { new: true }
    );

    res.json({
      success: true,
      data: updateTrip,
      message: "Trip updated successfully",
    });
  } catch (error) {
    next(error);
  }
};

// Delete stop
const deleteStop = async (req, res, next) => {
  try {
    const { tripId, stopId } = req.params;

    const trip = await Trip.findById(tripId);
    if (!trip) {
      return res.status(404).json({
        success: false,
        message: "Trip not found",
      });
    }

    if (trip.mapper.toString() !== req.user.id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized",
      });
    }

    if (trip.status === "completed") {
      return res.status(400).json({
        success: false,
        message: "Cannot delete stop from completed trip",
      });
    }

    const stop = await TripStop.findOne({ _id: stopId, trip: tripId });
    if (!stop) {
      return res.status(404).json({
        success: false,
        message: "Stop not found",
      });
    }

    const stopNumber = stop.stopNumber;
    await TripStop.findByIdAndDelete(stopId);

    // Renumber subsequent stops
    await TripStop.updateMany(
      { trip: tripId, stopNumber: { $gt: stopNumber } },
      { $inc: { stopNumber: -1 } }
    );

    // Recalculate passenger counts for all remaining stops
    const remainingStops = await TripStop.find({ trip: tripId }).sort({
      stopNumber: 1,
    });
    let runningPassengerCount = 0;

    for (const remainingStop of remainingStops) {
      runningPassengerCount = Math.max(
        0,
        runningPassengerCount +
          remainingStop.passengersIn -
          remainingStop.passengersOut
      );
      remainingStop.currentPassengers = runningPassengerCount;
      await remainingStop.save();
    }

    // Update trip summary
    const totalPassengersPickedUp = remainingStops.reduce(
      (sum, stop) => sum + stop.passengersIn,
      0
    );
    const totalPassengersDroppedOff = remainingStops.reduce(
      (sum, stop) => sum + stop.passengersOut,
      0
    );
    const totalFareCollection = remainingStops.reduce(
      (sum, stop) => sum + stop.fareAmount,
      0
    );

    await Trip.findByIdAndUpdate(tripId, {
      currentStop: remainingStops.length,
      totalPassengersPickedUp,
      totalPassengersDroppedOff,
      finalPassengerCount: runningPassengerCount,
      totalFareCollection,
    });

    res.json({
      success: true,
      message: "Stop deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

// Start trip
const startTrip = async (req, res, next) => {
  try {
    const { tripId } = req.params;

    const { mappingNotes, gpsAccuracy, distance, duration } = req.body;

    const trip = await Trip.findById(tripId);
    if (!trip) {
      return res.status(404).json({
        success: false,
        message: "Trip not found",
      });
    }

    // console.log("trip user ===>>", req.user, "trip mapper ===>>", trip.mapper);

    if (trip.mapper.toString() !== req.user.id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized",
      });
    }

    if (trip.status !== "new") {
      return res.status(400).json({
        success: false,
        message: `Cannot start trip with status: ${trip.status}`,
      });
    }

    trip.status = "in-progress";
    trip.startTime = new Date();
    if (gpsAccuracy) trip.gpsAccuracy = gpsAccuracy;
    if (distance) trip.distance = distance;
    if (duration) trip.duration = duration;
    if (mappingNotes) trip.mappingNotes = mappingNotes;
    await trip.save();

    res.json({
      success: true,
      data: trip,
      message: "Trip started successfully",
    });
  } catch (error) {
    next(error);
  }
};

// Complete trip
const completeTrip = async (req, res, next) => {
  try {
    const { tripId } = req.params;
    const { endCoordinates, gpsAccuracy, mappingNotes, licensePlate } =
      req.body;

    const trip = await Trip.findById(tripId);
    if (!trip) {
      return res.status(404).json({
        success: false,
        message: "Trip not found",
      });
    }

    if (trip.mapper.toString() !== req.user.id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized",
      });
    }

    if (!licensePlate) {
      return res.status(400).json({
        success: false,
        message: "License plate is required",
      });
    }

    // const existingTrip = await Trip.findOne({
    //   _id: { $ne: tripId },
    //   licensePlate: licensePlate.trim(),
    //   // status: "completed",
    // });

    // if (existingTrip) {
    //   return res.status(409).json({
    //     success: false,
    //     message: `License plate "${licensePlate}" is already used in another completed trip.`,
    //   });
    // }

    // Calculate actualDuration
    const actualDuration = trip.startTime
      ? Math.floor((new Date() - trip.startTime) / 1000)
      : 0;

    trip.status = "completed";
    trip.endTime = new Date();
    trip.actualDuration = actualDuration;
    trip.licensePlate = licensePlate;
    trip.isUploaded = true;
    if (endCoordinates) trip.endCoordinates = endCoordinates;
    if (gpsAccuracy) trip.gpsAccuracy = gpsAccuracy;
    if (mappingNotes) trip.mappingNotes = mappingNotes;

    await trip.save();

    // Get trip summary with stops
    const stops = await TripStop.find({ trip: tripId }).sort({ stopNumber: 1 });

    res.json({
      success: true,
      message: "Trip completed successfully",
      data: {
        trip,
        summary: {
          totalStops: stops.length,
          totalDuration: `${Math.floor(actualDuration / 60)}:${String(
            actualDuration % 60
          ).padStart(2, "0")}`,
          totalPassengersPickedUp: trip.totalPassengersPickedUp,
          totalPassengersDroppedOff: trip.totalPassengersDroppedOff,
          finalPassengerCount: trip.finalPassengerCount,
          totalFareCollection: trip.totalFareCollection,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// Cancel trip
const cancelTrip = async (req, res, next) => {
  try {
    const { tripId } = req.params;
    const { reason } = req.body;

    const trip = await Trip.findById(tripId);
    if (!trip) {
      return res.status(404).json({
        success: false,
        message: "Trip not found",
      });
    }

    if (trip.mapper.toString() !== req.user.id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized",
      });
    }

    if (trip.status === "completed") {
      return res.status(400).json({
        success: false,
        message: "Cannot cancel a completed trip",
      });
    }

    if (trip.status === "cancelled") {
      return res.status(400).json({
        success: false,
        message: "Trip is already cancelled",
      });
    }

    trip.status = "cancelled";
    trip.endTime = new Date();
    if (reason) {
      trip.mappingNotes = trip.mappingNotes
        ? `${trip.mappingNotes}\n\nCancellation reason: ${reason}`
        : `Cancellation reason: ${reason}`;
    }

    await trip.save();

    res.json({
      success: true,
      message: "Trip cancelled successfully",
      data: trip,
    });
  } catch (error) {
    next(error);
  }
};

// Get trip details with stops
const getTripDetails = async (req, res, next) => {
  try {
    const { tripId } = req.params;

    const trip = await Trip.findById(tripId)
      .populate("route", "code type")
      .populate("company", "company_name")
      .populate("vehicleType", "type")
      .populate("mapper", "name")
      .lean();

    if (!trip) {
      return res.status(404).json({
        success: false,
        message: "Trip not found",
      });
    }

    // Check authorization
    if (trip.mapper._id.toString() !== req.user.id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized to view this trip",
      });
    }

    // Get all stops for the trip
    const stops = await TripStop.find({ trip: tripId }).lean();

    // Compute tripRoute and totalFare
    const tripRoute = stops
      .filter((stop) => stop.stopLocation && stop.stopLocation.coordinates)
      .map((stop) => stop.stopLocation.coordinates);

    const updatedStops = stops.map((stop) => {
      const passengersIn = stop.passengersIn || 0;
      const fareAmount = stop.fareAmount || 0;

      return {
        ...stop,
        totalFare: passengersIn * fareAmount,
      };
    });

    res.json({
      success: true,
      data: {
        ...trip,
        tripRoute,
        stops: updatedStops,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Get user trips with pagination and filters
const getUserTrips = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      routeId,
      companyId,
      startDate,
      endDate,
      project_id,
    } = req.query;

    // console.log(req.query);

    if (!project_id) {
      return res.status(400).json({
        success: false,
        message: "Project ID is required",
      });
    }

    const query = {
      mapper: req.user.id,
      project_id: project_id,
      status: "completed",
    };

    // Apply filters
    if (status) query.status = status;
    if (routeId) query.route = routeId;
    if (companyId) query.company = companyId;

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const skip = (page - 1) * limit;

    const [trips, totalCount] = await Promise.all([
      Trip.find(query)
        .populate("route", "code type")
        .populate("company", "company_name")
        .populate("vehicleType", "type")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Trip.countDocuments(query),
    ]);

    const enhancedTrips = await Promise.all(
      trips.map(async (trip) => {
        const stops = await TripStop.find({ trip: trip._id }).sort({
          stopNumber: 1,
        });

        const tripRoute = stops
          .filter((stop) => stop.stopLocation?.coordinates)
          .map((stop) => stop.stopLocation.coordinates);

        return {
          ...trip,
          stops,
          tripRoute,
        };
      })
    );

    const totalPages = Math.ceil(totalCount / limit);

    res.json({
      success: true,
      data: {
        trips: enhancedTrips,
        tripQuantity: totalCount,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalCount,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};
// const getUserTrips = async (req, res, next) => {
//   try {
//     const {
//       page = 1,
//       limit = 10,
//       status,
//       routeId,
//       companyId,
//       startDate,
//       endDate,
//     } = req.query;

//     const query = { mapper: req.user.id, status: "completed" };

//     // Apply filters
//     if (status) query.status = status;
//     if (routeId) query.route = routeId;
//     if (companyId) query.company = companyId;

//     if (startDate || endDate) {
//       query.createdAt = {};
//       if (startDate) query.createdAt.$gte = new Date(startDate);
//       if (endDate) query.createdAt.$lte = new Date(endDate);
//     }

//     const skip = (page - 1) * limit;

//     const [trips, totalCount] = await Promise.all([
//       Trip.find(query)
//         .populate("route", "code type")
//         .populate("company", "company_name")
//         .populate("vehicleType", "type")
//         .sort({ createdAt: -1 })
//         .skip(skip)
//         .limit(parseInt(limit))
//         .lean(),
//       Trip.countDocuments(query),
//     ]);

//     const enhancedTrips = await Promise.all(
//       trips.map(async (trip) => {
//         const stops = await TripStop.find({ trip: trip._id }).sort({
//           stopNumber: 1,
//         });

//         const tripRoute = stops
//           .filter((stop) => stop.stopLocation?.coordinates)
//           .map((stop) => stop.stopLocation.coordinates);

//         return {
//           ...trip,
//           stops,
//           tripRoute,
//         };
//       })
//     );

//     const totalPages = Math.ceil(totalCount / limit);

//     res.json({
//       success: true,
//       data: {
//         trips: enhancedTrips,
//         tripQuantity: totalCount,
//         pagination: {
//           currentPage: parseInt(page),
//           totalPages,
//           totalCount,
//           hasNextPage: page < totalPages,
//           hasPrevPage: page > 1,
//         },
//       },
//     });
//   } catch (error) {
//     next(error);
//   }
// };

// Update trip details
const updateTrip = async (req, res, next) => {
  try {
    const { tripId } = req.params;
    const { mappingNotes, status } = req.body;

    const trip = await Trip.findById(tripId);
    if (!trip) {
      return res.status(404).json({
        success: false,
        message: "Trip not found",
      });
    }

    if (trip.mapper.toString() !== req.user.id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized",
      });
    }

    // Update allowed fields
    if (mappingNotes !== undefined) trip.mappingNotes = mappingNotes;

    // Status validation
    if (status !== undefined) {
      const allowedTransitions = {
        new: ["in-progress", "cancelled"],
        "in-progress": ["completed", "cancelled"],
        completed: [],
        cancelled: [],
      };

      if (!allowedTransitions[trip.status].includes(status)) {
        return res.status(400).json({
          success: false,
          message: `Cannot change status from ${trip.status} to ${status}`,
        });
      }

      trip.status = status;
      if (status === "in-progress" && !trip.startTime) {
        trip.startTime = new Date();
      }
      if (status === "completed" || status === "cancelled") {
        trip.endTime = new Date();
        if (status === "completed" && trip.startTime) {
          trip.actualDuration = Math.floor(
            (new Date() - trip.startTime) / 1000
          );
        }
      }
    }

    await trip.save();

    await trip.populate([
      { path: "route", select: "code type" },
      { path: "company", select: "company_name" },
      { path: "vehicleType", select: "type" },
      { path: "mapper", select: "name" },
    ]);

    res.json({
      success: true,
      data: trip,
      message: "Trip updated successfully",
    });
  } catch (error) {
    next(error);
  }
};

const getCompleteTripsDetails = async (req, res, next) => {
  try {
    const totalTrips = await Trip.countDocuments();
    const uniqueVehicles = await Trip.distinct("licensePlate");
    const uniqueRoutes = await Trip.distinct("route");
    const passengerStats = await Trip.aggregate([
      {
        $group: {
          _id: null,
          totalPassengers: { $sum: "$totalPassengersPickedUp" },
        },
      },
    ]);
    const totalPassengers =
      passengerStats.length > 0 ? passengerStats[0].totalPassengers : 0;

    // 5. Trips with >15% GPS Issues (mock logic: gpsAccuracy = 'poor')
    const gpsIssueTrips = await Trip.countDocuments({ gpsAccuracy: "poor" });

    // 6. Trips with Pax Discrepancy (pickup ≠ drop-off)
    const paxDiscrepancyTrips = await Trip.countDocuments({
      $expr: {
        $ne: ["$totalPassengersPickedUp", "$totalPassengersDroppedOff"],
      },
    });

    // 7. Trips per Company
    const tripsPerCompany = await Trip.aggregate([
      {
        $group: {
          _id: "$company",
          tripCount: { $sum: 1 },
        },
      },
      {
        $lookup: {
          from: "companies",
          localField: "_id",
          foreignField: "_id",
          as: "company",
        },
      },
      { $unwind: "$company" },
      {
        $project: {
          _id: 0,
          companyId: "$company._id",
          companyName: "$company.name",
          tripCount: 1,
        },
      },
    ]);

    // 8. Trips per Date
    const tripsPerDate = await Trip.aggregate([
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
          },
          tripCount: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // 9. Trips per Mapper
    const tripsPerMapper = await Trip.aggregate([
      {
        $group: {
          _id: "$mapper",
          tripCount: { $sum: 1 },
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "mapper",
        },
      },
      { $unwind: "$mapper" },
      {
        $project: {
          _id: 0,
          mapperId: "$mapper._id",
          mapperName: "$mapper.name",
          tripCount: 1,
        },
      },
    ]);

    // 10. Trips per Route
    const tripsPerRoute = await Trip.aggregate([
      {
        $group: {
          _id: "$route",
          tripCount: { $sum: 1 },
        },
      },
      {
        $lookup: {
          from: "transportroutes",
          localField: "_id",
          foreignField: "_id",
          as: "route",
        },
      },
      { $unwind: "$route" },
      {
        $project: {
          _id: 0,
          routeId: "$route._id",
          routeCode: "$route.code",
          routeType: "$route.type",
          tripCount: 1,
        },
      },
    ]);

    // 11. Trips per Vehicle
    const tripsPerVehicle = await Trip.aggregate([
      {
        $group: {
          _id: "$licensePlate",
          tripCount: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          licensePlate: "$_id",
          tripCount: 1,
        },
      },
    ]);

    // Final response
    res.status(200).json({
      success: true,
      data: {
        totalTrips,
        totalPassengers,
        gpsIssueTrips,
        paxDiscrepancyTrips,
        uniqueVehicles: uniqueVehicles.length,
        uniqueRoutes: uniqueRoutes.length,
        tripsPerCompany,
        tripsPerDate,
        tripsPerMapper,
        tripsPerRoute,
        tripsPerVehicle,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllTrips,
  createTrip,
  addStop,
  updateStop,
  updateByFirstStop,
  deleteStop,
  startTrip,
  completeTrip,
  cancelTrip,
  getTripDetails,
  getUserTrips,
  updateTrip,
  deleteTrip,
  uploadTrips,
};
