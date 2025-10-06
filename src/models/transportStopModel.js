const mongoose = require("mongoose");

const transportStopSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    code: { type: String, required: true, unique: true },
    coordinates: {
      type: [Number],
      required: true,
      index: "2d",
    },
    project_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
    },
    // latitude: { type: Number, required: true },
    // longitude: { type: Number, required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("TransportStop", transportStopSchema);
