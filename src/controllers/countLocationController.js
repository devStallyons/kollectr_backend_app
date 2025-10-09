const CountLocation = require("../models/countLocationModel");

// Create a new location
const createLocation = async (req, res, next) => {
  try {
    const { name, coordinates, project_id } = req.body;

    if (!name || !coordinates || !project_id) {
      return res
        .status(400)
        .json({ message: "name and coordinates and project_id are required" });
    }

    const location = await CountLocation.create({
      name,
      coordinates,
      project_id,
    });

    res.status(201).json({
      success: true,
      data: location,
    });
  } catch (error) {
    next(error);
  }
};

// Get all locations
const getAllLocations = async (req, res, next) => {
  try {
    const { project_id } = req.query;

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    let filter = {};
    if (project_id) {
      filter.project_id = project_id;
    }

    const total = await CountLocation.countDocuments(filter);

    const locations = await CountLocation.find(filter)
      .populate({
        path: "project_id",
        select: "project_code name",
      })
      .skip(skip)
      .limit(limit);

    const totalPages = Math.ceil(total / limit);

    res.status(200).json({
      success: true,
      data: locations,
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

// Get a single location by ID
const getLocationById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { project_id } = req.query;

    let filter = { _id: id };
    if (project_id) {
      filter.project_id = project_id;
    }

    const location = await CountLocation.findOne(filter)
      .populate({
        path: "project_id",
        select: "project_code name",
      })
      .lean();

    if (!location) {
      return res.status(404).json({ message: "Location not found" });
    }

    res.status(200).json({
      success: true,
      data: location,
    });
  } catch (error) {
    next(error);
  }
};

// Update a location
const updateLocation = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, coordinates } = req.body;

    const updatedLocation = await CountLocation.findByIdAndUpdate(
      id,
      { name, coordinates },
      { new: true, runValidators: true }
    );

    if (!updatedLocation) {
      return res.status(404).json({ message: "Location not found" });
    }

    res.status(200).json({
      success: true,
      data: updatedLocation,
    });
  } catch (error) {
    next(error);
  }
};

// Delete a location
const deleteLocation = async (req, res, next) => {
  try {
    const { id } = req.params;

    const deletedLocation = await CountLocation.findByIdAndDelete(id);

    if (!deletedLocation) {
      return res.status(404).json({ message: "Location not found" });
    }

    res.status(200).json({
      success: true,
      message: "Location deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

// Export all controller methods
module.exports = {
  createLocation,
  getAllLocations,
  getLocationById,
  updateLocation,
  deleteLocation,
};
