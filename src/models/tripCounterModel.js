const mongoose = require("mongoose");

const tripCounterSchema = new mongoose.Schema({
  name: { type: String, unique: true, required: true },
  count: { type: Number, default: 0 },
  dailyCounts: {
    type: Map,
    of: Number,
    default: {},
  },
});

module.exports = mongoose.model("TripCounter", tripCounterSchema);
