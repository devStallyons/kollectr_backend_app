const Trip = require("../models/tripModel");

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

const dailyPerformance = async (req, res, next) => {
  try {
    const { date, page = 1, limit = 10 } = req.query;

    // Convert page and limit to numbers
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Set match stage based on date parameter
    let matchStage = {};

    if (date) {
      // If date is provided, filter by that date
      const start = new Date(date);
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(end.getDate() + 1);

      matchStage = {
        createdAt: { $gte: start, $lt: end },
      };
    }
    // If no date, matchStage remains empty and will fetch all data

    // Aggregation pipeline
    const pipeline = [
      // Match trips - if date provided, filter by date, otherwise get all
      {
        $match: matchStage,
      },

      // Convert gpsAccuracy to number for comparison
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

      // Mark as issue if GPS accuracy > 20
      {
        $addFields: {
          isIssue: { $gt: ["$gpsAccuracyNum", 20] },
        },
      },

      // Lookup mapper (user) information
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

      // Lookup route information
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

      // Group by route, direction, and mapper
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

      // Calculate healthy trips
      {
        $addFields: {
          healthyTrips: { $subtract: ["$totalTrips", "$issueTrips"] },
        },
      },

      // Sort by route and direction
      {
        $sort: {
          "_id.routeName": 1,
          "_id.direction": 1,
          "_id.mapperName": 1,
        },
      },
    ];

    const results = await Trip.aggregate(pipeline).exec();

    // Transform data into table format
    const routeMap = {};
    const allPersons = new Set();
    const personSummary = {};

    // Process each result
    results.forEach((item) => {
      const routeKey = `${item._id.routeName}|${item._id.direction}`;
      const personName = item._id.mapperName;

      allPersons.add(personName);

      // Initialize person summary if not exists
      if (!personSummary[personName]) {
        personSummary[personName] = {
          totalTrips: 0,
          healthyTrips: 0,
          issueTrips: 0,
        };
      }

      // Add to person summary
      personSummary[personName].totalTrips += item.totalTrips;
      personSummary[personName].healthyTrips += item.healthyTrips;
      personSummary[personName].issueTrips += item.issueTrips;

      // Initialize route row if it doesn't exist
      if (!routeMap[routeKey]) {
        routeMap[routeKey] = {
          route: item._id.routeName,
          tp: "All",
          direction: item._id.direction === "forward" ? "F" : "R",
          persons: {},
        };
      }

      // Add person data
      routeMap[routeKey].persons[personName] = {
        healthy: item.healthyTrips,
        issue: item.issueTrips,
        total: item.totalTrips,
        goal: 0, // Default goal - can be fetched from a goals collection
      };
    });

    // Convert to array and sort
    let tableRows = Object.values(routeMap);
    const personsArray = Array.from(allPersons).sort();

    // Fill missing persons with zero values
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

    // Calculate totals row (before pagination)
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

    // Pagination logic
    const totalRecords = tableRows.length;
    const totalPages = Math.ceil(totalRecords / limitNum);

    // Apply pagination (don't paginate the totals row)
    const paginatedRows = tableRows.slice(skip, skip + limitNum);

    // Add totals row to paginated data
    paginatedRows.push(totalsRow);

    // Return formatted response
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

module.exports = { OperationSummary, dailyPerformance };
