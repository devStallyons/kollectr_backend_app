const mongoose = require("mongoose");

const companySchema = new mongoose.Schema({
  company_name: { type: String, required: true },
  project_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Project",
    required: true,
  },
  timestamp: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Company", companySchema);
