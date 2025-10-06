const cors = require("cors");

const allowedOrigins = ["http://localhost:6000", "http://localhost:4000"];

// CORS middleware
const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("CORS: Not allowed by policy"));
    }
  },
  credentials: true,
};

const corsMiddleware = cors(corsOptions);

// Custom origin validation middleware (non-browser clients)
const validateOrigin = (req, res, next) => {
  const origin = req.headers.origin;

  if (!origin || allowedOrigins.includes(origin)) {
    return next();
  }

  const error = new Error("Blocked by custom origin policy");
  error.status = 403;
  return next(error);
};

module.exports = {
  corsMiddleware,
  validateOrigin,
};
