const jwt = require("jsonwebtoken");
require("dotenv").config();

const generateToken = (payload, duration = "1d") => {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: duration,
  });
};

module.exports = generateToken;
