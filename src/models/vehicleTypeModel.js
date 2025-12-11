const mongoose = require("mongoose");

const vehicleTypeSchema = new mongoose.Schema({
  type: {
    type: String,
    required: true,
    // unique: true,
    trim: true,
  },
  project_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Project",
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

vehicleTypeSchema.index({ type: 1, project_id: 1 });

module.exports = mongoose.model("VehicleType", vehicleTypeSchema);
