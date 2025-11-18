const Trip = require("../models/tripModel");
const dayjs = require("dayjs");
const CountVehicle = require("../models/countVehicleModel");
const OperationSummary = async (req, res, next) => {
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

    const gpsIssueTrips = await Trip.countDocuments({
      gpsAccuracy: { $gt: 20 },
    });

    const paxDiscrepancyTrips = await Trip.countDocuments({
      $expr: {
        $ne: ["$totalPassengersPickedUp", "$totalPassengersDroppedOff"],
      },
    });

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

const dailyPerformance = async (req, res, next) => {
  try {
    const { date, page = 1, limit = 10, project_id } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    let matchStage = {};

    if (date) {
      const start = new Date(date);
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(end.getDate() + 1);

      matchStage = {
        createdAt: { $gte: start, $lt: end },
      };
    }
    if (project_id) {
      matchStage = {
        ...matchStage,
        project_id: project_id,
      };
    }

    const pipeline = [
      {
        $match: matchStage,
      },

      {
        $addFields: {
          gpsAccuracyNum: {
            $cond: {
              if: { $isNumber: "$gpsAccuracy" },
              then: "$gpsAccuracy",
              else: {
                $convert: {
                  input: "$gpsAccuracy",
                  to: "double",
                  onError: 0,
                  onNull: 0,
                },
              },
            },
          },
        },
      },

      {
        $addFields: {
          isIssue: { $gt: ["$gpsAccuracyNum", 20] },
        },
      },

      {
        $lookup: {
          from: "users",
          localField: "mapper",
          foreignField: "_id",
          as: "mapperInfo",
        },
      },
      {
        $unwind: {
          path: "$mapperInfo",
          preserveNullAndEmptyArrays: true,
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
        $unwind: {
          path: "$routeInfo",
          preserveNullAndEmptyArrays: true,
        },
      },

      {
        $group: {
          _id: {
            routeId: "$route",
            routeName: { $ifNull: ["$routeInfo.code", "Unknown Route"] },
            direction: "$direction",
            mapperId: "$mapper",
            mapperName: { $ifNull: ["$mapperInfo.name", "Unknown Mapper"] },
          },
          totalTrips: { $sum: 1 },
          issueTrips: { $sum: { $cond: ["$isIssue", 1, 0] } },
        },
      },

      {
        $addFields: {
          healthyTrips: { $subtract: ["$totalTrips", "$issueTrips"] },
        },
      },

      {
        $sort: {
          "_id.routeName": 1,
          "_id.direction": 1,
          "_id.mapperName": 1,
        },
      },
    ];

    const results = await Trip.aggregate(pipeline).exec();

    const routeMap = {};
    const allPersons = new Set();
    const personSummary = {};

    results.forEach((item) => {
      const routeKey = `${item._id.routeName}|${item._id.direction}`;
      const personName = item._id.mapperName;

      allPersons.add(personName);

      if (!personSummary[personName]) {
        personSummary[personName] = {
          totalTrips: 0,
          healthyTrips: 0,
          issueTrips: 0,
        };
      }

      personSummary[personName].totalTrips += item.totalTrips;
      personSummary[personName].healthyTrips += item.healthyTrips;
      personSummary[personName].issueTrips += item.issueTrips;

      if (!routeMap[routeKey]) {
        routeMap[routeKey] = {
          route: item._id.routeName,
          tp: "All",
          direction: item._id.direction === "forward" ? "F" : "R",
          persons: {},
        };
      }

      routeMap[routeKey].persons[personName] = {
        healthy: item.healthyTrips,
        issue: item.issueTrips,
        total: item.totalTrips,
        goal: 0,
      };
    });

    let tableRows = Object.values(routeMap);
    const personsArray = Array.from(allPersons).sort();

    tableRows.forEach((row) => {
      personsArray.forEach((person) => {
        if (!row.persons[person]) {
          row.persons[person] = {
            healthy: 0,
            issue: 0,
            total: 0,
            goal: 0,
          };
        }
      });
    });

    const totalsRow = {
      route: "Total",
      tp: "",
      direction: "",
      persons: {},
    };

    personsArray.forEach((person) => {
      let totalHealthy = 0;
      let totalIssue = 0;
      let totalTotal = 0;
      let totalGoal = 0;

      tableRows.forEach((row) => {
        if (row.persons[person]) {
          totalHealthy += row.persons[person].healthy;
          totalIssue += row.persons[person].issue;
          totalTotal += row.persons[person].total;
          totalGoal += row.persons[person].goal;
        }
      });

      totalsRow.persons[person] = {
        healthy: totalHealthy,
        issue: totalIssue,
        total: totalTotal,
        goal: totalGoal,
      };
    });

    const totalRecords = tableRows.length;
    const totalPages = Math.ceil(totalRecords / limitNum);

    const paginatedRows = tableRows.slice(skip, skip + limitNum);

    paginatedRows.push(totalsRow);

    return res.json({
      success: true,
      data: {
        rows: paginatedRows,
        persons: personsArray,
        personSummary: personSummary,
        date: date || "All dates",
        pagination: {
          currentPage: pageNum,
          totalPages: totalPages,
          totalRecords: totalRecords,
          recordsPerPage: limitNum,
          hasNextPage: pageNum < totalPages,
          hasPreviousPage: pageNum > 1,
        },
      },
    });
  } catch (error) {
    console.error("Error in dailyPerformance:", error);
    next(error);
  }
};

const sampleCompletion = async (req, res, next) => {
  try {
    const { project_id, fromDate, toDate, dayType } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const parseDate = (dateStr, endOfDay = false) => {
      if (!dateStr) return null;
      const parsed = dayjs(dateStr, ["MM/DD/YYYY", "YYYY-MM-DD"]);
      return endOfDay
        ? parsed.endOf("day").toDate()
        : parsed.startOf("day").toDate();
    };

    let filter = {};

    if (project_id) filter.project_id = project_id;

    if (fromDate || toDate) {
      filter.createdAt = {};
      if (fromDate) filter.createdAt.$gte = parseDate(fromDate);
      if (toDate) filter.createdAt.$lte = parseDate(toDate, true);
    }

    //  Weekday/weekend filter
    if (dayType === "weekend") {
      filter.$expr = {
        $or: [
          { $eq: [{ $dayOfWeek: "$createdAt" }, 1] }, // Sunday
          { $eq: [{ $dayOfWeek: "$createdAt" }, 7] }, // Saturday
        ],
      };
    } else if (dayType === "weekday") {
      filter.$expr = {
        $and: [
          { $gt: [{ $dayOfWeek: "$createdAt" }, 1] }, // Monday+
          { $lt: [{ $dayOfWeek: "$createdAt" }, 7] }, // -Friday
        ],
      };
    }

    // 🔹 Aggregation pipeline
    const routeAgg = await Trip.aggregate([
      { $match: filter },

      // Join with TransportRoute to get route details
      {
        $lookup: {
          from: "transportroutes", // collection name in MongoDB
          localField: "route",
          foreignField: "_id",
          as: "code",
        },
      },
      { $unwind: "$code" },

      // Group by route name (unique) since direction not in schema yet
      {
        $group: {
          _id: "$code.code",
          totalOnBus: { $sum: "$totalPassengersPickedUp" },
          totalOffBus: { $sum: "$totalPassengersDroppedOff" },
          tripCount: { $sum: 1 },
        },
      },

      // Sort and paginate
      { $sort: { _id: 1 } },
      { $skip: skip },
      { $limit: limit },

      // Format output
      {
        $project: {
          _id: 0,
          Route: "$_id",
          All: {
            $concat: [
              { $toString: "$totalOffBus" },
              ":",
              { $toString: "$totalOnBus" },
            ],
          },
          F: {
            $concat: [
              { $toString: "$totalOffBus" },
              ":",
              { $toString: "$totalOnBus" },
            ],
          },
          R: "0:0",
        },
      },
    ]);

    const totalRoutesAgg = await Trip.aggregate([
      { $match: filter },
      {
        $lookup: {
          from: "transportroutes",
          localField: "route",
          foreignField: "_id",
          as: "routeData",
        },
      },
      { $unwind: "$routeData" },
      { $group: { _id: "$routeData.name" } },
      { $count: "count" },
    ]);

    const totalRoutes = totalRoutesAgg[0]?.count || 0;
    const totalPages = Math.ceil(totalRoutes / limit);

    res.status(200).json({
      success: true,
      data: routeAgg,
      filtersUsed: { project_id, fromDate, toDate, dayType },
      pagination: {
        totalRoutes,
        currentPage: page,
        totalPages,
        recordsPerPage: limit,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    });
  } catch (error) {
    console.error("Error in sampleCompletion:", error);
    next(error);
  }
};

// const getFrequencyCount = async (req, res, next) => {
//   try {
//     const { project_id, fromDate, toDate, direction } = req.query;
//     const page = parseInt(req.query.page) || 1;
//     const limit = parseInt(req.query.limit) || 10;
//     const skip = (page - 1) * limit;

//     let filter = {};

//     if (project_id) filter.project_id = project_id;

//     if (fromDate || toDate) {
//       filter.createdAt = {};
//       if (fromDate)
//         filter.createdAt.$gte = dayjs(fromDate, ["MM/DD/YYYY", "YYYY-MM-DD"])
//           .startOf("day")
//           .toDate();
//       if (toDate)
//         filter.createdAt.$lte = dayjs(toDate, ["MM/DD/YYYY", "YYYY-MM-DD"])
//           .endOf("day")
//           .toDate();
//     }

//     if (direction && ["forward", "reverse"].includes(direction.toLowerCase())) {
//       filter.direction = direction.toLowerCase();
//     }

//     const total = await CountVehicle.countDocuments(filter);

//     const vehicles = await CountVehicle.find(filter)
//       .populate([
//         {
//           path: "project_id",
//           select: "_id project_code name",
//           strictPopulate: false,
//         },
//         {
//           path: "userId",
//           select: "_id name email",
//           strictPopulate: false,
//         },
//         {
//           path: "route",
//           select: "_id code",
//           strictPopulate: false,
//         },
//       ])
//       .skip(skip)
//       .limit(limit)
//       .sort({ createdAt: -1 });

//     const totalPages = Math.ceil(total / limit);

//     res.status(200).json({
//       success: true,
//       data: vehicles,
//       filtersUsed: { project_id, fromDate, toDate, direction },
//       pagination: {
//         total,
//         page,
//         totalPages,
//         recordsPerPage: limit,
//         hasNextPage: page < totalPages,
//         hasPreviousPage: page > 1,
//       },
//     });
//   } catch (error) {
//     console.error("Error in getFrequencyCount:", error);
//     next(error);
//   }
// };
const getFrequencyCount = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const [vehicles, total] = await Promise.all([
      CountVehicle.find()
        .populate("vehicleType", "_id type")
        .populate("route", "_id code type")
        .populate("location", "_id name")
        .populate("userId", "_id name")
        .select("-__v")
        .skip(skip)
        .limit(limit)
        .lean(),

      CountVehicle.countDocuments(),
    ]);

    const formattedData = vehicles.map((v) => ({
      id: v._id,
      date: v.createdAt.toISOString().split("T")[0],
      location: v.location?.name || "N/A",
      surveyor: v.userId?.name || "N/A",
    }));

    const uniquePersonNames = [
      ...new Set(formattedData.map((v) => v.surveyor)),
    ];

    res.status(200).json({
      success: true,
      data: formattedData,
      surveyor: uniquePersonNames,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page * limit < total,
        hasPrevPage: page > 1,
      },
    });
  } catch (error) {
    next(error);
  }
};

const deleteCountVehicle = async (req, res, next) => {
  try {
    const { id } = req.params;

    const deleted = await CountVehicle.findByIdAndDelete(id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "Vehicle not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Vehicle deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  OperationSummary,
  dailyPerformance,
  sampleCompletion,
  getFrequencyCount,
  deleteCountVehicle,
};
