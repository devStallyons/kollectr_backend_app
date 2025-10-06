const express = require("express");
const router = express.Router();

const authRoutes = require("./authRoutes");
const companyRoutes = require("./companyRoutes");
const vehicleTypeRoutes = require("./vehicleTypeRoutes");
const transportStopRoutes = require("./transportStopRoutes");
const transportRouteRoutes = require("./transportRouteRoutes");
const locationRoutes = require("../CommonRoutes/countLocationRoutes");
const projectRoutes = require("./projectRoutes");
const PredefinedAssociatingNameRoutes = require("./PredefinedAssociatingNameRoutes");
const PredefinedSurveyPeriodRoutes = require("./PredefinedSurveyPeriodRoutes");
const deviceRoutes = require("../CommonRoutes/deviceRoutes");
const formRoutes = require("./formRoutes");

const {
  adminOnly,
  protect,
  roleCheck,
} = require("../../middleware/authMiddleware");
const allRoles = ["superadmin", "admin", "user"];

router.use("/auth", authRoutes);
router.use("/company", protect, roleCheck(allRoles), companyRoutes);
router.use("/vehicle-type", protect, roleCheck(allRoles), vehicleTypeRoutes);
router.use("/count-location", locationRoutes);
router.use("/project", protect, roleCheck(allRoles), projectRoutes);
router.use("/form", protect, roleCheck(allRoles), formRoutes);
router.use("/device", protect, deviceRoutes);

router.use(
  "/transport-stops",
  protect,
  roleCheck(allRoles),
  transportStopRoutes
);
router.use(
  "/transport-routes",
  protect,
  roleCheck(allRoles),
  transportRouteRoutes
);
router.use(
  "/predefined-associating-name",
  protect,
  roleCheck(allRoles),
  PredefinedAssociatingNameRoutes
);
router.use(
  "/predefined-survey-period",
  protect,
  roleCheck(allRoles),
  PredefinedSurveyPeriodRoutes
);

module.exports = router;
