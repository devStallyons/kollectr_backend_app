const TransportStop = require("../models/transportStopModel");
const parseCSV = require("../utils/parseCSV");

const createTransportStop = async (req, res, next) => {
  try {
    const { name, code, coordinates, project_id } = req.body;

    if (!name || !code || coordinates.length !== 2 || !project_id) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const [latitude, longitude] = coordinates;
    const exists = await TransportStop.findOne({ code });
    if (exists) {
      return res.status(400).json({ message: "Code already exists" });
    }

    const stop = await TransportStop.create({
      name,
      code,
      coordinates,
      project_id,
      // latitude,
      // longitude,
    });
    res.status(201).json({
      success: true,
      data: stop,
    });
  } catch (err) {
    next(err);
  }
};

const uploadTransportStopsFromCSV = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "CSV file is required" });
    }

    const filePath = req.file.path;

    const transportStops = await parseCSV(filePath, (row, rowIndex) => {
      const { name, code, latitude, longitude } = row;

      if (!name || !code || !latitude || !longitude) {
        throw new Error(
          `Missing required field(s) in CSV at row ${rowIndex + 2}`
        );
      }

      return {
        name: name.trim(),
        code: code.trim(),
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
      };
    });

    const inserted = await TransportStop.insertMany(transportStops, {
      ordered: false,
    });

    res.status(201).json({
      message: "Transport stops added",
      count: inserted.length,
      success: true,
    });
  } catch (error) {
    next(error);
  }
};

const getAllTransportStops = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const total = await TransportStop.countDocuments();

    const stops = await TransportStop.find()
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
      data: stops,
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
    next(err);
  }
};

const getTransportStopById = async (req, res, next) => {
  try {
    const stop = await TransportStop.findById(req.params.id)
      .populate({
        path: "project_id",
        select: "project_code name",
      })
      .lean();
    if (!stop) return res.status(404).json({ message: "Stop not found" });
    res.status(200).json({
      success: true,
      data: stop,
    });
  } catch (err) {
    next(err);
  }
};

const updateTransportStop = async (req, res, next) => {
  try {
    const stop = await TransportStop.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true,
      }
    );
    if (!stop) return res.status(404).json({ message: "Stop not found" });
    res.status(200).json({
      success: true,
      data: stop,
    });
  } catch (err) {
    next(err);
  }
};

const deleteTransportStop = async (req, res, next) => {
  try {
    const stop = await TransportStop.findByIdAndDelete(req.params.id);
    if (!stop) return res.status(404).json({ message: "Stop not found" });
    res.json({ message: "Transport stop deleted" });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createTransportStop,
  uploadTransportStopsFromCSV,
  getAllTransportStops,
  getTransportStopById,
  updateTransportStop,
  deleteTransportStop,
};
