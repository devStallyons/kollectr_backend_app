const errorHandler = (err, req, res, next) => {
  console.error("🔥 Error:", err.stack);

  if (err.code === "LIMIT_FILE_SIZE") {
    return res.status(413).json({
      success: false,
      message: "File too large. Max 10MB allowed.",
    });
  }

  const statusCode = res.statusCode !== 200 ? res.statusCode : 500;

  res.status(statusCode).json({
    success: false,
    message: err.message || "Server Error",
    stack: process.env.NODE_ENV === "production" ? "🥷 Hidden" : err.stack,
  });
};

module.exports = errorHandler;
