const express = require("express");
const router = express.Router();
const {
  createAssociatingName,
  getAllAssociatingNames,
  getAssociatingNameById,
  updateAssociatingName,
  deleteAssociatingName,
} = require("../../controllers/PredefinedAssociatingNameController");

router.post("/", createAssociatingName);
router.get("/", getAllAssociatingNames);
router.get("/:id", getAssociatingNameById);
router.put("/:id", updateAssociatingName);
router.delete("/:id", deleteAssociatingName);

module.exports = router;
