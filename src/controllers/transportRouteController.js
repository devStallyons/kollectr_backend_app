const TransportRoute = require("../models/transportRouteModel");
const TransportStop = require("../models/transportStopModel");

const createTransportRoute = async (req, res, next) => {
  try {
    const { forwardStops, reverseStops, type, project_id } = req.body;

    if (
      !Array.isArray(forwardStops) ||
      forwardStops.length < 2 ||
      reverseStops.length < 2
    ) {
      return res.status(400).json({
        message: "At least two forward and reverse stops are required",
      });
    }
    if (!project_id) {
      return res.status(400).json({ message: "Project ID is required" });
    }

    const stopDocs = await TransportStop.find({
      _id: { $in: [forwardStops[0], forwardStops[1]] },
    });

    if (stopDocs.length < 2) {
      return res
        .status(400)
        .json({ message: "Invalid stop IDs for route code generation" });
    }

    const code = `${stopDocs[0].name}-${stopDocs[1].name}`;

    const existing = await TransportRoute.findOne({ code });
    if (existing) {
      return res
        .status(409)
        .json({ message: "Route with same code already exists" });
    }

    const newRoute = await TransportRoute.create({
      code,
      type: type || "straight",
      forwardStops,
      reverseStops,
      project_id,
    });

    res.status(201).json(newRoute);
  } catch (err) {
    next(err);
  }
};

const getAllTransportRoutes = async (req, res, next) => {
  try {
    const { project_id } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    let filter = {};
    if (project_id) {
      filter.project_id = project_id;
    }

    const total = await TransportRoute.countDocuments(filter);

    const routes = await TransportRoute.find(filter)
      .populate("forwardStops", "name")
      .populate("reverseStops", "name")
      .populate({
        path: "project_id",
        select: "project_code name",
      })
      .skip(skip)
      .limit(limit);

    const formattedRoutes = routes.map((route) => ({
      _id: route._id,
      code: route.code,
      type: route.type,
      project: route.project_id
        ? {
            project_code: route.project_id.project_code,
            name: route.project_id.name,
          }
        : null,
      forwardStops: route.forwardStops.map((stop) => stop.name),
      reverseStops: route.reverseStops.map((stop) => stop.name),
    }));

    const totalPages = Math.ceil(total / limit);

    res.status(200).json({
      success: true,
      count: formattedRoutes.length,
      data: formattedRoutes,
      pagination: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    });
  } catch (err) {
    res.status(500);
    next(
      new Error(
        "Failed to fetch transport routes. Please try again later.",
        err
      )
    );
  }
};

const getTransportRouteById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { project_id } = req.query;

    let filter = { _id: id };
    if (project_id) {
      filter.project_id = project_id;
    }

    const route = await TransportRoute.findOne(filter)
      .populate("forwardStops", "name")
      .populate("reverseStops", "name")
      .populate({
        path: "project_id",
        select: "project_code name",
      })
      .lean();

    if (!route) {
      res.status(404);
      return next(new Error("Transport route not found"));
    }

    const formattedRoute = {
      _id: route._id,
      code: route.code,
      type: route.type,
      forwardStops: route.forwardStops.map((stop) => stop.name),
      reverseStops: route.reverseStops.map((stop) => stop.name),
      project: route.project_id
        ? {
            project_code: route.project_id.project_code,
            name: route.project_id.name,
          }
        : null,
    };

    res.status(200).json({
      success: true,
      data: formattedRoute,
    });
  } catch (err) {
    res.status(500);
    next(new Error("Failed to retrieve the transport route", err));
  }
};

const updateTransportRoute = async (req, res, next) => {
  try {
    const route = await TransportRoute.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
      }
    )
      .populate("forwardStops", "name")
      .populate("reverseStops", "name");

    if (!route) {
      res.status(404);
      return next(new Error("Transport route not found"));
    }

    const formattedRoute = {
      _id: route._id,
      code: route.code,
      type: route.type,
      forwardStops: route.forwardStops.map((stop) => stop.name),
      reverseStops: route.reverseStops.map((stop) => stop.name),
      //   createdAt: route.createdAt,
      //   updatedAt: route.updatedAt,
    };

    res.status(200).json({
      success: true,
      message: "Transport route updated successfully",
      data: formattedRoute,
    });
  } catch (err) {
    res.status(500);
    next(new Error("Failed to update the transport route"));
  }
};

const deleteTransportRoute = async (req, res, next) => {
  try {
    const route = await TransportRoute.findByIdAndDelete(req.params.id);
    if (!route) return res.status(404).json({ message: "Route not found" });

    res.json({ message: "Transport route deleted" });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createTransportRoute,
  getAllTransportRoutes,
  getTransportRouteById,
  updateTransportRoute,
  deleteTransportRoute,
};
