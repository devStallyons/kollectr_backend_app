const express = require("express");
const router = express.Router();
const {
  createLocation,
  getAllLocations,
  getLocationById,
  updateLocation,
  deleteLocation,
} = require("../../controllers/countLocationController");
const { roleCheck, protect } = require("../../middleware/authMiddleware");

router.post("/", protect, roleCheck(["admin", "superadmin"]), createLocation);
router.get(
  "/",
  protect,
  roleCheck(["admin", "user", "superadmin", "mapper"]),
  getAllLocations
);
// router.post(
//   "/get",
//   protect,
//   roleCheck(["admin", "user", "superadmin", "mapper"]),
//   getAllLocations
// );
router.get(
  "/:id",
  protect,
  roleCheck(["admin", "superadmin", "user", "mapper"]),
  getLocationById
);
router.patch(
  "/:id",
  protect,
  roleCheck(["admin", "superadmin", "user", "mapper"]),
  updateLocation
);
router.delete(
  "/:id",
  protect,
  roleCheck(["admin", "superadmin", "user", "mapper"]),
  deleteLocation
);

module.exports = router;
