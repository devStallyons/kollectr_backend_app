const Project = require("../models/ProjectModel");
const { generateProjectCode } = require("../utils/generateTripAndStopId");
const logger = require("../utils/logger");

// for other model
const Company = require("../models/companyModel");
const CountLocation = require("../models/countLocationModel");
const CountVehicle = require("../models/countVehicleModel");
const Form = require("../models/formModel");

const PredefinedAssociatingName = require("../models/PredefinedAssociatingNameModel");
const PredefinedSurveyPeriod = require("../models/PredefinedSurveyPeriodModel");
const PredefinedTimePeriod = require("../models/PrefefineTimePeriodModel");

const TransportRoute = require("../models/transportRouteModel");
const TransportStop = require("../models/transportStopModel");
const Trip = require("../models/tripModel");
const TripStop = require("../models/tripStopModel");
const User = require("../models/userModel");
const VehicleType = require("../models/vehicleTypeModel");
const { default: mongoose } = require("mongoose");
const userProjectModel = require("../models/userProjectModel");

const createProject = async (req, res, next) => {
  try {
    const {
      // projectcode,
      projectName,
      description,
      timezone = "Asia/Karachi",
      status = "active",
      prepend_code_to_route_name = false,
      auto_determine_time_period = false,
      auto_snap_to_road = false,
      min_trip_distance_km = 0,
      min_passenger_travel_distance_km = 0,
      capture_per_passenger_info = false,
      auto_determine_direction = false,
      min_gps_loss_distance_km = 0,
      trip_distance_threshold_km = 0,
    } = req.body;

    const created_by = req.user.id;

    if (!projectName) {
      return res.status(400).json({
        success: false,
        message: "Project code and name are required",
      });
    }

    // const existingProject = await Project.findOne({
    //   project_code: projectcode,
    // });
    // if (existingProject) {
    //   return res.status(409).json({
    //     success: false,
    //     message: "Project with this project code already exists",
    //   });
    // }

    const projectcode = await generateProjectCode();

    const project = new Project({
      project_code: projectcode,
      name: projectName,
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
    const userId = req.user.id;
    const userRole = req.user.role;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    let projects;
    let total;

    if (userRole === "superadmin") {
      const filter = {};
      if (status) {
        filter.status = status;
      }

      projects = await Project.find(filter)
        .populate("created_by", "name email")
        .populate("updated_by", "name email")
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(parseInt(limit));

      total = await Project.countDocuments(filter);
    } else {
      const userProjects = await userProjectModel
        .find({
          user_id: userId,
          status: "active",
        })
        .select("project_id");

      const projectIds = userProjects.map((up) => up.project_id);

      const projectFilter = {
        _id: { $in: projectIds },
      };

      if (status) {
        projectFilter.status = status;
      }

      projects = await Project.find(projectFilter)
        .populate("created_by", "name email")
        .populate("updated_by", "name email")
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(parseInt(limit));

      total = await Project.countDocuments(projectFilter);
    }

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

// const getAllProjects = async (req, res, next) => {
//   try {
//     const { status, page = 1, limit = 10 } = req.query;

//     const filter = {};
//     if (status) {
//       filter.status = status;
//     }

//     const skip = (parseInt(page) - 1) * parseInt(limit);

//     const projects = await Project.find(filter)
//       .populate("created_by", "name email")
//       .populate("updated_by", "name email")
//       .sort({ created_at: -1 })
//       .skip(skip)
//       .limit(parseInt(limit));

//     const total = await Project.countDocuments(filter);

//     res.json({
//       success: true,
//       message: "Projects fetched successfully",
//       data: projects,
//       pagination: {
//         current_page: parseInt(page),
//         total_pages: Math.ceil(total / parseInt(limit)),
//         total_records: total,
//         per_page: parseInt(limit),
//       },
//     });
//   } catch (error) {
//     logger.error(`Fetch all projects error: ${error.message}`, {
//       stack: error.stack,
//     });
//     next(error);
//   }
// };

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
    console.error("", error);
    logger.error(`Update project error: ${error.message}`, {
      stack: error.stack,
      projectId: req.params.id,
      userId: req.user?.id,
    });
    next(error);
  }
};

const deleteProject = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { id } = req.params;
    const { deleteUsers = false } = req.query; // Optional query param

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid project ID format",
      });
    }

    const project = await Project.findById(id).session(session);

    if (!project) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    const projectCode = project.project_code;

    // Cascade delete all associated data
    const deletionResults = await cascadeDeleteProject(
      id,
      { deleteUsers: deleteUsers === "true" },
      session
    );

    await session.commitTransaction();
    session.endSession();

    const totalDeleted = Object.values(deletionResults).reduce(
      (sum, count) => sum + count,
      0
    );
    // remaing projects
    const remainingProjects = await Project.find()
      .populate("created_by", "name email")
      .sort({ created_at: -1 });

    logger.info(
      `Project cascade deleted: ${projectCode} by user: ${req.user?.id}`,
      { deletionResults }
    );

    res.json({
      success: true,
      message: "Project and all associated data deleted successfully",
      data: {
        deletedProject: {
          projectId: id,
          projectCode,
        },
        totalRecordsDeleted: totalDeleted,
        deletionDetails: deletionResults,
        remainingProjects: remainingProjects,
        remainingCount: remainingProjects.length,
        suggestedNextProject:
          remainingProjects.length > 0 ? remainingProjects[0] : null,
      },
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error("deleteing project", error);

    logger.error(`Delete project cascade error: ${error.message}`, {
      stack: error.stack,
      projectId: req.params.id,
      userId: req.user?.id,
    });
    next(error);
  }
};

const cascadeDeleteProject = async (projectId, options = {}, session) => {
  const { deleteUsers = false } = options;
  const results = {};

  const trips = await Trip.find({ project_id: projectId })
    .select("_id")
    .session(session);
  const tripIds = trips.map((t) => t._id);

  const deletionTasks = [
    {
      name: "tripStops",
      model: TripStop,
      query: { trip: { $in: tripIds } },
    },
    {
      name: "trips",
      model: Trip,
      query: { project_id: projectId },
    },
    {
      name: "countVehicles",
      model: CountVehicle,
      query: { project_id: projectId },
    },
    {
      name: "transportRoutes",
      model: TransportRoute,
      query: { project_id: projectId },
    },
    {
      name: "transportStops",
      model: TransportStop,
      query: { project_id: projectId },
    },
    {
      name: "companies",
      model: Company,
      query: { project_id: projectId },
    },
    {
      name: "vehicleTypes",
      model: VehicleType,
      query: { project_id: projectId },
    },
    {
      name: "countLocations",
      model: CountLocation,
      query: { project_id: projectId },
    },
    {
      name: "forms",
      model: Form,
      query: { project_id: projectId },
    },
    {
      name: "predefinedAssociatingNames",
      model: PredefinedAssociatingName,
      query: { project_id: projectId },
    },
    {
      name: "predefinedSurveyPeriods",
      model: PredefinedSurveyPeriod,
      query: { project_id: projectId },
    },
    {
      name: "predefinedTimePeriods",
      model: PredefinedTimePeriod,
      query: { project_id: projectId },
    },
  ];

  // Execute deletions
  for (const task of deletionTasks) {
    const result = await task.model.deleteMany(task.query).session(session);
    results[task.name] = result.deletedCount;
  }

  // Handle users
  if (deleteUsers) {
    const usersResult = await User.deleteMany({
      project_id: projectId,
    }).session(session);
    results.usersDeleted = usersResult.deletedCount;
  } else {
    const usersResult = await User.updateMany(
      { project_id: projectId },
      {
        $unset: { project_id: "" },
        $set: { status: "inactive" },
      }
    ).session(session);
    results.usersUnassigned = usersResult.modifiedCount;
  }

  await Project.findByIdAndDelete(projectId).session(session);

  return results;
};

module.exports = {
  createProject,
  getAllProjects,
  getProjectById,
  updateProject,
  deleteProject,
};
