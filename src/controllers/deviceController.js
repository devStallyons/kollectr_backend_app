const dayjs = require("dayjs");
const Device = require("../models/deviceModel");
const { generateUniqueCode } = require("../utils/generateRandomName");
const logger = require("../utils/logger");
const relativeTime = require("dayjs/plugin/relativeTime");
dayjs.extend(relativeTime);

const createOrUpdateDevice = async (req, res, next) => {
  try {
    const { project_id, configVersion, currentVersion } = req.body;
    // console.log(req.body);

    const user_id = req.user.id;

    if (!project_id || !user_id) {
      const error = new Error("project_id and user_id are required.");
      error.status = 400;
      return next(error);
    }

    let device = await Device.findOne({ user_id, project_id });
    const now = new Date();

    if (device) {
      device.lastSeen = now;

      if (configVersion) device.configVersion = configVersion;
      if (currentVersion) device.currentVersion = currentVersion;

      if (configVersion && currentVersion) {
        device.status =
          configVersion < currentVersion ? "update-required" : "up-to-date";
      }

      await device.save();
      logger.info(`Device updated: ${device._id}`);
      return res.status(200).json({ message: "Device updated", device });
    } else {
      const code = await generateUniqueCode();

      let status = undefined;
      if (configVersion && currentVersion) {
        status =
          configVersion < currentVersion ? "update-required" : "up-to-date";
      }

      device = new Device({
        code,
        connectedAt: now,
        lastSeen: now,
        configVersion,
        currentVersion,
        status,
        user_id,
        project_id,
      });

      await device.save();
      logger.info(`Device created: ${device._id}`);
      return res
        .status(201)
        .json({ success: true, message: "Device created", device });
    }
  } catch (err) {
    logger.error("Error in createOrUpdateDevice", err);
    next(err);
  }
};

const getAllDevices = async (req, res, next) => {
  try {
    const { project_id } = req.query;

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    let filter = {};
    if (project_id) {
      filter.project_id = project_id;
    }

    const total = await Device.countDocuments(filter);

    const devices = await Device.find(filter)
      .populate("project_id", "_id project_code name")
      .populate("user_id", "_id name")
      .skip(skip)
      .limit(limit);

    if (!devices || devices.length === 0) {
      return res.status(200).json({
        success: true,
        data: [],
        message: "No devices found",
        pagination: {
          total: 0,
          page,
          limit,
          totalPages: 0,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      });
    }

    const formattedDevices = devices.map((device) => ({
      ...device.toObject(),

      connectedAt: device.connectedAt
        ? dayjs(device.connectedAt).format("YYYY-MM-DD")
        : "N/A",

      lastSeen: device.lastSeen ? dayjs(device.lastSeen).fromNow() : "N/A",
    }));

    const totalPages = Math.ceil(total / limit);

    logger.info("Devices fetched successfully");

    res.status(200).json({
      success: true,
      data: formattedDevices,
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
    logger.error("Error in getAllDevices", err.message);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch devices",
      error: err.message,
    });
  }
};

const getDeviceById = async (req, res, next) => {
  try {
    const { id } = req.query;
    // console.log(id, req.query);

    let device = null;
    const user_id = req.user.id;

    if (id) {
      device = await Device.findById({ _id: id })
        .populate("project_id", "_id project_code name")
        .populate("user_id", "_id name");
    }

    if (!device && user_id) {
      device = await Device.findOne({ user_id })
        .populate("project_id", "_id project_code name")
        .populate("user_id", "_id name");
    }

    if (!device) {
      const error = new Error("Device not found");
      error.status = 404;
      return next(error);
    }

    logger.info(`Fetched device: ${device._id}`);
    res
      .status(200)
      .json({ success: true, message: "Device fetched successfully", device });
  } catch (err) {
    logger.error("Error in getDeviceById", err);
    next(err);
  }
};

const deleteDevice = async (req, res, next) => {
  try {
    const deleted = await Device.findByIdAndDelete(req.params.id);

    if (!deleted) {
      const error = new Error("Device not found");
      error.status = 404;
      return next(error);
    }

    logger.info(`Device deleted: ${deleted._id}`);
    res
      .status(200)
      .json({ success: true, message: "Device deleted successfully" });
  } catch (err) {
    logger.error("Error in deleteDevice", err);
    next(err);
  }
};

module.exports = {
  createOrUpdateDevice,
  getAllDevices,
  getDeviceById,
  deleteDevice,
};
