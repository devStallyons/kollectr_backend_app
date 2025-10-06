const express = require("express");
const router = express.Router();
const {
  createCompany,
  uploadCompaniesFromCSV,
  getCompanies,
  getCompanyById,
  updateCompany,
  deleteCompany,
} = require("../../controllers/companyController");
const upload = require("../../utils/multerUpload");

router.post("/", createCompany);
router.post("/upload", upload.single("file"), uploadCompaniesFromCSV);
router.get("/", getCompanies);
router.get("/:id", getCompanyById);
router.patch("/:id", updateCompany);
router.delete("/:id", deleteCompany);

module.exports = router;
