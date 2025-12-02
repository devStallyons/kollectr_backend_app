const { default: mongoose } = require("mongoose");
const Trip = require("../models/tripModel");
const TripStop = require("../models/tripStopModel");

const getDataDownload = async (req, res) => {
  try {
    const {
      project_id,
      status = "healthy",
      dateType = "mapped",
      startDate,
      endDate,
      page = 1,
      limit = 10,
      search = "",
    } = req.query;

    console.log("data download", req.query);

    const query = {};

    if (project_id) {
      query.project_id = new mongoose.Types.ObjectId(project_id);
    }

    if (status === "healthy") {
      query.$or = [
        { gpsAccuracy: { $exists: false } },
        { gpsAccuracy: { $lte: "20" } },
      ];
    } else if (status === "trashed") {
      query.gpsAccuracy = { $gt: "20" };
    }

    if (startDate && endDate) {
      const dateField = dateType === "uploaded" ? "createdAt" : "startTime";
      query[dateField] = {
        $gte: new Date(startDate),
        $lte: new Date(new Date(endDate).setHours(23, 59, 59, 999)),
      };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    let trips = await Trip.find(query)
      .populate("route", "code type direction")
      .populate("mapper", "name email")
      .populate("company", "name")
      .sort({ startTime: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    if (search) {
      const searchLower = search.toLowerCase();
      trips = trips.filter(
        (trip) =>
          trip.route?.code?.toLowerCase().includes(searchLower) ||
          trip.tripNumber?.toLowerCase().includes(searchLower) ||
          trip.mapper?.name?.toLowerCase().includes(searchLower)
      );
    }

    const totalItems = await Trip.countDocuments(query);
    const totalPages = Math.ceil(totalItems / parseInt(limit));

    const formattedTrips = trips.map((trip) => {
      const companyName =
        typeof trip.company === "object"
          ? trip.company?.name || "N/A"
          : trip.company || "N/A";

      return {
        id: trip._id.toString(),
        tripNumber: trip.tripNumber || "N/A",
        state: trip.status || "Mapped",
        routeDescription: trip.route?.code || "N/A",
        routeType: trip.route?.type || "N/A",
        direction: trip.route?.direction || "N/A",
        mapper: trip.mapper?.name || "N/A",
        company: companyName,
        startTime: trip.startTime
          ? new Date(trip.startTime).toLocaleTimeString("en-US", {
              hour12: false,
            })
          : "N/A",
        travelTime: parseFloat(
          trip.duration || trip.actualDuration || 0
        ).toFixed(2),
        distance: parseFloat(trip.distance || 0).toFixed(2),
        revenue: parseFloat(trip.totalFareCollection || 0).toFixed(2),
        dateMapped: trip.startTime
          ? new Date(trip.startTime).toISOString().split("T")[0]
          : "N/A",
        dateUploaded: trip.createdAt
          ? new Date(trip.createdAt).toISOString().split("T")[0]
          : "N/A",
        noStops: trip.totalStops || 0,
        pax: trip.totalPassengersPickedUp || 0,
        deviationPeriod: "All",
        timePeriod: "R",
      };
    });

    res.status(200).json({
      success: true,
      message: "Data fetched successfully",
      data: {
        trips: formattedTrips,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalItems,
          itemsPerPage: parseInt(limit),
          hasNextPage: parseInt(page) < totalPages,
          hasPrevPage: parseInt(page) > 1,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching data download:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch data",
      error: error.message,
    });
  }
};

const downloadTripsCSV = async (req, res) => {
  try {
    const { tripIds, includeGeometry = false } = req.body;

    if (!tripIds || !Array.isArray(tripIds) || tripIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Trip IDs are required",
      });
    }

    const trips = await Trip.find({ _id: { $in: tripIds } })
      .populate("route", "code type direction")
      .populate("mapper", "name email")
      .populate("company", "name")
      .lean();

    let csvHeaders = [
      "Trip ID",
      "Trip Number",
      "Route",
      "Direction",
      "Mapper",
      "Company",
      "Start Time",
      "End Time",
      "Duration (min)",
      "Distance (km)",
      "Total Stops",
      "Passengers Picked Up",
      "Passengers Dropped Off",
      "Total Revenue",
      "Date Mapped",
    ];

    if (includeGeometry) {
      csvHeaders.push("Start Lat", "Start Lng", "End Lat", "End Lng");
    }

    let csvContent = csvHeaders.join(",") + "\n";

    for (const trip of trips) {
      let row = [
        trip._id,
        trip.tripNumber || "",
        trip.route?.code || "",
        trip.route?.direction || "",
        trip.mapper?.name || "",
        trip.company?.name || trip.company || "",
        trip.startTime ? new Date(trip.startTime).toISOString() : "",
        trip.endTime ? new Date(trip.endTime).toISOString() : "",
        trip.duration || trip.actualDuration || 0,
        trip.distance || 0,
        trip.totalStops || 0,
        trip.totalPassengersPickedUp || 0,
        trip.totalPassengersDroppedOff || 0,
        trip.totalFareCollection || 0,
        trip.startTime
          ? new Date(trip.startTime).toISOString().split("T")[0]
          : "",
      ];

      if (includeGeometry) {
        row.push(
          trip.startCoordinates?.latitude || "",
          trip.startCoordinates?.longitude || "",
          trip.endCoordinates?.latitude || "",
          trip.endCoordinates?.longitude || ""
        );
      }

      csvContent += row.map((val) => `"${val}"`).join(",") + "\n";
    }

    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=trips_${Date.now()}.csv`
    );
    res.status(200).send(csvContent);
  } catch (error) {
    console.error("Error downloading CSV:", error);
    res.status(500).json({
      success: false,
      message: "Failed to download CSV",
      error: error.message,
    });
  }
};

const downloadStopsCSV = async (req, res) => {
  try {
    const { tripIds, includeGeometry = false } = req.body;

    if (!tripIds || !Array.isArray(tripIds) || tripIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Trip IDs are required",
      });
    }

    const stops = await TripStop.find({ trip: { $in: tripIds } })
      .populate("trip", "tripNumber")
      .sort({ trip: 1, stopNumber: 1 })
      .lean();

    let csvHeaders = [
      "Stop ID",
      "Trip Number",
      "Stop Number",
      "Stop Name",
      "Arrive Time",
      "Depart Time",
      "Dwell Time",
      "Passengers In",
      "Passengers Out",
      "Current Passengers",
      "Fare Amount",
      "Cumulative Distance",
      "Cumulative Revenue",
      "Speed",
    ];

    if (includeGeometry) {
      csvHeaders.push("Latitude", "Longitude");
    }

    let csvContent = csvHeaders.join(",") + "\n";

    for (const stop of stops) {
      let row = [
        stop.stopId || "",
        stop.trip?.tripNumber || "",
        stop.stopNumber || 0,
        stop.stopName || "",
        stop.arriveTime ? new Date(stop.arriveTime).toISOString() : "",
        stop.departTime ? new Date(stop.departTime).toISOString() : "",
        stop.dwellTime || "",
        stop.passengersIn || 0,
        stop.passengersOut || 0,
        stop.currentPassengers || 0,
        stop.fareAmount || 0,
        stop.cum_distance || 0,
        stop.cum_revenue || 0,
        stop.speed || 0,
      ];

      if (includeGeometry) {
        const coords = stop.stopLocation?.coordinates || [0, 0];
        row.push(coords[1] || "", coords[0] || "");
      }

      csvContent += row.map((val) => `"${val}"`).join(",") + "\n";
    }

    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=stops_${Date.now()}.csv`
    );
    res.status(200).send(csvContent);
  } catch (error) {
    console.error("Error downloading stops CSV:", error);
    res.status(500).json({
      success: false,
      message: "Failed to download stops CSV",
      error: error.message,
    });
  }
};

const downloadTripsKML = async (req, res) => {
  try {
    const { tripIds } = req.body;

    if (!tripIds || !Array.isArray(tripIds) || tripIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Trip IDs are required",
      });
    }

    const trips = await Trip.find({ _id: { $in: tripIds } })
      .populate("route", "code")
      .lean();

    let kmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>Trips Export</name>
    <description>Exported trips data</description>
    <Style id="tripStyle">
      <LineStyle>
        <color>ff0000ff</color>
        <width>3</width>
      </LineStyle>
      <IconStyle>
        <Icon>
          <href>http://maps.google.com/mapfiles/kml/paddle/red-circle.png</href>
        </Icon>
      </IconStyle>
    </Style>`;

    for (const trip of trips) {
      const stops = await TripStop.find({ trip: trip._id })
        .sort({ stopNumber: 1 })
        .lean();

      if (stops.length > 0) {
        const coordinates = stops
          .filter((s) => s.stopLocation?.coordinates?.length === 2)
          .map(
            (s) =>
              `${s.stopLocation.coordinates[0]},${s.stopLocation.coordinates[1]},0`
          )
          .join(" ");

        kmlContent += `
    <Placemark>
      <name>${trip.tripNumber || trip._id}</name>
      <description>Route: ${trip.route?.code || "N/A"}, Stops: ${
          stops.length
        }</description>
      <styleUrl>#tripStyle</styleUrl>
      <LineString>
        <coordinates>${coordinates}</coordinates>
      </LineString>
    </Placemark>`;

        for (const stop of stops) {
          if (stop.stopLocation?.coordinates?.length === 2) {
            kmlContent += `
    <Placemark>
      <name>Stop ${stop.stopNumber}</name>
      <description>Stop ID: ${stop.stopId}, In: ${
              stop.passengersIn || 0
            }, Out: ${stop.passengersOut || 0}</description>
      <styleUrl>#tripStyle</styleUrl>
      <Point>
        <coordinates>${stop.stopLocation.coordinates[0]},${
              stop.stopLocation.coordinates[1]
            },0</coordinates>
      </Point>
    </Placemark>`;
          }
        }
      }
    }

    kmlContent += `
  </Document>
</kml>`;

    res.setHeader("Content-Type", "application/vnd.google-earth.kml+xml");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=trips_${Date.now()}.kml`
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

const getDashboardKPIs = async (req, res) => {
  try {
    const { project_id, startDate, endDate, dayType } = req.query;

    console.log("getDashboardKPIs", req.query);

    if (!project_id) {
      return res.status(400).json({
        success: false,
        message: "Project ID is required",
      });
    }

    // Build date filter
    let dateFilter = {};
    if (startDate && endDate) {
      dateFilter = {
        startTime: {
          $gte: new Date(startDate),
          $lte: new Date(new Date(endDate).setHours(23, 59, 59, 999)),
        },
      };
    }

    // Build day type filter (weekday/weekend)
    let dayTypeFilter = {};
    if (dayType === "weekday") {
      // Monday = 2, Tuesday = 3, ..., Friday = 6 in MongoDB $dayOfWeek (Sunday = 1)
      dayTypeFilter = {
        $expr: {
          $and: [
            { $gte: [{ $dayOfWeek: "$startTime" }, 2] },
            { $lte: [{ $dayOfWeek: "$startTime" }, 6] },
          ],
        },
      };
    } else if (dayType === "weekend") {
      // Saturday = 7, Sunday = 1
      dayTypeFilter = {
        $expr: {
          $or: [
            { $eq: [{ $dayOfWeek: "$startTime" }, 1] },
            { $eq: [{ $dayOfWeek: "$startTime" }, 7] },
          ],
        },
      };
    }

    // Main aggregation pipeline
    const aggregationResult = await Trip.aggregate([
      {
        $match: {
          project_id: new mongoose.Types.ObjectId(project_id),
          ...dateFilter,
          ...dayTypeFilter,
        },
      },
      {
        $group: {
          _id: null,

          // TotalPassengers = sum of all passengers boarded across trips
          totalPassengers: {
            $sum: { $ifNull: ["$totalPassengersPickedUp", 0] },
          },

          // TotalTrips = count of all trips
          totalTrips: { $sum: 1 },

          // TotalKm = sum of all trip distances (km)
          totalKm: {
            $sum: { $ifNull: ["$distance", 0] },
          },

          // TotalRevenue = sum of all trip revenues
          totalRevenue: {
            $sum: { $ifNull: ["$totalFareCollection", 0] },
          },

          // UniqueBuses = count of distinct vehicle registrations (licensePlate)
          // Only vehicles that ran at least one trip
          uniqueBuses: { $addToSet: "$licensePlate" },

          // TotalOperatingTime = sum of all in-service time across trips
          // Calculate from startTime and endTime, fallback to duration field
          totalOperatingTimeMs: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $ne: ["$startTime", null] },
                    { $ne: ["$endTime", null] },
                  ],
                },
                { $subtract: ["$endTime", "$startTime"] },
                // Fallback: duration field (assuming it's in minutes)
                { $multiply: [{ $ifNull: ["$duration", 0] }, 60000] },
              ],
            },
          },

          // Days = number of calendar days that match your filter
          // Get all unique dates for day count
          uniqueDates: {
            $addToSet: {
              $dateToString: { format: "%Y-%m-%d", date: "$startTime" },
            },
          },
        },
      },
      {
        $project: {
          _id: 0,
          totalPassengers: 1,
          totalTrips: 1,
          totalKm: { $round: ["$totalKm", 2] },
          totalRevenue: { $round: ["$totalRevenue", 2] },
          // Filter out null/empty licensePlates from unique buses count
          uniqueBusesCount: {
            $size: {
              $filter: {
                input: "$uniqueBuses",
                as: "bus",
                cond: {
                  $and: [{ $ne: ["$$bus", null] }, { $ne: ["$$bus", ""] }],
                },
              },
            },
          },
          // Convert ms to hours
          totalOperatingTimeHours: {
            $round: [{ $divide: ["$totalOperatingTimeMs", 3600000] }, 2],
          },
          daysCount: { $size: "$uniqueDates" },
        },
      },
    ]);

    // Default values if no data
    const data = aggregationResult[0] || {
      totalPassengers: 0,
      totalTrips: 0,
      totalKm: 0,
      totalRevenue: 0,
      uniqueBusesCount: 0,
      totalOperatingTimeHours: 0,
      daysCount: 0,
    };

    // Avoid division by zero
    const days = data.daysCount > 0 ? data.daysCount : 1;
    const uniqueBuses = data.uniqueBusesCount > 0 ? data.uniqueBusesCount : 1;
    const totalTrips = data.totalTrips > 0 ? data.totalTrips : 1;
    const totalOperatingTime =
      data.totalOperatingTimeHours > 0 ? data.totalOperatingTimeHours : 1;

    // Calculate KPIs using formulas
    const kpis = {
      // Raw totals
      totals: {
        days: data.daysCount,
        totalPassengers: data.totalPassengers,
        totalTrips: data.totalTrips,
        totalKm: data.totalKm,
        totalRevenue: data.totalRevenue,
        uniqueBuses: data.uniqueBusesCount,
        totalOperatingTimeHours: data.totalOperatingTimeHours,
      },

      // Calculated KPIs
      metrics: {
        // Average daily ridership = TotalPassengers / Days
        averageDailyRidership:
          data.daysCount > 0
            ? parseFloat((data.totalPassengers / days).toFixed(2))
            : null,

        // Average daily performed km = TotalKm / Days
        averageDailyPerformedKm:
          data.daysCount > 0
            ? parseFloat((data.totalKm / days).toFixed(2))
            : null,

        // Average daily revenue = TotalRevenue / Days
        averageDailyRevenue:
          data.daysCount > 0
            ? parseFloat((data.totalRevenue / days).toFixed(2))
            : null,

        // Average daily buses = UniqueBuses / Days
        averageDailyBuses:
          data.daysCount > 0
            ? parseFloat((data.uniqueBusesCount / days).toFixed(2))
            : null,

        // Average bus daily ridership = TotalPassengers / UniqueBuses
        // Formula: (TotalPassengers / Days) / (UniqueBuses / Days) = TotalPassengers / UniqueBuses
        averageBusDailyRidership:
          data.uniqueBusesCount > 0
            ? parseFloat((data.totalPassengers / uniqueBuses).toFixed(2))
            : null,

        // Average trip ridership = TotalPassengers / TotalTrips
        averageTripRidership:
          data.totalTrips > 0
            ? parseFloat((data.totalPassengers / totalTrips).toFixed(2))
            : null,

        // Average bus daily km = TotalKm / UniqueBuses
        // Formula: (TotalKm / Days) / (UniqueBuses / Days) = TotalKm / UniqueBuses
        averageBusDailyKm:
          data.uniqueBusesCount > 0
            ? parseFloat((data.totalKm / uniqueBuses).toFixed(2))
            : null,

        // Average bus operational speed = TotalKm / TotalOperatingTime (km/h)
        averageBusOperationalSpeed:
          data.totalOperatingTimeHours > 0
            ? parseFloat((data.totalKm / totalOperatingTime).toFixed(2))
            : null,
      },
    };

    res.status(200).json({
      success: true,
      message: "Dashboard KPIs fetched successfully",
      data: kpis,
    });
  } catch (error) {
    console.error("Error fetching dashboard KPIs:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch dashboard KPIs",
      error: error.message,
    });
  }
};

// Get Dashboard Chart Data (daily breakdown)
const getDashboardChartData = async (req, res) => {
  try {
    const {
      project_id,
      startDate,
      endDate,
      dayType,
      groupBy = "day",
    } = req.query;

    if (!project_id) {
      return res.status(400).json({
        success: false,
        message: "Project ID is required",
      });
    }

    // Build date filter
    let dateFilter = {};
    if (startDate && endDate) {
      dateFilter = {
        startTime: {
          $gte: new Date(startDate),
          $lte: new Date(new Date(endDate).setHours(23, 59, 59, 999)),
        },
      };
    }

    // Build day type filter
    let dayTypeMatch = {};
    if (dayType === "weekday") {
      dayTypeMatch = {
        $expr: {
          $and: [
            { $gte: [{ $dayOfWeek: "$startTime" }, 2] },
            { $lte: [{ $dayOfWeek: "$startTime" }, 6] },
          ],
        },
      };
    } else if (dayType === "weekend") {
      dayTypeMatch = {
        $expr: {
          $or: [
            { $eq: [{ $dayOfWeek: "$startTime" }, 1] },
            { $eq: [{ $dayOfWeek: "$startTime" }, 7] },
          ],
        },
      };
    }

    // Group format based on groupBy parameter
    let groupFormat = "%Y-%m-%d"; // day
    if (groupBy === "week") {
      groupFormat = "%Y-W%V";
    } else if (groupBy === "month") {
      groupFormat = "%Y-%m";
    }

    const chartData = await Trip.aggregate([
      {
        $match: {
          project_id: new mongoose.Types.ObjectId(project_id),
          ...dateFilter,
          ...dayTypeMatch,
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: groupFormat, date: "$startTime" },
          },
          passengers: { $sum: { $ifNull: ["$totalPassengersPickedUp", 0] } },
          trips: { $sum: 1 },
          km: { $sum: { $ifNull: ["$distance", 0] } },
          revenue: { $sum: { $ifNull: ["$totalFareCollection", 0] } },
          buses: { $addToSet: "$licensePlate" },
          operatingTimeMs: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $ne: ["$startTime", null] },
                    { $ne: ["$endTime", null] },
                  ],
                },
                { $subtract: ["$endTime", "$startTime"] },
                { $multiply: [{ $ifNull: ["$duration", 0] }, 60000] },
              ],
            },
          },
        },
      },
      {
        $project: {
          _id: 0,
          date: "$_id",
          passengers: 1,
          trips: 1,
          km: { $round: ["$km", 2] },
          revenue: { $round: ["$revenue", 2] },
          buses: {
            $size: {
              $filter: {
                input: "$buses",
                as: "bus",
                cond: {
                  $and: [{ $ne: ["$$bus", null] }, { $ne: ["$$bus", ""] }],
                },
              },
            },
          },
          operatingTimeHours: {
            $round: [{ $divide: ["$operatingTimeMs", 3600000] }, 2],
          },
        },
      },
      {
        $sort: { date: 1 },
      },
    ]);

    res.status(200).json({
      success: true,
      message: "Dashboard chart data fetched successfully",
      data: chartData,
    });
  } catch (error) {
    console.error("Error fetching dashboard chart data:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch dashboard chart data",
      error: error.message,
    });
  }
};

// for charts

const getPassengerLoadByStop = async (req, res) => {
  try {
    const {
      project_id,
      routeId,
      direction,
      startDate,
      endDate,
      dayType,
      period,
    } = req.query;

    if (!project_id) {
      return res.status(400).json({
        success: false,
        message: "Project ID is required",
      });
    }

    // Build trip match filter
    let tripMatchFilter = {
      project_id: new mongoose.Types.ObjectId(project_id),
    };

    // Route filter
    if (routeId && routeId !== "All") {
      tripMatchFilter.route = new mongoose.Types.ObjectId(routeId);
    }

    // Date filter
    if (startDate && endDate) {
      tripMatchFilter.startTime = {
        $gte: new Date(startDate),
        $lte: new Date(new Date(endDate).setHours(23, 59, 59, 999)),
      };
    }

    // Day type filter (weekday/weekend)
    let dayTypeFilter = {};
    if (dayType === "weekday") {
      dayTypeFilter = {
        $expr: {
          $and: [
            { $gte: [{ $dayOfWeek: "$startTime" }, 2] },
            { $lte: [{ $dayOfWeek: "$startTime" }, 6] },
          ],
        },
      };
    } else if (dayType === "weekend") {
      dayTypeFilter = {
        $expr: {
          $or: [
            { $eq: [{ $dayOfWeek: "$startTime" }, 1] },
            { $eq: [{ $dayOfWeek: "$startTime" }, 7] },
          ],
        },
      };
    }

    // Period/Time filter (e.g., "06:00-09:00")
    let periodFilter = {};
    if (period && period !== "All") {
      const [startHour, endHour] = period
        .split("-")
        .map((t) => parseInt(t.split(":")[0]));
      periodFilter = {
        $expr: {
          $and: [
            { $gte: [{ $hour: "$startTime" }, startHour] },
            { $lte: [{ $hour: "$startTime" }, endHour] },
          ],
        },
      };
    }

    // Get trips matching filters
    const trips = await Trip.find({
      ...tripMatchFilter,
      ...dayTypeFilter,
      ...periodFilter,
    }).select("_id");

    const tripIds = trips.map((t) => t._id);

    if (tripIds.length === 0) {
      return res.status(200).json({
        success: true,
        message: "No trips found for the given filters",
        data: [],
      });
    }

    // Aggregate stop data
    const stopData = await TripStop.aggregate([
      {
        $match: {
          trip: { $in: tripIds },
        },
      },
      {
        $group: {
          _id: "$stopNumber",
          avgLoad: { $avg: { $ifNull: ["$currentPassengers", 0] } },
          avgBoarding: { $avg: { $ifNull: ["$passengersIn", 0] } },
          avgAlightings: { $avg: { $ifNull: ["$passengersOut", 0] } },
          totalTrips: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          stop: "$_id",
          Load: { $round: ["$avgLoad", 2] },
          Boarding: { $round: ["$avgBoarding", 2] },
          Alightings: { $round: ["$avgAlightings", 2] },
          totalTrips: 1,
        },
      },
      {
        $sort: { stop: 1 },
      },
    ]);

    res.status(200).json({
      success: true,
      message: "Passenger load by stop fetched successfully",
      data: stopData,
      meta: {
        totalTrips: tripIds.length,
        totalStops: stopData.length,
      },
    });
  } catch (error) {
    console.error("Error fetching passenger load by stop:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch passenger load by stop",
      error: error.message,
    });
  }
};

// Get Route Load Over Time (Hourly)
// Chart 2: Shows load per hour for each route
const getRouteLoadOverTime = async (req, res) => {
  try {
    const {
      project_id,
      routeId,
      direction,
      startDate,
      endDate,
      dayType,
      combined,
    } = req.query;

    if (!project_id) {
      return res.status(400).json({
        success: false,
        message: "Project ID is required",
      });
    }

    // Build trip match filter
    let tripMatchFilter = {
      project_id: new mongoose.Types.ObjectId(project_id),
    };

    // Route filter (if not combined or specific route selected)
    if (routeId && routeId !== "All" && combined !== "yes") {
      tripMatchFilter.route = new mongoose.Types.ObjectId(routeId);
    }

    // Date filter
    if (startDate && endDate) {
      tripMatchFilter.startTime = {
        $gte: new Date(startDate),
        $lte: new Date(new Date(endDate).setHours(23, 59, 59, 999)),
      };
    }

    // Day type filter
    let dayTypeFilter = {};
    if (dayType === "weekday") {
      dayTypeFilter = {
        $expr: {
          $and: [
            { $gte: [{ $dayOfWeek: "$startTime" }, 2] },
            { $lte: [{ $dayOfWeek: "$startTime" }, 6] },
          ],
        },
      };
    } else if (dayType === "weekend") {
      dayTypeFilter = {
        $expr: {
          $or: [
            { $eq: [{ $dayOfWeek: "$startTime" }, 1] },
            { $eq: [{ $dayOfWeek: "$startTime" }, 7] },
          ],
        },
      };
    }

    // Aggregation based on combined flag
    let aggregationPipeline;

    if (combined === "yes") {
      // Combined: Group by hour and route
      aggregationPipeline = [
        {
          $match: {
            ...tripMatchFilter,
            ...dayTypeFilter,
          },
        },
        {
          $lookup: {
            from: "transportroutes",
            localField: "route",
            foreignField: "_id",
            as: "routeInfo",
          },
        },
        {
          $unwind: "$routeInfo",
        },
        {
          $group: {
            _id: {
              hour: { $hour: "$startTime" },
              routeId: "$route",
              routeName: "$routeInfo.routeName",
            },
            avgLoad: { $avg: { $ifNull: ["$totalPassengersPickedUp", 0] } },
            tripCount: { $sum: 1 },
          },
        },
        {
          $group: {
            _id: "$_id.hour",
            routes: {
              $push: {
                routeId: "$_id.routeId",
                routeName: "$_id.routeName",
                avgLoad: { $round: ["$avgLoad", 2] },
                tripCount: "$tripCount",
              },
            },
          },
        },
        {
          $project: {
            _id: 0,
            hour: "$_id",
            routes: 1,
          },
        },
        {
          $sort: { hour: 1 },
        },
      ];
    } else {
      // Single route: Group by hour only
      aggregationPipeline = [
        {
          $match: {
            ...tripMatchFilter,
            ...dayTypeFilter,
          },
        },
        {
          $group: {
            _id: { $hour: "$startTime" },
            avgLoad: { $avg: { $ifNull: ["$totalPassengersPickedUp", 0] } },
            tripCount: { $sum: 1 },
          },
        },
        {
          $project: {
            _id: 0,
            hour: "$_id",
            Load: { $round: ["$avgLoad", 2] },
            tripCount: 1,
          },
        },
        {
          $sort: { hour: 1 },
        },
      ];
    }

    const hourlyData = await Trip.aggregate(aggregationPipeline);

    // Fill missing hours (6:00 - 21:00)
    const filledData = [];
    for (let h = 6; h <= 21; h++) {
      const existing = hourlyData.find((d) => d.hour === h);
      if (existing) {
        filledData.push(existing);
      } else {
        if (combined === "yes") {
          filledData.push({ hour: h, routes: [] });
        } else {
          filledData.push({ hour: h, Load: 0, tripCount: 0 });
        }
      }
    }

    res.status(200).json({
      success: true,
      message: "Route load over time fetched successfully",
      data: filledData,
    });
  } catch (error) {
    console.error("Error fetching route load over time:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch route load over time",
      error: error.message,
    });
  }
};

// Get Routes for Dropdown
const getRoutesForChart = async (req, res) => {
  try {
    const { project_id } = req.query;

    if (!project_id) {
      return res.status(400).json({
        success: false,
        message: "Project ID is required",
      });
    }

    const routes = await Trip.aggregate([
      {
        $match: {
          project_id: new mongoose.Types.ObjectId(project_id),
        },
      },
      {
        $lookup: {
          from: "transportroutes",
          localField: "route",
          foreignField: "_id",
          as: "routeInfo",
        },
      },
      {
        $unwind: "$routeInfo",
      },
      {
        $group: {
          _id: "$route",
          routeName: { $first: "$routeInfo.routeName" },
          routeCode: { $first: "$routeInfo.code" },
          tripCount: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          routeId: "$_id",
          routeName: 1,
          routeCode: 1,
          tripCount: 1,
        },
      },
      {
        $sort: { routeName: 1 },
      },
    ]);

    res.status(200).json({
      success: true,
      message: "Routes fetched successfully",
      data: routes,
    });
  } catch (error) {
    console.error("Error fetching routes:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch routes",
      error: error.message,
    });
  }
};

const getAverageDailyRidershipByRoute = async (req, res) => {
  try {
    const { project_id, direction, period, startDate, endDate, dayType } =
      req.query;

    if (!project_id) {
      return res.status(400).json({
        success: false,
        message: "Project ID is required",
      });
    }

    let tripMatchFilter = {
      project_id: new mongoose.Types.ObjectId(project_id),
    };

    if (startDate && endDate) {
      tripMatchFilter.startTime = {
        $gte: new Date(startDate),
        $lte: new Date(new Date(endDate).setHours(23, 59, 59, 999)),
      };
    }

    let dayTypeFilter = {};
    if (dayType === "weekday") {
      dayTypeFilter = {
        $expr: {
          $and: [
            { $gte: [{ $dayOfWeek: "$startTime" }, 2] },
            { $lte: [{ $dayOfWeek: "$startTime" }, 6] },
          ],
        },
      };
    } else if (dayType === "weekend") {
      dayTypeFilter = {
        $expr: {
          $or: [
            { $eq: [{ $dayOfWeek: "$startTime" }, 1] },
            { $eq: [{ $dayOfWeek: "$startTime" }, 7] },
          ],
        },
      };
    }

    let periodFilter = {};
    if (period && period !== "All") {
      const periodRanges = {
        "06:00-09:00": [6, 9],
        "09:00-12:00": [9, 12],
        "12:00-16:00": [12, 16],
        "16:00-19:00": [16, 19],
        "19:00-23:00": [19, 23],
        "00:00-23:59": [0, 23],
      };
      const range = periodRanges[period];
      if (range) {
        periodFilter = {
          $expr: {
            $and: [
              { $gte: [{ $hour: "$startTime" }, range[0]] },
              { $lte: [{ $hour: "$startTime" }, range[1]] },
            ],
          },
        };
      }
    }

    const ridershipData = await Trip.aggregate([
      {
        $match: {
          ...tripMatchFilter,
          ...dayTypeFilter,
          ...periodFilter,
        },
      },
      {
        $lookup: {
          from: "transportroutes",
          localField: "route",
          foreignField: "_id",
          as: "routeInfo",
        },
      },
      {
        $unwind: "$routeInfo",
      },
      {
        $group: {
          _id: {
            routeId: "$route",
            routeName: "$routeInfo.routeName",
            routeCode: "$routeInfo.code",
            date: { $dateToString: { format: "%Y-%m-%d", date: "$startTime" } },
          },
          dailyPassengers: {
            $sum: { $ifNull: ["$totalPassengersPickedUp", 0] },
          },
        },
      },
      {
        $group: {
          _id: {
            routeId: "$_id.routeId",
            routeName: "$_id.routeName",
            routeCode: "$_id.routeCode",
          },
          totalPassengers: { $sum: "$dailyPassengers" },
          daysCount: { $sum: 1 },
          avgDailyRidership: { $avg: "$dailyPassengers" },
        },
      },
      {
        $project: {
          _id: 0,
          routeId: "$_id.routeId",
          name: {
            $cond: [
              { $ne: ["$_id.routeName", null] },
              "$_id.routeName",
              "$_id.routeCode",
            ],
          },
          value: { $round: ["$avgDailyRidership", 2] },
          totalPassengers: 1,
          daysCount: 1,
        },
      },
      {
        $sort: { name: 1 },
      },
    ]);

    const periodLabel = period === "All" ? "All (00:00 - 23:59)" : period;

    res.status(200).json({
      success: true,
      message: "Average daily ridership by route fetched successfully",
      data: ridershipData,
      meta: {
        totalRoutes: ridershipData.length,
        period: periodLabel,
        direction,
      },
    });
  } catch (error) {
    console.error("Error fetching average daily ridership by route:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch average daily ridership by route",
      error: error.message,
    });
  }
};

const getRouteOperationalSpeed = async (req, res) => {
  try {
    const { project_id, direction, period, startDate, endDate, dayType } =
      req.query;

    if (!project_id) {
      return res.status(400).json({
        success: false,
        message: "Project ID is required",
      });
    }

    let tripMatchFilter = {
      project_id: new mongoose.Types.ObjectId(project_id),
    };

    if (startDate && endDate) {
      tripMatchFilter.startTime = {
        $gte: new Date(startDate),
        $lte: new Date(new Date(endDate).setHours(23, 59, 59, 999)),
      };
    }

    let dayTypeFilter = {};
    if (dayType === "weekday") {
      dayTypeFilter = {
        $expr: {
          $and: [
            { $gte: [{ $dayOfWeek: "$startTime" }, 2] },
            { $lte: [{ $dayOfWeek: "$startTime" }, 6] },
          ],
        },
      };
    } else if (dayType === "weekend") {
      dayTypeFilter = {
        $expr: {
          $or: [
            { $eq: [{ $dayOfWeek: "$startTime" }, 1] },
            { $eq: [{ $dayOfWeek: "$startTime" }, 7] },
          ],
        },
      };
    }

    let periodFilter = {};
    if (period && period !== "All") {
      const periodRanges = {
        "06:00-09:00": [6, 9],
        "09:00-12:00": [9, 12],
        "12:00-16:00": [12, 16],
        "16:00-19:00": [16, 19],
        "19:00-23:00": [19, 23],
      };
      const range = periodRanges[period];
      if (range) {
        periodFilter = {
          $expr: {
            $and: [
              { $gte: [{ $hour: "$startTime" }, range[0]] },
              { $lt: [{ $hour: "$startTime" }, range[1]] },
            ],
          },
        };
      }
    }

    const speedData = await Trip.aggregate([
      {
        $match: {
          ...tripMatchFilter,
          ...dayTypeFilter,
          ...periodFilter,
        },
      },
      {
        $lookup: {
          from: "transportroutes",
          localField: "route",
          foreignField: "_id",
          as: "routeInfo",
        },
      },
      {
        $unwind: "$routeInfo",
      },
      {
        $project: {
          routeId: "$route",
          routeName: "$routeInfo.routeName",
          routeCode: "$routeInfo.code",
          distance: { $ifNull: ["$distance", 0] },
          duration: { $ifNull: ["$duration", 0] },
          startTime: 1,
          endTime: 1,
        },
      },
      {
        $addFields: {
          operatingTimeHours: {
            $cond: [
              {
                $and: [
                  { $ne: ["$startTime", null] },
                  { $ne: ["$endTime", null] },
                ],
              },
              { $divide: [{ $subtract: ["$endTime", "$startTime"] }, 3600000] },
              { $divide: ["$duration", 60] },
            ],
          },
        },
      },
      {
        $addFields: {
          speed: {
            $cond: [
              { $gt: ["$operatingTimeHours", 0] },
              { $divide: ["$distance", "$operatingTimeHours"] },
              0,
            ],
          },
        },
      },
      {
        $group: {
          _id: {
            routeId: "$routeId",
            routeName: "$routeName",
            routeCode: "$routeCode",
          },
          avgSpeed: { $avg: "$speed" },
          totalDistance: { $sum: "$distance" },
          totalTrips: { $sum: 1 },
          minSpeed: { $min: "$speed" },
          maxSpeed: { $max: "$speed" },
        },
      },
      {
        $project: {
          _id: 0,
          routeId: "$_id.routeId",
          name: {
            $cond: [
              { $ne: ["$_id.routeName", null] },
              "$_id.routeName",
              "$_id.routeCode",
            ],
          },
          speed: { $round: ["$avgSpeed", 1] },
          category: {
            $switch: {
              branches: [
                { case: { $eq: ["$avgSpeed", 0] }, then: "not_recorded" },
                { case: { $lt: ["$avgSpeed", 10] }, then: "low" },
                { case: { $lt: ["$avgSpeed", 15] }, then: "medium_low" },
                { case: { $lt: ["$avgSpeed", 20] }, then: "medium_high" },
                { case: { $gte: ["$avgSpeed", 20] }, then: "high" },
              ],
              default: "not_recorded",
            },
          },
          totalDistance: { $round: ["$totalDistance", 2] },
          totalTrips: 1,
          minSpeed: { $round: ["$minSpeed", 1] },
          maxSpeed: { $round: ["$maxSpeed", 1] },
        },
      },
      {
        $sort: { name: 1 },
      },
    ]);

    res.status(200).json({
      success: true,
      message: "Route operational speed fetched successfully",
      data: speedData,
      meta: {
        totalRoutes: speedData.length,
        direction,
        period: period || "All",
      },
    });
  } catch (error) {
    console.error("Error fetching route operational speed:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch route operational speed",
      error: error.message,
    });
  }
};

module.exports = {
  getDataDownload,
  downloadTripsCSV,
  downloadStopsCSV,
  downloadTripsKML,
  // for dashboard
  getDashboardKPIs,
  getDashboardChartData,
  // for charts
  getPassengerLoadByStop,
  getRouteLoadOverTime,
  getRoutesForChart,
  getAverageDailyRidershipByRoute,
  getRouteOperationalSpeed,
};
