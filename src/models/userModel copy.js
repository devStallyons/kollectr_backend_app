const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    required: function () {
      return this.status === "active";
    },
  },
  // username: { type: String, unique: true, sparse: true },
  project_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Project",
    // required: true,
  },
  cellphone: {
    type: String,
    required: true,
    required: function () {
      return this.status === "active";
    },
  },
  email: { type: String, unique: true, sparse: true },
  idnumber: {
    type: String,
    required: function () {
      return this.status === "active";
    },
    // required: true,
    unique: true,
    sparse: true,
  },
  projectcode: {
    type: String,
    required: true,
    required: function () {
      return this.status === "active";
    },
  },
  role: {
    type: String,
    enum: ["superadmin", "admin", "user", "mapper"],
    default: "user",
  },
  status: {
    type: String,
    enum: ["active", "inactive"],
    default: "active",
  },
  approvalStatus: {
    type: String,
    enum: ["approved", "unapproved", "under_review"],
    default: "under_review",
  },
  inviteStatus: {
    type: String,
    enum: ["pending", "accepted", "expired"],
    default: "pending",
  },
  password: { type: String },
  loginAttempts: { type: Number, default: 0 },
  lockUntil: { type: Date },
  inviteToken: { type: String },
  inviteExpiry: { type: Date },
  invitedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  resetPasswordToken: { type: String, default: null },
  resetPasswordExpiry: { type: Date, default: null },

  timestamp: { type: Date, default: Date.now },
});

// Hash password
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare password
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Check lock
userSchema.methods.isLocked = function () {
  return this.lockUntil && this.lockUntil > Date.now();
};

// Helper method to check if user is fully active (both active and approved)
userSchema.methods.isFullyActive = function () {
  return this.status === "active" && this.approvalStatus === "approved";
};

// Check if invitation is valid
userSchema.methods.isInviteValid = function () {
  return (
    this.inviteToken && this.inviteExpiry && this.inviteExpiry > new Date()
  );
};

userSchema.index({ project_id: 1 });

const User = mongoose.models.User || mongoose.model("User", userSchema);
module.exports = User;
