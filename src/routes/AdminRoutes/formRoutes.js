const express = require("express");
const router = express.Router();
const {
  createForm,
  getAllForms,
  getFormById,
  updateForm,
  deleteForm,
} = require("../../controllers/formController");

router.post("/", createForm);
router.get("/", getAllForms);
router.get("/:id", getFormById);
router.patch("/:id", updateForm);
router.delete("/:id", deleteForm);

module.exports = router;
