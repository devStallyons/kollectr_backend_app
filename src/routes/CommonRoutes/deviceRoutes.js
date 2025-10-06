const express = require("express");
const router = express.Router();
const {
  createOrUpdateDevice,
  getAllDevices,
  getDeviceById,
  deleteDevice,
} = require("../../controllers/deviceController");
const { roleCheck } = require("../../middleware/authMiddleware");

router.post(
  "/",
  roleCheck(["superadmin", "admin", "user", "mapper"]),
  createOrUpdateDevice
);
router.get("/", roleCheck(["superadmin", "admin", "user"]), getAllDevices);
router.get(
  "/device-by-id",
  roleCheck(["superadmin", "admin", "user", "mapper"]),
  getDeviceById
);
router.delete("/:id", roleCheck(["superadmin", "admin", "user"]), deleteDevice);

module.exports = router;
