const Trip = require("../models/tripModel");
const dayjs = require("dayjs");
const CountVehicle = require("../models/countVehicleModel");
const TransportRoute = require("../models/transportRouteModel");
const { default: mongoose } = require("mongoose");
// const OperationSummary = async (req, res, next) => {
//   try {
//     const totalTrips = await Trip.countDocuments();
//     const uniqueVehicles = await Trip.distinct("licensePlate");
//     const uniqueRoutes = await Trip.distinct("route");
//     const passengerStats = await Trip.aggregate([
//       {
//         $group: {
//           _id: null,
//           totalPassengers: { $sum: "$totalPassengersPickedUp" },
//         },
//       },
//     ]);
//     const totalPassengers =
//       passengerStats.length > 0 ? passengerStats[0].totalPassengers : 0;

//     const gpsIssueTrips = await Trip.countDocuments({
//       gpsAccuracy: { $gt: 20 },
//     });

//     const paxDiscrepancyTrips = await Trip.countDocuments({
//       $expr: {
//         $ne: ["$totalPassengersPickedUp", "$totalPassengersDroppedOff"],
//       },
//     });

//     const tripsPerCompany = await Trip.aggregate([
//       {
//         $group: {
//           _id: "$company",
//           tripCount: { $sum: 1 },
//         },
//       },
//       {
//         $lookup: {
//           from: "companies",
//           localField: "_id",
//           foreignField: "_id",
//           as: "company",
//         },
//       },
//       { $unwind: "$company" },
//       {
//         $project: {
//           _id: 0,
//           companyId: "$company._id",
//           companyName: "$company.company_name",
//           tripCount: 1,
//         },
//       },
//     ]);

//     const tripsPerDate = await Trip.aggregate([
//       {
//         $group: {
//           _id: {
//             $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
//           },
//           tripCount: { $sum: 1 },
//         },
//       },
//       { $sort: { _id: 1 } },
//       {
//         $project: {
//           _id: 0,
//           date: "$_id",
//           tripCount: 1,
//         },
//       },
//     ]);

//     const tripsPerMapper = await Trip.aggregate([
//       {
//         $group: {
//           _id: "$mapper",
//           tripCount: { $sum: 1 },
//         },
//       },
//       {
//         $lookup: {
//           from: "users",
//           localField: "_id",
//           foreignField: "_id",
//           as: "mapper",
//         },
//       },
//       { $unwind: "$mapper" },
//       {
//         $project: {
//           _id: 0,
//           mapperId: "$mapper._id",
//           mapperName: "$mapper.name",
//           tripCount: 1,
//         },
//       },
//     ]);

//     const tripsPerRoute = await Trip.aggregate([
//       {
//         $group: {
//           _id: "$route",
//           tripCount: { $sum: 1 },
//         },
//       },
//       {
//         $lookup: {
//           from: "transportroutes",
//           localField: "_id",
//           foreignField: "_id",
//           as: "route",
//         },
//       },
//       { $unwind: "$route" },
//       {
//         $project: {
//           _id: 0,
//           routeId: "$route._id",
//           routeCode: "$route.code",
//           routeType: "$route.type",
//           tripCount: 1,
//         },
//       },
//     ]);

//     const tripsPerVehicle = await Trip.aggregate([
//       {
//         $group: {
//           _id: "$licensePlate",
//           tripCount: { $sum: 1 },
//         },
//       },
//       {
//         $project: {
//           _id: 0,
//           licensePlate: "$_id",
//           tripCount: 1,
//         },
//       },
//     ]);

//     res.status(200).json({
//       success: true,
//       data: {
//         totalTrips,
//         totalPassengers,
//         gpsIssueTrips,
//         paxDiscrepancyTrips,
//         uniqueVehicles: uniqueVehicles.length,
//         uniqueRoutes: uniqueRoutes.length,
//         tripsPerCompany,
//         tripsPerDate,
//         tripsPerMapper,
//         tripsPerRoute,
//         tripsPerVehicle,
//       },
//     });
//   } catch (error) {
//     next(error);
//   }
// };

// const OperationSummary = async (req, res, next) => {
//   try {
//     const { project_id, status, healthStatus, startDate, endDate, dateField } =
//       req.query;

//     console.log(req.query);

//     const baseFilter = {};

//     if (!project_id) {
//       return res.status(400).json({
//         success: false,
//         message: "project_id is required",
//       });
//     }
//     baseFilter.project_id = project_id;

//     if (status && status !== "all") {
//       baseFilter.status = status;
//     }

//     if (healthStatus === "healthy") {
//       baseFilter.gpsAccuracy = { $lte: 20 };
//     } else if (healthStatus === "trashed") {
//       baseFilter.gpsAccuracy = { $gt: 20 };
//     }

//     if (startDate && endDate) {
//       const start = new Date(startDate);
//       const end = new Date(endDate);
//       end.setHours(23, 59, 59, 999);

//       baseFilter[dateField] = {
//         $gte: start,
//         $lte: end,
//       };
//     } else if (startDate) {
//       baseFilter[dateField] = { $gte: new Date(startDate) };
//     } else if (endDate) {
//       const end = new Date(endDate);
//       end.setHours(23, 59, 59, 999);
//       baseFilter[dateField] = { $lte: end };
//     }

//     const totalTrips = await Trip.countDocuments(baseFilter);

//     const uniqueVehicles = await Trip.distinct("licensePlate", baseFilter);
//     const uniqueRoutes = await Trip.distinct("route", baseFilter);

//     const passengerStats = await Trip.aggregate([
//       { $match: baseFilter },
//       {
//         $group: {
//           _id: null,
//           totalPassengers: { $sum: "$totalPassengersPickedUp" },
//         },
//       },
//     ]);
//     const totalPassengers =
//       passengerStats.length > 0 ? passengerStats[0].totalPassengers : 0;

//     const gpsIssueTrips = await Trip.countDocuments({
//       ...baseFilter,
//       gpsAccuracy: { $gt: 20 },
//     });

//     const healthyTrips = await Trip.countDocuments({
//       ...baseFilter,
//       gpsAccuracy: { $lte: 20 },
//     });

//     const paxDiscrepancyTrips = await Trip.countDocuments({
//       ...baseFilter,
//       $expr: {
//         $ne: ["$totalPassengersPickedUp", "$totalPassengersDroppedOff"],
//       },
//     });

//     const tripsPerCompany = await Trip.aggregate([
//       { $match: baseFilter },
//       {
//         $group: {
//           _id: "$company",
//           tripCount: { $sum: 1 },
//         },
//       },
//       {
//         $lookup: {
//           from: "companies",
//           localField: "_id",
//           foreignField: "_id",
//           as: "company",
//         },
//       },
//       { $unwind: "$company" },
//       {
//         $project: {
//           _id: 0,
//           companyId: "$company._id",
//           companyName: "$company.company_name",
//           tripCount: 1,
//         },
//       },
//       { $sort: { tripCount: -1 } },
//     ]);

//     const tripsPerDate = await Trip.aggregate([
//       { $match: baseFilter },
//       {
//         $group: {
//           _id: {
//             $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
//           },
//           tripCount: { $sum: 1 },
//         },
//       },
//       { $sort: { _id: 1 } },
//       {
//         $project: {
//           _id: 0,
//           date: "$_id",
//           tripCount: 1,
//         },
//       },
//     ]);

//     const tripsPerMapper = await Trip.aggregate([
//       { $match: baseFilter },
//       {
//         $group: {
//           _id: "$mapper",
//           tripCount: { $sum: 1 },
//         },
//       },
//       {
//         $lookup: {
//           from: "users",
//           localField: "_id",
//           foreignField: "_id",
//           as: "mapper",
//         },
//       },
//       { $unwind: "$mapper" },
//       {
//         $project: {
//           _id: 0,
//           mapperId: "$mapper._id",
//           mapperName: "$mapper.name",
//           tripCount: 1,
//         },
//       },
//       { $sort: { tripCount: -1 } },
//     ]);

//     const tripsPerRoute = await Trip.aggregate([
//       { $match: baseFilter },
//       {
//         $group: {
//           _id: "$route",
//           tripCount: { $sum: 1 },
//         },
//       },
//       {
//         $lookup: {
//           from: "transportroutes",
//           localField: "_id",
//           foreignField: "_id",
//           as: "route",
//         },
//       },
//       { $unwind: "$route" },
//       {
//         $project: {
//           _id: 0,
//           routeId: "$route._id",
//           routeCode: "$route.code",
//           routeType: "$route.type",
//           tripCount: 1,
//         },
//       },
//       { $sort: { tripCount: -1 } },
//     ]);

//     const tripsPerVehicle = await Trip.aggregate([
//       { $match: baseFilter },
//       {
//         $group: {
//           _id: "$licensePlate",
//           tripCount: { $sum: 1 },
//         },
//       },
//       {
//         $project: {
//           _id: 0,
//           licensePlate: "$_id",
//           tripCount: 1,
//         },
//       },
//       { $sort: { tripCount: -1 } },
//     ]);

//     const statusBreakdown = await Trip.aggregate([
//       { $match: baseFilter },
//       {
//         $group: {
//           _id: "$status",
//           count: { $sum: 1 },
//         },
//       },
//       {
//         $project: {
//           _id: 0,
//           status: "$_id",
//           count: 1,
//         },
//       },
//     ]);

//     res.status(200).json({
//       success: true,
//       filters: {
//         project_id,
//         status,
//         healthStatus,
//         startDate,
//         endDate,
//         dateField,
//       },
//       data: {
//         totalTrips,
//         totalPassengers,
//         healthyTrips,
//         gpsIssueTrips,
//         paxDiscrepancyTrips,
//         uniqueVehicles: uniqueVehicles.length,
//         uniqueRoutes: uniqueRoutes.length,
//         statusBreakdown,
//         tripsPerCompany,
//         tripsPerDate,
//         tripsPerMapper,
//         tripsPerRoute,
//         tripsPerVehicle,
//       },
//     });
//   } catch (error) {
//     console.error("Operation Summary Error:", error);
//     next(error);
//   }
// };

const OperationSummary = async (req, res, next) => {
  try {
    const { project_id, status, healthStatus, startDate, endDate, dateField } =
      req.query;

    // console.log(req.query);

    // if (!project_id) {
    //   return res.status(400).json({
    //     success: false,
    //     message: "project_id is required",
    //   });
    // }

    // Base filter without health status (for calculating both healthy and trashed counts)
    const baseFilter = {};
    if (project_id) {
      baseFilter.project_id = new mongoose.Types.ObjectId(project_id);
      baseFilter.isUploaded = true;
    }
    // baseFilter.project_id = project_id;

    if (status && status !== "all") {
      baseFilter.status = status;
    }

    // Date filter
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);

      if (dateField && dateField !== "select") {
        baseFilter[dateField] = {
          $gte: start,
          $lte: end,
        };
      }
    } else if (startDate) {
      if (dateField && dateField !== "select") {
        baseFilter[dateField] = { $gte: new Date(startDate) };
      }
    } else if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      if (dateField && dateField !== "select") {
        baseFilter[dateField] = { $lte: end };
      }
    }

    // Health filter - separate from base for counts
    const filterWithHealth = { ...baseFilter };
    if (healthStatus === "healthy") {
      filterWithHealth.gpsAccuracy = { $lte: 20 };
    } else if (healthStatus === "trashed") {
      filterWithHealth.gpsAccuracy = { $gt: 20 };
    }

    // Use filterWithHealth for main queries
    const totalTrips = await Trip.countDocuments(filterWithHealth);

    const uniqueVehicles = await Trip.distinct(
      "licensePlate",
      filterWithHealth
    );
    const uniqueRoutes = await Trip.distinct("route", filterWithHealth);

    const passengerStats = await Trip.aggregate([
      { $match: filterWithHealth },
      {
        $group: {
          _id: null,
          totalPassengers: { $sum: "$totalPassengersPickedUp" },
        },
      },
    ]);
    const totalPassengers =
      passengerStats.length > 0 ? passengerStats[0].totalPassengers : 0;

    // These should use baseFilter (without health) to show correct counts
    const gpsIssueTrips = await Trip.countDocuments({
      ...baseFilter,
      gpsAccuracy: { $gt: 20 },
    });

    const healthyTrips = await Trip.countDocuments({
      ...baseFilter,
      gpsAccuracy: { $lte: 20 },
    });

    const paxDiscrepancyTrips = await Trip.countDocuments({
      ...filterWithHealth,
      $expr: {
        $ne: ["$totalPassengersPickedUp", "$totalPassengersDroppedOff"],
      },
    });

    // Aggregations - use filterWithHealth
    const tripsPerCompany = await Trip.aggregate([
      { $match: filterWithHealth },

      {
        $group: {
          _id: "$company",
          tripCount: { $sum: 1 },
        },
      },

      { $match: { _id: { $ne: null } } },

      {
        $lookup: {
          from: "predefinedassociatingnames",
          localField: "_id",
          foreignField: "_id",
          as: "company",
        },
      },

      { $unwind: { path: "$company", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 0,
          companyId: "$_id",
          companyName: { $ifNull: ["$company.name", "Unknown"] },
          tripCount: 1,
        },
      },
      { $sort: { tripCount: -1 } },
    ]);

    // const tripsPerCompany = await Trip.aggregate([
    //   { $match: filterWithHealth },
    //   {
    //     $group: {
    //       _id: "$company",
    //       tripCount: { $sum: 1 },
    //     },
    //   },
    //   {
    //     $match: { _id: { $ne: null } }, // Null company filter out
    //   },
    //   {
    //     $lookup: {
    //       from: "companies",
    //       localField: "_id",
    //       foreignField: "_id",
    //       as: "company",
    //     },
    //   },
    //   { $unwind: { path: "$company", preserveNullAndEmptyArrays: true } },
    //   {
    //     $project: {
    //       _id: 0,
    //       companyId: "$_id",
    //       companyName: { $ifNull: ["$company.company_name", "Unknown"] },
    //       tripCount: 1,
    //     },
    //   },
    //   { $sort: { tripCount: -1 } },
    // ]);

    const tripsPerDate = await Trip.aggregate([
      { $match: filterWithHealth },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
          },
          tripCount: { $sum: 1 },
        },
      },
      { $match: { _id: { $ne: null } } },
      { $sort: { _id: 1 } },
      {
        $project: {
          _id: 0,
          date: "$_id",
          tripCount: 1,
        },
      },
    ]);

    const tripsPerMapper = await Trip.aggregate([
      { $match: filterWithHealth },
      {
        $group: {
          _id: "$mapper",
          tripCount: { $sum: 1 },
        },
      },
      {
        $match: { _id: { $ne: null } },
      },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "mapper",
        },
      },
      { $unwind: { path: "$mapper", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 0,
          mapperId: "$_id",
          mapperName: { $ifNull: ["$mapper.name", "Unknown"] },
          tripCount: 1,
        },
      },
      { $sort: { tripCount: -1 } },
    ]);

    const tripsPerRoute = await Trip.aggregate([
      { $match: filterWithHealth },
      {
        $group: {
          _id: "$route",
          tripCount: { $sum: 1 },
        },
      },
      {
        $match: { _id: { $ne: null } },
      },
      {
        $lookup: {
          from: "transportroutes",
          localField: "_id",
          foreignField: "_id",
          as: "route",
        },
      },
      { $unwind: { path: "$route", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 0,
          routeId: "$_id",
          routeCode: { $ifNull: ["$route.code", "Unknown"] },
          routeType: { $ifNull: ["$route.type", "Unknown"] },
          tripCount: 1,
        },
      },
      { $sort: { tripCount: -1 } },
    ]);

    const tripsPerVehicle = await Trip.aggregate([
      { $match: filterWithHealth },
      {
        $group: {
          _id: "$licensePlate",
          tripCount: { $sum: 1 },
        },
      },
      {
        $match: { _id: { $ne: null, $ne: "" } },
      },
      {
        $project: {
          _id: 0,
          licensePlate: "$_id",
          tripCount: 1,
        },
      },
      { $sort: { tripCount: -1 } },
    ]);

    const statusBreakdown = await Trip.aggregate([
      { $match: filterWithHealth },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          status: "$_id",
          count: 1,
        },
      },
    ]);

    // Debug log
    // console.log("Filter with health:", JSON.stringify(filterWithHealth));
    // console.log("Trips per vehicle:", tripsPerVehicle);
    // console.log("Trips per route:", tripsPerRoute);

    res.status(200).json({
      success: true,
      filters: {
        project_id,
        status,
        healthStatus,
        startDate,
        endDate,
        dateField,
      },
      data: {
        totalTrips,
        totalPassengers,
        healthyTrips,
        gpsIssueTrips,
        paxDiscrepancyTrips,
        uniqueVehicles: uniqueVehicles.length,
        uniqueRoutes: uniqueRoutes.length,
        statusBreakdown,
        tripsPerCompany,
        tripsPerDate,
        tripsPerMapper,
        tripsPerRoute,
        tripsPerVehicle,
      },
    });
  } catch (error) {
    console.error("Operation Summary Error:", error);
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
        project_id: new mongoose.Types.ObjectId(project_id),
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

    if (project_id) {
      filter.project_id = new mongoose.Types.ObjectId(project_id);
    }

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

    // adding project id

    const project_id = req.query.project_id;
    if (!project_id)
      return res
        .status(400)
        .json({ success: false, message: "project_id is required" });

    const projectObjectId = new mongoose.Types.ObjectId(project_id);

    const filter = { project_id: projectObjectId };

    const [vehicles, total] = await Promise.all([
      CountVehicle.find(filter)
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

const updateCountVehicle = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { licensePlate, vehicleTypeId, loadStatus, routesId, direction } =
      req.body;

    const updatedVehicle = await CountVehicle.findByIdAndUpdate(
      id,
      {
        licensePlate,
        vehicleType: vehicleTypeId,
        loadStatus,
        route: routesId,
        direction,
      },
      { new: true, runValidators: true }
    );

    if (!updatedVehicle) {
      return res.status(404).json({
        success: false,
        message: "Vehicle not found",
      });
    }

    res.status(200).json({
      success: true,
      data: updatedVehicle,
    });
  } catch (error) {
    next(error);
  }
};

const createCountVehicle = async (req, res, next) => {
  try {
    const {
      licensePlate,
      vehicleTypeId,
      loadStatus,
      routesId,
      direction,
      locationId,
    } = req.body;

    const userId = req.user.id;

    if (
      !licensePlate ||
      !vehicleTypeId ||
      !loadStatus ||
      !routesId ||
      !direction
    ) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    const vehicle = await CountVehicle.create({
      licensePlate,
      vehicleType: vehicleTypeId,
      loadStatus,
      route: routesId,
      direction,
      userId, // adding new
      locationId,
    });

    res.status(201).json({
      success: true,
      data: vehicle,
    });
  } catch (error) {
    next(error);
  }
};

// for route completion

const getRouteCompletion = async (req, res) => {
  try {
    const { project_id, page = 1, limit = 10, search = "" } = req.query;

    if (!project_id) {
      return res.status(400).json({
        success: false,
        message: "Project ID is required",
      });
    }

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    let routeFilter = {
      project_id: new mongoose.Types.ObjectId(project_id),
    };

    if (search) {
      routeFilter.$or = [
        { routeName: { $regex: search, $options: "i" } },
        { code: { $regex: search, $options: "i" } },
      ];
    }

    const totalRoutes = await TransportRoute.countDocuments(routeFilter);

    const routes = await TransportRoute.find(routeFilter)
      .select("_id routeName code")
      .sort({ routeName: 1 })
      .skip(skip)
      .limit(limitNum)
      .lean();

    const routeIds = routes.map((r) => r._id);

    const tripAggregation = await Trip.aggregate([
      {
        $match: {
          project_id: new mongoose.Types.ObjectId(project_id),
          route: { $in: routeIds },
        },
      },
      {
        $group: {
          _id: {
            route: "$route",
            direction: "$direction",
          },
          plannedCount: {
            $sum: {
              $cond: [{ $eq: ["$status", "planned"] }, 1, 0],
            },
          },
          mappedTotal: {
            $sum: {
              $cond: [
                { $in: ["$status", ["mapped", "approved", "submitted"]] },
                1,
                0,
              ],
            },
          },
          mappedWithIssues: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $in: ["$status", ["mapped", "approved", "submitted"]] },
                    {
                      $or: [
                        { $eq: ["$hasIssues", true] },
                        { $eq: ["$gpsIssue", true] },
                        { $eq: ["$dataIssue", true] },
                      ],
                    },
                  ],
                },
                1,
                0,
              ],
            },
          },
          approvedCount: {
            $sum: {
              $cond: [{ $in: ["$status", ["approved", "submitted"]] }, 1, 0],
            },
          },
          submittedCount: {
            $sum: {
              $cond: [{ $eq: ["$status", "submitted"] }, 1, 0],
            },
          },
        },
      },
    ]);

    const tripDataMap = {};
    tripAggregation.forEach((item) => {
      const routeId = item._id.route.toString();
      const direction = item._id.direction || "F";

      if (!tripDataMap[routeId]) {
        tripDataMap[routeId] = {
          planned: { F: 0, R: 0 },
          mapped: { F: { total: 0, issues: 0 }, R: { total: 0, issues: 0 } },
          approved: { F: 0, R: 0 },
          submitted: { F: 0, R: 0 },
        };
      }

      const dir = direction === "R" ? "R" : "F";
      tripDataMap[routeId].planned[dir] = item.plannedCount || 0;
      tripDataMap[routeId].mapped[dir].total = item.mappedTotal || 0;
      tripDataMap[routeId].mapped[dir].issues = item.mappedWithIssues || 0;
      tripDataMap[routeId].approved[dir] = item.approvedCount || 0;
      tripDataMap[routeId].submitted[dir] = item.submittedCount || 0;
    });

    const routeCompletionData = routes.map((route) => {
      const routeId = route._id.toString();
      const data = tripDataMap[routeId] || {
        planned: { F: 0, R: 0 },
        mapped: { F: { total: 0, issues: 0 }, R: { total: 0, issues: 0 } },
        approved: { F: 0, R: 0 },
        submitted: { F: 0, R: 0 },
      };

      return {
        routeId: route._id,
        routeName: route.routeName || route.code || "Unknown Route",
        planned: {
          F: data.planned.F,
          R: data.planned.R,
        },
        mapped: {
          F: {
            total: data.mapped.F.total - data.mapped.F.issues,
            issues: data.mapped.F.issues,
          },
          R: {
            total: data.mapped.R.total - data.mapped.R.issues,
            issues: data.mapped.R.issues,
          },
        },
        approved: {
          F: data.approved.F,
          R: data.approved.R,
        },
        submitted: {
          F: data.submitted.F,
          R: data.submitted.R,
        },
      };
    });

    const totalPages = Math.ceil(totalRoutes / limitNum);

    res.status(200).json({
      success: true,
      message: "Route completion data fetched successfully",
      data: routeCompletionData,
      pagination: {
        currentPage: pageNum,
        totalPages,
        totalItems: totalRoutes,
        itemsPerPage: limitNum,
        hasNextPage: pageNum < totalPages,
        hasPrevPage: pageNum > 1,
      },
    });
  } catch (error) {
    console.error("Error fetching route completion data:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch route completion data",
      error: error.message,
    });
  }
};

const updatePlannedTrips = async (req, res) => {
  try {
    const { project_id, routeId, direction, plannedCount } = req.body;

    if (!project_id || !routeId || !direction) {
      return res.status(400).json({
        success: false,
        message: "Project ID, Route ID, and Direction are required",
      });
    }

    const updateField = `plannedTrips.${direction}`;

    const updatedRoute = await TransportRoute.findByIdAndUpdate(
      routeId,
      { $set: { [updateField]: parseInt(plannedCount) || 0 } },
      { new: true, runValidators: false }
    );

    if (!updatedRoute) {
      return res.status(404).json({
        success: false,
        message: "Route not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Planned trips updated successfully",
      data: {
        routeId,
        direction,
        plannedCount: updatedRoute.plannedTrips?.[direction] || 0,
      },
    });
  } catch (error) {
    console.error("Error updating planned trips:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update planned trips",
      error: error.message,
    });
  }
};

const exportRouteCompletionCSV = async (req, res) => {
  try {
    const { project_id } = req.query;

    if (!project_id) {
      return res.status(400).json({
        success: false,
        message: "Project ID is required",
      });
    }

    const routes = await TransportRoute.find({
      project_id: new mongoose.Types.ObjectId(project_id),
    })
      .select("_id routeName code")
      .sort({ routeName: 1 })
      .lean();

    const routeIds = routes.map((r) => r._id);

    const tripAggregation = await Trip.aggregate([
      {
        $match: {
          project_id: new mongoose.Types.ObjectId(project_id),
          route: { $in: routeIds },
        },
      },
      {
        $group: {
          _id: {
            route: "$route",
            direction: "$direction",
          },
          plannedCount: {
            $sum: {
              $cond: [{ $eq: ["$status", "planned"] }, 1, 0],
            },
          },
          mappedTotal: {
            $sum: {
              $cond: [
                { $in: ["$status", ["mapped", "approved", "submitted"]] },
                1,
                0,
              ],
            },
          },
          mappedWithIssues: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $in: ["$status", ["mapped", "approved", "submitted"]] },
                    {
                      $or: [
                        { $eq: ["$hasIssues", true] },
                        { $eq: ["$gpsIssue", true] },
                        { $eq: ["$dataIssue", true] },
                      ],
                    },
                  ],
                },
                1,
                0,
              ],
            },
          },
          approvedCount: {
            $sum: {
              $cond: [{ $in: ["$status", ["approved", "submitted"]] }, 1, 0],
            },
          },
          submittedCount: {
            $sum: {
              $cond: [{ $eq: ["$status", "submitted"] }, 1, 0],
            },
          },
        },
      },
    ]);

    const tripDataMap = {};
    tripAggregation.forEach((item) => {
      const routeId = item._id.route.toString();
      const direction = item._id.direction || "F";

      if (!tripDataMap[routeId]) {
        tripDataMap[routeId] = {
          planned: { F: 0, R: 0 },
          mapped: { F: { total: 0, issues: 0 }, R: { total: 0, issues: 0 } },
          approved: { F: 0, R: 0 },
          submitted: { F: 0, R: 0 },
        };
      }

      const dir = direction === "R" ? "R" : "F";
      tripDataMap[routeId].planned[dir] = item.plannedCount || 0;
      tripDataMap[routeId].mapped[dir].total = item.mappedTotal || 0;
      tripDataMap[routeId].mapped[dir].issues = item.mappedWithIssues || 0;
      tripDataMap[routeId].approved[dir] = item.approvedCount || 0;
      tripDataMap[routeId].submitted[dir] = item.submittedCount || 0;
    });

    const csvData = routes.map((route) => {
      const routeId = route._id.toString();
      const data = tripDataMap[routeId] || {
        planned: { F: 0, R: 0 },
        mapped: { F: { total: 0, issues: 0 }, R: { total: 0, issues: 0 } },
        approved: { F: 0, R: 0 },
        submitted: { F: 0, R: 0 },
      };

      const mappedFValid = data.mapped.F.total - data.mapped.F.issues;
      const mappedRValid = data.mapped.R.total - data.mapped.R.issues;

      return {
        Route: route.routeName || route.code || "Unknown Route",
        "Planned F": data.planned.F,
        "Planned R": data.planned.R,
        "Mapped F": `${mappedFValid} (${data.mapped.F.issues})`,
        "Mapped R": `${mappedRValid} (${data.mapped.R.issues})`,
        "Approved F": data.approved.F,
        "Approved R": data.approved.R,
        "Submitted F": data.submitted.F,
        "Submitted R": data.submitted.R,
      };
    });

    res.status(200).json({
      success: true,
      message: "Route completion CSV data fetched successfully",
      data: csvData,
    });
  } catch (error) {
    console.error("Error exporting route completion CSV:", error);
    res.status(500).json({
      success: false,
      message: "Failed to export route completion data",
      error: error.message,
    });
  }
};

module.exports = {
  OperationSummary,
  dailyPerformance,
  sampleCompletion,
  getFrequencyCount,
  deleteCountVehicle,
  updateCountVehicle,
  createCountVehicle,
  getRouteCompletion,
  updatePlannedTrips,
  exportRouteCompletionCSV,
};
