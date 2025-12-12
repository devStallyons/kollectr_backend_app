const mongoose = require("mongoose");

const dailyGoalSchema = new mongoose.Schema(
  {
    project_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
    },
    route: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TransportRoute",
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    mapperId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    goal: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

dailyGoalSchema.index(
  { project_id: 1, route: 1, userId: 1, mapperId: 1 },
  { unique: true }
);

module.exports = mongoose.model("DailyGoalTrips", dailyGoalSchema);
