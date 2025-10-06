const express = require("express");
const router = express.Router();
const {
  protect,
  adminOnly,
  roleCheck,
} = require("../../middleware/authMiddleware");
const {
  createUser,
  loginAdmin,
  inviteUser,
  approveUser,
  acceptInvite,
  createMapper,
} = require("../../controllers/authController");

router.post(
  "/create-user",
  protect,
  roleCheck(["superadmin", "admin"]),
  createUser
);
router.post("/login", loginAdmin);
router.post(
  "/invite",
  protect,
  roleCheck(["superadmin", "admin", "user"]),
  inviteUser
);
router.post(
  "/accept-invite",
  protect,
  roleCheck(["superadmin", "admin", "user"]),
  acceptInvite
);
router.post(
  "/approve/:userId",
  protect,
  roleCheck(["superadmin", "admin", "user"]),
  approveUser
);
router.post(
  "/create-mapper",
  protect,
  roleCheck(["superadmin", "admin", "user"]),
  createMapper
);

module.exports = router;
