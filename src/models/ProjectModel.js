const mongoose = require("mongoose");

const ProjectSchema = new mongoose.Schema(
  {
    project_code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    timezone: {
      type: String,
      default: "UTC",
    },
    status: {
      type: String,
      enum: ["active", "inactive", "archived"],
      default: "active",
    },
    prepend_code_to_route_name: {
      type: Boolean,
      default: false,
    },
    auto_determine_time_period: {
      type: Boolean,
      default: false,
    },
    auto_snap_to_road: {
      type: Boolean,
      default: false,
    },
    min_trip_distance_km: {
      type: Number,
      default: 0,
      min: 0,
    },
    min_passenger_travel_distance_km: {
      type: Number,
      default: 0,
      min: 0,
    },
    capture_per_passenger_info: {
      type: Boolean,
      default: true,
    },
    auto_determine_direction: {
      type: Boolean,
      default: true,
    },
    min_gps_loss_distance_km: {
      type: Number,
      default: 0,
      min: 0,
    },
    trip_distance_threshold_km: {
      type: Number,
      default: 0,
      min: 0,
    },
    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    updated_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: {
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  }
);

ProjectSchema.pre("save", async function (next) {
  if (this.isNew && !this.project_code) {
    const prefix = "PRJ";

    const lastProject = await mongoose
      .model("Project")
      .findOne({ project_code: { $regex: `^${prefix}-\\d+$` } })
      .sort({ created_at: -1 });

    let nextNumber = 1;

    if (lastProject) {
      const lastNumber = parseInt(lastProject.project_code.split("-")[1], 10);
      nextNumber = lastNumber + 1;
    }

    this.project_code = `${prefix}-${nextNumber.toString().padStart(4, "0")}`;
  }
  next();
});

module.exports = mongoose.model("Project", ProjectSchema);
