const PredefinedTimePeriod = require("../models/PrefefineTimePeriodModel");
const Project = require("../models/ProjectModel");
const logger = require("../utils/logger");

function toMinutes(timeStr) {
  let [time, period] = timeStr.split(" ");
  let [h, m] = time.split(":").map(Number);
  period = period.toUpperCase();
  if (period === "PM" && h !== 12) h += 12;
  if (period === "AM" && h === 12) h = 0;
  return h * 60 + m;
}

const createTimePeriod = async (req, res, next) => {
  try {
    const { name, from_time, to_time, project_id } = req.body;
    const created_by = req.user.id;

    if (!name || !from_time || !to_time || !project_id) {
      return res.status(400).json({
        success: false,
        message: "Name, from_time, to_time, and project_id are required",
      });
    }

    if (!/^[0-9a-fA-F]{24}$/.test(project_id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid project_id format",
      });
    }

    const project = await Project.findById(project_id);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    if (!/^(0[1-9]|1[0-2]):[0-5][0-9]\s?(AM|PM)$/i.test(from_time)) {
      return res.status(400).json({
        success: false,
        message: "Invalid from_time format",
      });
    }

    if (!/^(0[1-9]|1[0-2]):[0-5][0-9]\s?(AM|PM)$/i.test(to_time)) {
      return res.status(400).json({
        success: false,
        message: "Invalid to_time format",
      });
    }

    if (toMinutes(from_time) >= toMinutes(to_time)) {
      return res.status(400).json({
        success: false,
        message: "from_time must be before to_time",
      });
    }

    const existing = await PredefinedTimePeriod.findOne({
      name,
      project_id,
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        message: "Time period with this name already exists for this project",
      });
    }

    const timePeriod = new PredefinedTimePeriod({
      name,
      from_time,
      to_time,
      project_id,
      created_by,
      updated_by: created_by,
    });

    await timePeriod.save();
    await timePeriod.populate([
      { path: "project_id", select: "name project_code" },
      { path: "created_by", select: "name email" },
    ]);

    logger.info(
      `Time period created: ${name} for project: ${project_id} by user: ${created_by}`
    );

    res.status(201).json({
      success: true,
      message: "Time period created successfully",
      data: timePeriod,
    });
  } catch (error) {
    logger.error(`Create time period error: ${error.message}`, {
      stack: error.stack,
      userId: req.user?.id,
    });
    next(error);
  }
};

const getAllTimePeriods = async (req, res, next) => {
  try {
    const { project_id, page = 1, limit = 10 } = req.query;

    const filter = {};
    if (project_id) {
      if (!/^[0-9a-fA-F]{24}$/.test(project_id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid project_id format",
        });
      }
      filter.project_id = project_id;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    let timePeriods = await PredefinedTimePeriod.find(filter)
      .populate("project_id", "name project_code")
      .populate("created_by", "name email")
      .populate("updated_by", "name email")
      .sort({ from_time: 1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Convert 12-hour to 24-hour before sending
    const convert12To24 = (time12) => {
      if (!time12) return "";
      let [time, modifier] = time12.split(" ");
      let [hours, minutes] = time.split(":");
      hours = parseInt(hours, 10);
      if (modifier === "PM" && hours !== 12) hours += 12;
      if (modifier === "AM" && hours === 12) hours = 0;
      return `${String(hours).padStart(2, "0")}:${minutes}`;
    };

    timePeriods = timePeriods.map((item) => ({
      ...item._doc,
      from_time: convert12To24(item.from_time),
      to_time: convert12To24(item.to_time),
    }));

    const total = await PredefinedTimePeriod.countDocuments(filter);

    res.json({
      success: true,
      message: "Time periods fetched successfully",
      data: timePeriods,
      pagination: {
        current_page: parseInt(page),
        total_pages: Math.ceil(total / parseInt(limit)),
        total_records: total,
        per_page: parseInt(limit),
      },
    });
  } catch (error) {
    logger.error(`Fetch all time periods error: ${error.message}`, {
      stack: error.stack,
    });
    next(error);
  }
};

const getTimePeriodById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!/^[0-9a-fA-F]{24}$/.test(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid ID format",
      });
    }

    const timePeriod = await PredefinedTimePeriod.findById(id)
      .populate("project_id", "name project_code")
      .populate("created_by", "name email")
      .populate("updated_by", "name email");

    if (!timePeriod) {
      return res.status(404).json({
        success: false,
        message: "Time period not found",
      });
    }

    res.json({
      success: true,
      message: "Time period fetched successfully",
      data: timePeriod,
    });
  } catch (error) {
    logger.error(`Fetch time period by ID error: ${error.message}`, {
      stack: error.stack,
      id: req.params.id,
    });
    next(error);
  }
};

const updateTimePeriod = async (req, res, next) => {
  try {
    const { name, from_time, to_time, project_id } = req.body;
    const updated_by = req.user.id;
    const { id } = req.params;

    if (!/^[0-9a-fA-F]{24}$/.test(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid ID format",
      });
    }

    const existing = await PredefinedTimePeriod.findById(id);
    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "Time period not found",
      });
    }

    if (project_id) {
      if (!/^[0-9a-fA-F]{24}$/.test(project_id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid project_id format",
        });
      }

      const project = await Project.findById(project_id);
      if (!project) {
        return res.status(404).json({
          success: false,
          message: "Project not found",
        });
      }
    }

    const updateData = { updated_by };

    if (name !== undefined) updateData.name = name;
    if (project_id !== undefined) updateData.project_id = project_id;

    if (from_time !== undefined) {
      if (!/^(0[1-9]|1[0-2]):[0-5][0-9]\s?(AM|PM)$/i.test(from_time)) {
        return res.status(400).json({
          success: false,
          message: "Invalid from_time format",
        });
      }
      updateData.from_time = from_time;
    }

    if (to_time !== undefined) {
      if (!/^(0[1-9]|1[0-2]):[0-5][0-9]\s?(AM|PM)$/i.test(to_time)) {
        return res.status(400).json({
          success: false,
          message: "Invalid to_time format",
        });
      }
      updateData.to_time = to_time;
    }

    const finalFrom = updateData.from_time || existing.from_time;
    const finalTo = updateData.to_time || existing.to_time;

    if (toMinutes(finalFrom) >= toMinutes(finalTo)) {
      return res.status(400).json({
        success: false,
        message: "from_time must be before to_time",
      });
    }

    if (name || project_id) {
      const duplicate = await PredefinedTimePeriod.findOne({
        name: name || existing.name,
        project_id: project_id || existing.project_id,
        _id: { $ne: id },
      });

      if (duplicate) {
        return res.status(409).json({
          success: false,
          message: "Time period with this name already exists for this project",
        });
      }
    }

    const timePeriod = await PredefinedTimePeriod.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    )
      .populate("project_id", "name project_code")
      .populate("created_by", "name email")
      .populate("updated_by", "name email");

    logger.info(
      `Time period updated: ${timePeriod.name} by user: ${updated_by}`
    );

    res.json({
      success: true,
      message: "Time period updated successfully",
      data: timePeriod,
    });
  } catch (error) {
    logger.error(`Update time period error: ${error.message}`, {
      stack: error.stack,
      id: req.params.id,
      userId: req.user?.id,
    });
    next(error);
  }
};

const deleteTimePeriod = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!/^[0-9a-fA-F]{24}$/.test(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid ID format",
      });
    }

    const timePeriod = await PredefinedTimePeriod.findByIdAndDelete(id);

    if (!timePeriod) {
      return res.status(404).json({
        success: false,
        message: "Time period not found",
      });
    }

    logger.info(
      `Time period deleted: ${timePeriod.name} by user: ${req.user?.id}`
    );

    res.json({
      success: true,
      message: "Time period deleted successfully",
      data: { id: timePeriod._id },
    });
  } catch (error) {
    logger.error(`Delete time period error: ${error.message}`, {
      stack: error.stack,
      id: req.params.id,
      userId: req.user?.id,
    });
    next(error);
  }
};

module.exports = {
  createTimePeriod,
  getAllTimePeriods,
  getTimePeriodById,
  updateTimePeriod,
  deleteTimePeriod,
};
