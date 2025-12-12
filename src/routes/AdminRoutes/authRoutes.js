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
  resetPassword,
  forgotPassword,
  getInvitedUsers,
  deleteInvitedUser,
  getUsersByFilters,
  updateMapper,
  getEmailByToken,
} = require("../../controllers/authController");

router.post(
  "/create-user",
  protect,
  roleCheck(["superadmin", "admin"]),
  createUser
);

router.post("/login", loginAdmin);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);
router.get("/email/:token", getEmailByToken);

router.post(
  "/invite",
  protect,
  roleCheck(["superadmin", "admin", "user"]),
  inviteUser
);
router.post(
  "/accept-invite",
  // protect,
  // roleCheck(["superadmin", "admin", "user"]),
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
router.put(
  "/update-mapper/:id",
  protect,
  roleCheck(["superadmin", "admin", "user"]),
  updateMapper
);
router.get(
  "/invited-users",
  protect,
  roleCheck(["superadmin", "admin", "user"]),
  getInvitedUsers
);
router.delete(
  "/invited-users/:userId",
  protect,
  roleCheck(["superadmin", "admin", "user"]),
  deleteInvitedUser
);
router.get(
  "/users-by-filters",
  protect,
  roleCheck(["superadmin", "admin", "user"]),
  getUsersByFilters
);
router.delete(
  "/invited-users/:userId",
  protect,
  roleCheck(["superadmin", "admin", "user"]),
  deleteInvitedUser
);

module.exports = router;
