const Form = require("../models/formModel");
const logger = require("../utils/logger");

const createForm = async (req, res, next) => {
  const { name, cellphone, email, message, project_id } = req.body;
  const created_by = req.user.id;

  try {
    if (created_by) {
      req.body.created_by = created_by;
    } else {
      req.body.created_by = null;
    }
    if (project_id) {
      req.body.project_id = project_id;
    } else {
      req.body.project_id = null;
    }
    if (!name || !cellphone || !email || !message) {
      logger.error("All fields are required");
      const error = new Error("All fields are required");
      error.status = 400;
      return next(error);
    }
    const form = new Form(req.body);
    await form.save();
    logger.info("Form created successfully");
    res.status(201).json(form);
  } catch (err) {
    logger.error("Error in createForm", err);
    next(err);
  }
};

const getAllForms = async (req, res, next) => {
  try {
    const { project_id } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    let filter = {};
    if (project_id) {
      filter.project_id = project_id;
    }

    const [forms, total] = await Promise.all([
      Form.find(filter)
        .populate("project_id", "_id project_code name")
        .skip(skip)
        .limit(limit)
        .lean(),
      Form.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      data: forms,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page * limit < total,
        hasPrevPage: page > 1,
      },
    });
  } catch (err) {
    next(err);
  }
};

const getFormById = async (req, res, next) => {
  const { id } = req.params;
  const { project_id } = req.query;

  try {
    if (!id) {
      logger.error("Form id is required");
      const error = new Error("Form id is required");
      error.status = 400;
      return next(error);
    }

    let filter = { _id: id };
    if (project_id) {
      filter.project_id = project_id;
    }

    const form = await Form.findOne(filter)
      .populate("project_id", "_id project_code name")
      .lean();

    if (!form) {
      return res.status(404).json({ message: "Form not found" });
    }

    res.status(200).json({
      success: true,
      data: form,
    });
  } catch (err) {
    next(err);
  }
};

const updateForm = async (req, res, next) => {
  const { id } = req.params;
  try {
    if (!id) {
      logger.error("Form id is required");
      const error = new Error("Form id is required");
      error.status = 400;
      return next(error);
    }
    const form = await Form.findByIdAndUpdate(id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!form) return res.status(404).json({ message: "Form not found" });
    res.status(200).json({
      success: true,
      data: form,
    });
  } catch (err) {
    next(err);
  }
};

const deleteForm = async (req, res, next) => {
  const { id } = req.params;
  try {
    if (!id) {
      logger.error("Form id is required");
      const error = new Error("Form id is required");
      error.status = 400;
      return next(error);
    }
    const form = await Form.findByIdAndDelete(id);
    if (!form) return res.status(404).json({ message: "Form not found" });
    res.json({ message: "Form deleted" });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createForm,
  getAllForms,
  getFormById,
  deleteForm,
  updateForm,
};
