const Company = require("../models/companyModel");
const fs = require("fs");
const path = require("path");
const csv = require("csv-parser");
const parseCSV = require("../utils/parseCSV");

const createCompany = async (req, res, next) => {
  try {
    const { company_name, project_id } = req.body;

    if (!company_name || !project_id) {
      return res
        .status(400)
        .json({ message: "company name and project_id are required" });
    }

    const company = await Company.create({ company_name, project_id });
    res.status(201).json({
      success: true,
      data: company,
    });
  } catch (error) {
    next(error);
  }
};

const uploadCompaniesFromCSV = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "CSV file is required" });
    }

    const filePath = req.file.path;

    const companies = await parseCSV(filePath, (row) => {
      if (row.company_name) {
        return { company_name: row.company_name.trim() };
      }
      return null;
    });

    const inserted = await Company.insertMany(companies, {
      ordered: false,
    });

    res.status(201).json({
      message: "Companies added",
      count: inserted.length,
      success: true,
    });
  } catch (error) {
    next(error);
  }
};

const getCompanies = async (req, res, next) => {
  try {
    const { project_id } = req.query;

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    let filter = {};
    if (project_id) {
      filter.project_id = project_id;
    }

    const total = await Company.countDocuments(filter);
    const companies = await Company.find(filter)
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
      data: companies,
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

const getCompanyById = async (req, res, next) => {
  const { project_id } = req.query;
  const { id } = req.params;

  try {
    let filter = { _id: id };
    if (project_id) {
      filter.project_id = project_id;
    }

    const company = await Company.findOne(filter)
      .populate({
        path: "project_id",
        select: "project_code name",
      })
      .lean();

    if (!company) {
      return res.status(404).json({ message: "Company not found" });
    }

    res.status(200).json({
      success: true,
      data: company,
    });
  } catch (error) {
    next(error);
  }
};

const updateCompany = async (req, res, next) => {
  try {
    const { company_name } = req.body;

    const company = await Company.findByIdAndUpdate(
      req.params.id,
      { company_name },
      { new: true }
    );

    if (!company) return res.status(404).json({ message: "Company not found" });

    res.status(200).json({
      success: true,
      data: company,
    });
  } catch (error) {
    next(error);
  }
};

const deleteCompany = async (req, res, next) => {
  try {
    const company = await Company.findByIdAndDelete(req.params.id);
    if (!company) return res.status(404).json({ message: "Company not found" });
    res.json({
      message: `Company ${company.company_name} deleted successfully`,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createCompany,
  uploadCompaniesFromCSV,
  getCompanies,
  getCompanyById,
  updateCompany,
  deleteCompany,
};
