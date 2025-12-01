const TripCounter = require("../models/tripCounterModel");
const StopCounter = require("../models/stopCounterModel");

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
module.exports = { generateStopId, generateTripNumber, parseTimeToDate };
