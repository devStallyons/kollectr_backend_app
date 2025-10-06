const CountVehicle = require("../models/countVehicleModel");
const countLocation = require("../models/countLocationModel");

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

const getAllCountVehicles = async (req, res, next) => {
  try {
    const vehicles = await CountVehicle.find()
      .populate("vehicleType", "_id type")
      .populate("route", "_id code type")
      .select("-__v");

    res.status(200).json({
      success: true,
      data: vehicles,
    });
  } catch (error) {
    next(error);
  }
};

const getCountVehicleById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const vehicle = await CountVehicle.findById(id)
      .populate("vehicleType")
      .populate("route");

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: "Vehicle not found",
      });
    }

    res.status(200).json({
      success: true,
      data: vehicle,
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

const getCountVehiclesByRoute = async (req, res, next) => {
  try {
    const { id } = req.params;

    const vehicles = await CountVehicle.find({ _id: id })
      .populate("vehicleType", "_id type")
      .populate("route", "_id code type")
      .select("-__v");

    const formattedData = vehicles.map((v) => ({
      time: v.createdAt.toTimeString().split(" ")[0],
      route: v.route?.type || "N/A",
      direction: v.direction,
      vehicle_reg: v.licensePlate,
      vehicle_type: v.vehicleType?.type || "N/A",
      vehicle_capacity: v.loadStatus,
    }));

    res.status(200).json({
      success: true,
      data: formattedData,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createCountVehicle,
  getAllCountVehicles,
  getCountVehicleById,
  updateCountVehicle,
  deleteCountVehicle,
};
