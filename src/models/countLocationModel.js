const mongoose = require("mongoose");

const countLocationSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    coordinates: {
      type: [Number],
      required: true,
      index: "2d",
    },
    project_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      // required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("CountLocation", countLocationSchema);
