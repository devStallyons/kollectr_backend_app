const formatDuration = (seconds) => {
  if (!seconds || seconds < 0) return "00:00";

  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
};

const parseDwellTimeToSeconds = (dwellTime) => {
  if (!dwellTime || typeof dwellTime !== "string") return 0;

  const [minutes, seconds] = dwellTime.split(":").map(Number);
  return (minutes || 0) * 60 + (seconds || 0);
};

// Validate dwell time format (MM:SS)
const validateDwellTime = (dwellTime) => {
  if (!dwellTime || typeof dwellTime !== "string") {
    return false;
  }

  const timeRegex = /^([0-5]?[0-9]):([0-5]?[0-9])$/;
  return timeRegex.test(dwellTime);
};

const calculateTripDuration = (startTime, endTime) => {
  if (!startTime || !endTime) return 0;

  return Math.floor((new Date(endTime) - new Date(startTime)) / 1000);
};

const formatTripNumber = (date, count) => {
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, "");
  return `T${dateStr}_${String(count + 1).padStart(3, "0")}`;
};

module.exports = {
  formatDuration,
  parseDwellTimeToSeconds,
  validateDwellTime,
  calculateTripDuration,
  formatTripNumber,
};
