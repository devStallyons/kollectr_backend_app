const VehicleType = require("../models/vehicleTypeModel");
const parseCSV = require("../utils/parseCSV");

const createVehicleType = async (req, res, next) => {
  try {
    const { type, project_id } = req.body;
    if (!type || !project_id)
      return res
        .status(400)
        .json({ message: "type and project_id are required" });

    const vehicleType = await VehicleType.create({ type, project_id });
    res.status(201).json({
      success: true,
      data: vehicleType,
    });
  } catch (error) {
    next(error);
  }
};

const uploadVehicleTypesFromCSV = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "CSV file is required" });
    }

    const filePath = req.file.path;

    const vehicleTypes = await parseCSV(filePath, (row) => {
      if (row.vehicle_type) {
        return { type: row.vehicle_type.trim() };
      }
      return null;
    });

    const inserted = await VehicleType.insertMany(vehicleTypes, {
      ordered: false,
    });

    res
      .status(201)
      .json({ message: "Vehicle types added", count: inserted.length });
  } catch (error) {
    next(error);
  }
};

const getAllVehicleTypes = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const total = await VehicleType.countDocuments();

    const vehicleTypes = await VehicleType.find()
      .populate({
        path: "project_id",
        select: "project_code name",
      })
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit);

    const totalPages = Math.ceil(total / limit);

    res.status(200).json({
      success: true,
      data: vehicleTypes,
      pagination: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    });
  } catch (error) {
    next(error);
  }
};

const getVehicleTypeById = async (req, res, next) => {
  try {
    const vehicleType = await VehicleType.findById(req.params.id)
      .populate({
        path: "project_id",
        select: "project_code name",
      })
      .lean();
    if (!vehicleType) return res.status(404).json({ message: "Not found" });

    res.status(200).json({
      success: true,
      data: vehicleType,
    });
  } catch (error) {
    next(error);
  }
};

const updateVehicleType = async (req, res, next) => {
  try {
    const { type } = req.body;
    const vehicleType = await VehicleType.findByIdAndUpdate(
      req.params.id,
      { type },
      { new: true }
    );

    if (!vehicleType) return res.status(404).json({ message: "Not found" });
    res.status(200).json({
      success: true,
      data: vehicleType,
    });
  } catch (error) {
    next(error);
  }
};

const deleteVehicleType = async (req, res, next) => {
  try {
    const vehicleType = await VehicleType.findByIdAndDelete(req.params.id);
    if (!vehicleType) return res.status(404).json({ message: "Not found" });
    res.json({ message: "Deleted successfully" });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createVehicleType,
  uploadVehicleTypesFromCSV,
  getAllVehicleTypes,
  getVehicleTypeById,
  updateVehicleType,
  deleteVehicleType,
};
