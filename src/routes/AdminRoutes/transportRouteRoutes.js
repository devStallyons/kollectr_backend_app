const express = require("express");
const router = express.Router();
const {
  createTransportRoute,
  getAllTransportRoutes,
  getTransportRouteById,
  updateTransportRoute,
  deleteTransportRoute,
} = require("../../controllers/transportRouteController");

// CRUD Routes
router.post("/", createTransportRoute);
router.get("/", getAllTransportRoutes);
router.get("/:id", getTransportRouteById);
router.patch("/:id", updateTransportRoute);
router.delete("/:id", deleteTransportRoute);

module.exports = router;
