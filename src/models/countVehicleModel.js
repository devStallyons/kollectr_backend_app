const mongoose = require("mongoose");

const countVehicleSchema = new mongoose.Schema(
  {
    licensePlate: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    project_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      // required: true,
    },
    vehicleType: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "VehicleType",
    },
    route: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "TransportRoute",
    },
    location: {
      type: mongoose.Schema.Types.ObjectId,
      // required: true, // change to required later
      ref: "CountLocation",
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "User",
    },
    loadStatus: {
      type: String,
      enum: ["empty", "1/4", "1/2", "3/4", "full"],
      required: true,
    },
    direction: {
      type: String,
      enum: ["forward", "reverse"],
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("CountVehicle", countVehicleSchema);
