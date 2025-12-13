const TripCounter = require("../models/tripCounterModel");
const StopCounter = require("../models/stopCounterModel");
const ProjectModel = require("../models/ProjectModel");
const userModel = require("../models/userModel");

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
    project_code: { $regex: `^${prefix}\\d+$` },
  }).sort({ created_at: -1 });

  let nextNumber = 1;

  if (lastProject) {
    const lastCode = lastProject.project_code; // e.g. "PRJ0005"
    const lastNumberStr = lastCode.replace(prefix, ""); // "0005"
    const lastNumber = parseInt(lastNumberStr, 10) || 0; // 5
    nextNumber = lastNumber + 1;
  }

  const newCode = `${prefix}${nextNumber.toString().padStart(4, "0")}`;

  const existingProject = await ProjectModel.findOne({ project_code: newCode });
  if (existingProject) {
    return generateProjectCode();
  }

  return newCode;
};

const generateRandomPrefix = () => {
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let prefix = "";
  for (let i = 0; i < 3; i++) {
    prefix += letters[Math.floor(Math.random() * letters.length)];
  }
  return prefix;
};

const generateIdNumber = async () => {
  const prefix = generateRandomPrefix();

  const lastRecord = await userModel
    .findOne({
      idnumber: { $regex: `^${prefix}` },
    })
    .sort({ createdAt: -1 });

  let nextNumber = 1;

  if (lastRecord?.idnumber) {
    const lastNum = parseInt(lastRecord.idnumber.replace(prefix, ""));
    nextNumber = lastNum + 1;
  }

  const padded = String(nextNumber).padStart(4, "0");
  return `${prefix}${padded}`;
};

module.exports = {
  generateStopId,
  generateTripNumber,
  parseTimeToDate,
  generateProjectCode,
  generateIdNumber,
};
