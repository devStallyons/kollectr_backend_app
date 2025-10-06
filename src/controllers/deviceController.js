const Device = require("../models/deviceModel");
const { generateUniqueCode } = require("../utils/generateRandomName");
const logger = require("../utils/logger");

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
      return res.status(201).json({ message: "Device created", device });
    }
  } catch (err) {
    logger.error("Error in createOrUpdateDevice", err);
    next(err);
  }
};

const getAllDevices = async (req, res, next) => {
  try {
    const devices = await Device.find()
      .populate("project_id", "_id project_code name")
      .populate("user_id", "_id name");

    logger.info("Fetched all devices");
    res.status(200).json(devices);
  } catch (err) {
    logger.error("Error in getAllDevices", err);
    next(err);
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
    res.status(200).json(device);
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
    res.status(200).json({ message: "Device deleted" });
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
