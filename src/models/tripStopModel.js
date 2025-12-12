const mongoose = require("mongoose");

const tripStopSchema = new mongoose.Schema(
  {
    stopId: {
      type: String,
      required: true,
      unique: true,
    },
    trip: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Trip",
      required: true,
    },
    project_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      // required: true,
    },
    stopNumber: {
      type: Number,
      required: true,
    },
    stopName: {
      type: String,
      // required: true,
    },
    stopTime: { type: Date, default: Date.now },
    passengersIn: { type: Number, default: 0, min: 0 },
    passengersOut: { type: Number, default: 0, min: 0 },
    currentPassengers: { type: Number, default: 0, min: 0 },

    fareAmount: { type: Number, default: 0 },

    stopLocation: {
      type: {
        type: String,
        enum: ["Point"],
        required: true,
        default: "Point",
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        required: true,
        validate: {
          validator: function (value) {
            return value.length === 2;
          },
          message: "Coordinates must be in [longitude, latitude] format.",
        },
      },
    },
    originalLocation: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: {
        type: [Number],
        default: null,
      },
    },
    snappedToRoad: {
      type: Boolean,
      default: false,
    },
    arriveTime: {
      type: Date,
      default: null,
    },
    departTime: {
      type: Date,
      default: null,
    },
    cum_passengers: { type: Number, default: 0, min: 0 },
    cum_travel_time: { type: Number, default: 0, min: 0 },
    cum_distance: { type: Number, default: 0, min: 0 },
    cum_revenue: { type: Number, default: 0, min: 0 },
    speed: { type: Number, default: 0, min: 0 },

    dwellTime: String,
    distance: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
);

tripStopSchema.index({ trip: 1, stopNumber: 1 }, { unique: true });
tripStopSchema.index({ stopLocation: "2dsphere" });

module.exports = mongoose.model("TripStop", tripStopSchema);
