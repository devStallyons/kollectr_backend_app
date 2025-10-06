const Project = require("../models/ProjectModel");
const logger = require("../utils/logger");

const createProject = async (req, res, next) => {
  try {
    const {
      projectcode,
      name,
      description,
      timezone,
      status,
      prepend_code_to_route_name,
      auto_determine_time_period,
      auto_snap_to_road,
      min_trip_distance_km,
      min_passenger_travel_distance_km,
      capture_per_passenger_info,
      auto_determine_direction,
      min_gps_loss_distance_km,
      trip_distance_threshold_km,
    } = req.body;

    const created_by = req.user.id;

    if (!projectcode || !name) {
      return res.status(400).json({
        success: false,
        message: "Project code and name are required",
      });
    }

    const existingProject = await Project.findOne({
      project_code: projectcode,
    });
    if (existingProject) {
      return res.status(409).json({
        success: false,
        message: "Project with this project code already exists",
      });
    }

    const project = new Project({
      project_code: projectcode,
      name,
      description,
      timezone,
      status,
      prepend_code_to_route_name,
      auto_determine_time_period,
      auto_snap_to_road,
      min_trip_distance_km,
      min_passenger_travel_distance_km,
      capture_per_passenger_info,
      auto_determine_direction,
      min_gps_loss_distance_km,
      trip_distance_threshold_km,
      created_by,
      updated_by: created_by,
    });

    await project.save();

    await project.populate("created_by", "name email");

    logger.info(
      `Project created successfully: ${project.project_code} by user: ${created_by}`
    );

    res.status(201).json({
      success: true,
      message: "Project created successfully",
      data: project,
    });
  } catch (error) {
    logger.error(`Create project error: ${error.message}`, {
      stack: error.stack,
      userId: req.user?.id,
    });
    next(error);
  }
};

const getAllProjects = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;

    const filter = {};
    if (status) {
      filter.status = status;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const projects = await Project.find(filter)
      .populate("created_by", "name email")
      .populate("updated_by", "name email")
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Project.countDocuments(filter);

    res.json({
      success: true,
      message: "Projects fetched successfully",
      data: projects,
      pagination: {
        current_page: parseInt(page),
        total_pages: Math.ceil(total / parseInt(limit)),
        total_records: total,
        per_page: parseInt(limit),
      },
    });
  } catch (error) {
    logger.error(`Fetch all projects error: ${error.message}`, {
      stack: error.stack,
    });
    next(error);
  }
};

const getProjectById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        message: "Invalid project ID format",
      });
    }

    const project = await Project.findById(id)
      .populate("created_by", "name email")
      .populate("updated_by", "name email");

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    res.json({
      success: true,
      message: "Project fetched successfully",
      data: project,
    });
  } catch (error) {
    logger.error(`Fetch project by ID error: ${error.message}`, {
      stack: error.stack,
      projectId: req.params.id,
    });
    next(error);
  }
};

const updateProject = async (req, res, next) => {
  try {
    const {
      projectcode,
      name,
      description,
      timezone,
      status,
      prepend_code_to_route_name,
      auto_determine_time_period,
      auto_snap_to_road,
      min_trip_distance_km,
      min_passenger_travel_distance_km,
      capture_per_passenger_info,
      auto_determine_direction,
      min_gps_loss_distance_km,
      trip_distance_threshold_km,
    } = req.body;

    const updated_by = req.user.id;
    const { id } = req.params;

    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        message: "Invalid project ID format",
      });
    }

    const existingProject = await Project.findById(id);
    if (!existingProject) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    if (projectcode && projectcode !== existingProject.project_code) {
      const duplicateProject = await Project.findOne({
        project_code: projectcode,
        _id: { $ne: id },
      });

      if (duplicateProject) {
        return res.status(409).json({
          success: false,
          message: "Project with this project code already exists",
        });
      }
    }

    const updateData = {
      updated_by,
    };

    if (projectcode !== undefined) updateData.project_code = projectcode;
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (timezone !== undefined) updateData.timezone = timezone;
    if (status !== undefined) updateData.status = status;
    if (prepend_code_to_route_name !== undefined)
      updateData.prepend_code_to_route_name = prepend_code_to_route_name;
    if (auto_determine_time_period !== undefined)
      updateData.auto_determine_time_period = auto_determine_time_period;
    if (auto_snap_to_road !== undefined)
      updateData.auto_snap_to_road = auto_snap_to_road;
    if (min_trip_distance_km !== undefined)
      updateData.min_trip_distance_km = min_trip_distance_km;
    if (min_passenger_travel_distance_km !== undefined)
      updateData.min_passenger_travel_distance_km =
        min_passenger_travel_distance_km;
    if (capture_per_passenger_info !== undefined)
      updateData.capture_per_passenger_info = capture_per_passenger_info;
    if (auto_determine_direction !== undefined)
      updateData.auto_determine_direction = auto_determine_direction;
    if (min_gps_loss_distance_km !== undefined)
      updateData.min_gps_loss_distance_km = min_gps_loss_distance_km;
    if (trip_distance_threshold_km !== undefined)
      updateData.trip_distance_threshold_km = trip_distance_threshold_km;

    const project = await Project.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    })
      .populate("created_by", "name email")
      .populate("updated_by", "name email");

    logger.info(
      `Project updated successfully: ${project.project_code} by user: ${updated_by}`
    );

    res.json({
      success: true,
      message: "Project updated successfully",
      data: project,
    });
  } catch (error) {
    logger.error(`Update project error: ${error.message}`, {
      stack: error.stack,
      projectId: req.params.id,
      userId: req.user?.id,
    });
    next(error);
  }
};

const deleteProject = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        message: "Invalid project ID format",
      });
    }

    const project = await Project.findByIdAndDelete(id);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    logger.info(
      `Project deleted: ${project.project_code} by user: ${req.user?.id}`
    );

    res.json({
      success: true,
      message: "Project deleted successfully",
      data: { id: project._id },
    });
  } catch (error) {
    logger.error(`Delete project error: ${error.message}`, {
      stack: error.stack,
      projectId: req.params.id,
      userId: req.user?.id,
    });
    next(error);
  }
};

module.exports = {
  createProject,
  getAllProjects,
  getProjectById,
  updateProject,
  deleteProject,
};
