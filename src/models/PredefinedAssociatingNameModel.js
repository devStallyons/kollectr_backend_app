const mongoose = require("mongoose");

const PredefinedAssociatingNameSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    project_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
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

PredefinedAssociatingNameSchema.index({ project_id: 1, name: 1 });

module.exports =
  mongoose.models.PredefinedAssociatingName ||
  mongoose.model("PredefinedAssociatingName", PredefinedAssociatingNameSchema);
