const PredefinedSurveyPeriod = require("../models/PredefinedSurveyPeriodModel");
const Project = require("../models/ProjectModel");
const logger = require("../utils/logger");

const createSurveyPeriod = async (req, res, next) => {
  try {
    const { name, from_date, to_date, project_id } = req.body;
    const created_by = req.user.id;

    if (!name || !from_date || !to_date || !project_id) {
      return res.status(400).json({
        success: false,
        message: "Name, from_date, to_date, and project_id are required",
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

    const fromDate = new Date(from_date);
    const toDate = new Date(to_date);

    if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: "Invalid date format",
      });
    }

    if (fromDate >= toDate) {
      return res.status(400).json({
        success: false,
        message: "from_date must be before to_date",
      });
    }

    const existingPeriod = await PredefinedSurveyPeriod.findOne({
      name,
      project_id,
    });

    if (existingPeriod) {
      return res.status(409).json({
        success: false,
        message: "Survey period with this name already exists for this project",
      });
    }

    const surveyPeriod = new PredefinedSurveyPeriod({
      name,
      from_date: fromDate,
      to_date: toDate,
      project_id,
      created_by,
      updated_by: created_by,
    });

    await surveyPeriod.save();
    await surveyPeriod.populate([
      { path: "project_id", select: "name project_code" },
      { path: "created_by", select: "name email" },
    ]);

    logger.info(
      `Survey period created: ${name} for project: ${project_id} by user: ${created_by}`
    );

    res.status(201).json({
      success: true,
      message: "Survey period created successfully",
      data: surveyPeriod,
    });
  } catch (error) {
    logger.error(`Create survey period error: ${error.message}`, {
      stack: error.stack,
      userId: req.user?.id,
    });
    next(error);
  }
};

const getAllSurveyPeriods = async (req, res, next) => {
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

    const surveyPeriods = await PredefinedSurveyPeriod.find(filter)
      .populate("project_id", "name project_code")
      .populate("created_by", "name email")
      .populate("updated_by", "name email")
      .sort({ from_date: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await PredefinedSurveyPeriod.countDocuments(filter);

    res.json({
      success: true,
      message: "Survey periods fetched successfully",
      data: surveyPeriods,
      pagination: {
        current_page: parseInt(page),
        total_pages: Math.ceil(total / parseInt(limit)),
        total_records: total,
        per_page: parseInt(limit),
      },
    });
  } catch (error) {
    logger.error(`Fetch all survey periods error: ${error.message}`, {
      stack: error.stack,
    });
    next(error);
  }
};

const getSurveyPeriodById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        message: "Invalid ID format",
      });
    }

    const surveyPeriod = await PredefinedSurveyPeriod.findById(id)
      .populate("project_id", "name project_code")
      .populate("created_by", "name email")
      .populate("updated_by", "name email");

    if (!surveyPeriod) {
      return res.status(404).json({
        success: false,
        message: "Survey period not found",
      });
    }

    res.json({
      success: true,
      message: "Survey period fetched successfully",
      data: surveyPeriod,
    });
  } catch (error) {
    logger.error(`Fetch survey period by ID error: ${error.message}`, {
      stack: error.stack,
      id: req.params.id,
    });
    next(error);
  }
};

const updateSurveyPeriod = async (req, res, next) => {
  try {
    const { name, from_date, to_date, project_id } = req.body;
    const updated_by = req.user.id;
    const { id } = req.params;

    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        message: "Invalid ID format",
      });
    }

    const existingPeriod = await PredefinedSurveyPeriod.findById(id);
    if (!existingPeriod) {
      return res.status(404).json({
        success: false,
        message: "Survey period not found",
      });
    }

    if (project_id) {
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
    }

    const updateData = { updated_by };

    if (name !== undefined) updateData.name = name;
    if (project_id !== undefined) updateData.project_id = project_id;

    if (from_date !== undefined) {
      const fromDate = new Date(from_date);
      if (isNaN(fromDate.getTime())) {
        return res.status(400).json({
          success: false,
          message: "Invalid from_date format",
        });
      }
      updateData.from_date = fromDate;
    }

    if (to_date !== undefined) {
      const toDate = new Date(to_date);
      if (isNaN(toDate.getTime())) {
        return res.status(400).json({
          success: false,
          message: "Invalid to_date format",
        });
      }
      updateData.to_date = toDate;
    }

    const finalFromDate = updateData.from_date || existingPeriod.from_date;
    const finalToDate = updateData.to_date || existingPeriod.to_date;

    if (finalFromDate >= finalToDate) {
      return res.status(400).json({
        success: false,
        message: "from_date must be before to_date",
      });
    }

    if (name || project_id) {
      const duplicatePeriod = await PredefinedSurveyPeriod.findOne({
        name: name || existingPeriod.name,
        project_id: project_id || existingPeriod.project_id,
        _id: { $ne: id },
      });

      if (duplicatePeriod) {
        return res.status(409).json({
          success: false,
          message:
            "Survey period with this name already exists for this project",
        });
      }
    }

    const surveyPeriod = await PredefinedSurveyPeriod.findByIdAndUpdate(
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
      `Survey period updated: ${surveyPeriod.name} by user: ${updated_by}`
    );

    res.json({
      success: true,
      message: "Survey period updated successfully",
      data: surveyPeriod,
    });
  } catch (error) {
    logger.error(`Update survey period error: ${error.message}`, {
      stack: error.stack,
      id: req.params.id,
      userId: req.user?.id,
    });
    next(error);
  }
};

const deleteSurveyPeriod = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        message: "Invalid ID format",
      });
    }

    const surveyPeriod = await PredefinedSurveyPeriod.findByIdAndDelete(id);

    if (!surveyPeriod) {
      return res.status(404).json({
        success: false,
        message: "Survey period not found",
      });
    }

    logger.info(
      `Survey period deleted: ${surveyPeriod.name} by user: ${req.user?.id}`
    );

    res.json({
      success: true,
      message: "Survey period deleted successfully",
      data: { id: surveyPeriod._id },
    });
  } catch (error) {
    logger.error(`Delete survey period error: ${error.message}`, {
      stack: error.stack,
      id: req.params.id,
      userId: req.user?.id,
    });
    next(error);
  }
};

module.exports = {
  createSurveyPeriod,
  getAllSurveyPeriods,
  getSurveyPeriodById,
  updateSurveyPeriod,
  deleteSurveyPeriod,
};
