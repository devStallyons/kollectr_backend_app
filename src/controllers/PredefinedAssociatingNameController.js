const PredefinedAssociatingName = require("../models/PredefinedAssociatingNameModel");
const Project = require("../models/ProjectModel");
const logger = require("../utils/logger");

const createAssociatingName = async (req, res, next) => {
  try {
    const { name, project_id } = req.body;
    const created_by = req.user.id;

    if (!name || !project_id) {
      return res.status(400).json({
        success: false,
        message: "Name and project_id are required",
      });
    }

    if (!project_id.match(/^[0-9a-fA-F]{24}$/)) {
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

    const existingName = await PredefinedAssociatingName.findOne({
      name,
      project_id,
    });

    if (existingName) {
      return res.status(409).json({
        success: false,
        message: "Associating name already exists for this project",
      });
    }

    const associatingName = new PredefinedAssociatingName({
      name,
      project_id,
      created_by,
      updated_by: created_by,
    });

    await associatingName.save();
    await associatingName.populate([
      { path: "project_id", select: "name project_code" },
      { path: "created_by", select: "name email" },
    ]);

    logger.info(
      `Associating name created: ${name} for project: ${project_id} by user: ${created_by}`
    );

    res.status(201).json({
      success: true,
      message: "Associating name created successfully",
      data: associatingName,
    });
  } catch (error) {
    logger.error(`Create associating name error: ${error.message}`, {
      stack: error.stack,
      userId: req.user?.id,
    });
    next(error);
  }
};

const getAllAssociatingNames = async (req, res, next) => {
  try {
    const { project_id, page = 1, limit = 10 } = req.query;

    const filter = {};
    if (project_id) {
      if (!project_id.match(/^[0-9a-fA-F]{24}$/)) {
        return res.status(400).json({
          success: false,
          message: "Invalid project_id format",
        });
      }
      filter.project_id = project_id;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const associatingNames = await PredefinedAssociatingName.find(filter)
      .populate("project_id", "name project_code")
      .populate("created_by", "name email")
      .populate("updated_by", "name email")
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await PredefinedAssociatingName.countDocuments(filter);

    res.json({
      success: true,
      message: "Associating names fetched successfully",
      data: associatingNames,
      pagination: {
        current_page: parseInt(page),
        total_pages: Math.ceil(total / parseInt(limit)),
        total_records: total,
        per_page: parseInt(limit),
      },
    });
  } catch (error) {
    logger.error(`Fetch all associating names error: ${error.message}`, {
      stack: error.stack,
    });
    next(error);
  }
};

const getAssociatingNameById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        message: "Invalid ID format",
      });
    }

    const associatingName = await PredefinedAssociatingName.findById(id)
      .populate("project_id", "name project_code")
      .populate("created_by", "name email")
      .populate("updated_by", "name email");

    if (!associatingName) {
      return res.status(404).json({
        success: false,
        message: "Associating name not found",
      });
    }

    res.json({
      success: true,
      message: "Associating name fetched successfully",
      data: associatingName,
    });
  } catch (error) {
    logger.error(`Fetch associating name by ID error: ${error.message}`, {
      stack: error.stack,
      id: req.params.id,
    });
    next(error);
  }
};

const updateAssociatingName = async (req, res, next) => {
  try {
    const { name, project_id } = req.body;
    const updated_by = req.user.id;
    const { id } = req.params;

    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        message: "Invalid ID format",
      });
    }

    const existingName = await PredefinedAssociatingName.findById(id);
    if (!existingName) {
      return res.status(404).json({
        success: false,
        message: "Associating name not found",
      });
    }

    if (project_id) {
      const project = await Project.findById(project_id);
      if (!project) {
        return res.status(404).json({
          success: false,
          message: "Project not found",
        });
      }
    }

    if (name || project_id) {
      const duplicateName = await PredefinedAssociatingName.findOne({
        name: name || existingName.name,
        project_id: project_id || existingName.project_id,
        _id: { $ne: id },
      });

      if (duplicateName) {
        return res.status(409).json({
          success: false,
          message: "Associating name already exists for this project",
        });
      }
    }

    const updateData = { updated_by };
    if (name !== undefined) updateData.name = name;
    if (project_id !== undefined) updateData.project_id = project_id;

    const associatingName = await PredefinedAssociatingName.findByIdAndUpdate(
      id,
      updateData,
      {
        new: true,
        runValidators: true,
      }
    )
      .populate("project_id", "name project_code")
      .populate("created_by", "name email")
      .populate("updated_by", "name email");

    logger.info(
      `Associating name updated: ${associatingName.name} by user: ${updated_by}`
    );

    res.json({
      success: true,
      message: "Associating name updated successfully",
      data: associatingName,
    });
  } catch (error) {
    logger.error(`Update associating name error: ${error.message}`, {
      stack: error.stack,
      id: req.params.id,
      userId: req.user?.id,
    });
    next(error);
  }
};

const deleteAssociatingName = async (req, res, next) => {
  try {
    const { id } = req.params;

    const associatingName = await PredefinedAssociatingName.findByIdAndDelete(
      id
    );

    if (!associatingName) {
      return res.status(404).json({
        success: false,
        message: "Associating name not found",
      });
    }

    logger.info(
      `Associating name deleted: ${associatingName.name} by user: ${req.user?.id}`
    );

    res.json({
      success: true,
      message: "Associating name deleted successfully",
      data: { id: associatingName._id },
    });
  } catch (error) {
    logger.error(`Delete associating name error: ${error.message}`, {
      stack: error.stack,
      id: req.params.id,
      userId: req.user?.id,
    });
    next(error);
  }
};

module.exports = {
  createAssociatingName,
  getAllAssociatingNames,
  getAssociatingNameById,
  updateAssociatingName,
  deleteAssociatingName,
};
