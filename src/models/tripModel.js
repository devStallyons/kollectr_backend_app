const mongoose = require("mongoose");
const TripCounter = require("./tripCounterModel");

const tripSchema = new mongoose.Schema(
  {
    tripNumber: {
      type: String,
      //   required: true,
      unique: true,
    },
    project_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
    },
    mapper: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    route: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TransportRoute",
      required: true,
    },

    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PredefinedAssociatingName",
      required: true,
    },

    vehicleType: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "VehicleType",
      required: true,
    },

    licensePlate: {
      type: String,
      // unique: true,
      //   required: true,
    },

    startTime: Date,
    endTime: Date,
    actualDuration: { type: String, default: 0 },

    startCoordinates: {
      latitude: Number,
      longitude: Number,
    },
    endCoordinates: {
      latitude: Number,
      longitude: Number,
    },
    gpsAccuracy: String,
    duration: { type: Number, default: 0 },
    distance: { type: Number, default: 0 },

    status: {
      type: String,
      enum: ["new", "in-progress", "completed", "cancelled"],
      default: "new",
    },

    totalStops: { type: Number, default: 0 },
    currentStop: { type: Number, default: 0 },
    totalPassengersPickedUp: { type: Number, default: 0 },
    totalPassengersDroppedOff: { type: Number, default: 0 },
    finalPassengerCount: { type: Number, default: 0 },
    totalFareCollection: { type: Number, default: 0 },
    totalPassengerAtFirstStop: { type: Number, default: 0 },

    tripStops: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "TripStop",
      },
    ],

    mappingNotes: String,
    isUploaded: { type: Boolean, default: false },
    state: {
      type: String,
      enum: ["mapped", "approved", "submitted"],
      default: "mapped",
    },
    direction: {
      type: String,
      enum: ["F", "R"],
    },
  },
  { timestamps: true }
);

// tripSchema.pre("save", async function (next) {
//   if (!this.isNew) return next();

//   const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");

//   try {
//     const counter = await TripCounter.findOneAndUpdate(
//       { date },
//       { $inc: { count: 1 } },
//       { new: true, upsert: true }
//     );

//     const paddedCount = String(counter.count).padStart(3, "0");
//     this.tripNumber = `T${date}_${paddedCount}`;

//     next();
//   } catch (err) {
//     return next(err);
//   }
// });

module.exports = mongoose.model("Trip", tripSchema);
