const mongoose = require("mongoose");

const PredefinedSurveyPeriodSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    from_date: {
      type: Date,
      required: true,
    },
    to_date: {
      type: Date,
      required: true,
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

PredefinedSurveyPeriodSchema.index({ project_id: 1 });

PredefinedSurveyPeriodSchema.pre("save", function (next) {
  if (this.from_date >= this.to_date) {
    return next(new Error("From date must be before to date"));
  }
  next();
});

module.exports = mongoose.model(
  "PredefinedSurveyPeriod",
  PredefinedSurveyPeriodSchema
);
