const TripCounter = require("../models/tripCounterModel");
const StopCounter = require("../models/stopCounterModel");
const ProjectModel = require("../models/ProjectModel");

async function generateTripNumber() {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");

  let counter = await TripCounter.findOne({ name: "global" });

  if (!counter) {
    counter = new TripCounter({ name: "global", count: 0, dailyCounts: {} });
  }
  counter.count += 1;
  const currentDailyCount = counter.dailyCounts.get(date) || 0;
  counter.dailyCounts.set(date, currentDailyCount + 1);
  await counter.save();
  const padded = String(counter.count).padStart(3, "0");
  return `T${date}_${padded}`;
}

async function generateStopId() {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  let counter = await StopCounter.findOne({ name: "global" });

  if (!counter) {
    counter = new StopCounter({ name: "global", count: 0, dailyCounts: {} });
  }
  counter.count += 1;
  const currentDailyCount = counter.dailyCounts.get(date) || 0;
  counter.dailyCounts.set(date, currentDailyCount + 1);
  await counter.save();
  const paddedSeq = String(counter.count).padStart(3, "0");
  const stopId = `S${date}_${paddedSeq}`;

  return stopId;
}

const parseTimeToDate = (timeStr, baseDate) => {
  if (!timeStr || !baseDate) return baseDate;
  try {
    const [hours, mins, secs] = timeStr.split(":").map(Number);
    const date = new Date(baseDate);
    date.setHours(hours, mins, secs, 0);
    return date;
  } catch {
    return baseDate;
  }
};

const generateProjectCode = async () => {
  const prefix = "PRJ";

  const lastProject = await ProjectModel.findOne({
    project_code: { $regex: `^${prefix}-\\d+$` },
  }).sort({ created_at: -1 });

  let nextNumber = 1;

  if (lastProject) {
    const lastCode = lastProject.project_code;
    const lastNumber = parseInt(lastCode.split("-")[1], 10);
    nextNumber = lastNumber + 1;
  }

  const newCode = `${prefix}-${nextNumber.toString().padStart(4, "0")}`;

  const existingProject = await ProjectModel.findOne({ project_code: newCode });
  if (existingProject) {
    return generateProjectCode();
  }

  return newCode;
};
module.exports = {
  generateStopId,
  generateTripNumber,
  parseTimeToDate,
  generateProjectCode,
};
