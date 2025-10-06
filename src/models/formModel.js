const { default: mongoose } = require("mongoose");

const formSchema = new mongoose.Schema({
  name: { type: String, required: true },
  cellphone: { type: String, required: true },
  email: { type: String, required: true },
  message: { type: String, required: true },
  project_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Project",
    // required: true,
  },
  created_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    // required: true,
  },
});

module.exports = mongoose.model("Form", formSchema);
