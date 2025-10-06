const mongoose = require("mongoose");

const stopCounterSchema = new mongoose.Schema({
  name: { type: String, unique: true, required: true },
  count: { type: Number, default: 0 },
  dailyCounts: {
    type: Map,
    of: Number,
    default: {},
  },
});

module.exports = mongoose.model("StopCounter", stopCounterSchema);
