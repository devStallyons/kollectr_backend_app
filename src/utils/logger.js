const fs = require("fs");
const path = require("path");
const winston = require("winston");

// Ensure log directory exists
const logDir = path.join(__dirname, "../..", "logs");
const errorLog = path.join(logDir, "error.log");
const combinedLog = path.join(logDir, "combined.log");

function ensureLogFile(filePath) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, "");
  }
}

// Ensure files are created before Winston uses them
[errorLog, combinedLog].forEach(ensureLogFile);

function createLogger() {
  const logger = winston.createLogger({
    level: "info",
    format: winston.format.json(),
    defaultMeta: { service: "user-service" },
    transports: [
      new winston.transports.File({ filename: errorLog, level: "error" }),
      new winston.transports.File({ filename: combinedLog }),
    ],
  });

  // Add console transport in non-production environments
  if (process.env.NODE_ENV !== "production") {
    logger.add(
      new winston.transports.Console({
        format: winston.format.simple(),
      })
    );
  }

  return logger;
}

const logger = createLogger();

module.exports = logger;
