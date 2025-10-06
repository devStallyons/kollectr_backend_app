const mongoose = require("mongoose");

const deviceSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      //   required: true,
      unique: true,
    },
    connectedAt: {
      type: Date,
      default: Date.now,
    },
    lastSeen: {
      type: Date,
      default: Date.now,
    },
    configVersion: {
      type: String,
      required: true,
    },
    currentVersion: {
      type: String,
      // required: true
    },
    status: {
      type: String,
      enum: ["up-to-date", "update-required"],
      //   required: true,
    },
    project_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
    },
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Device", deviceSchema);
