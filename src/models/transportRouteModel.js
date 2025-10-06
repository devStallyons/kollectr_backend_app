const mongoose = require("mongoose");

const transportRouteSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
    },
    project_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
    },
    type: {
      type: String,
      enum: ["straight", "circular"],
      default: "straight",
    },
    forwardStops: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "TransportStop",
      },
    ],
    reverseStops: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "TransportStop",
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("TransportRoute", transportRouteSchema);
