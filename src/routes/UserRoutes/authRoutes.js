const express = require("express");
const router = express.Router();
const { loginUser } = require("../../controllers/authController");

// Login route for both admin and users
router.post("/login", loginUser);

module.exports = router;
