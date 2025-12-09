// models/userModel.js
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      trim: true,
    },
    email: {
      type: String,
      unique: true,
      sparse: true,
      lowercase: true,
      trim: true,
    },
    cellphone: {
      type: String,
      trim: true,
    },
    idnumber: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
    },
    password: {
      type: String,
    },
    role: {
      type: String,
      enum: ["superadmin", "admin", "user", "mapper"],
      default: "user",
    },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "inactive",
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
    // Keep for backward compatibility & quick access to current project
    project_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
    },
    projectcode: {
      type: String,
      trim: true,
    },
    inviteToken: { type: String },
    inviteExpiry: { type: Date },
    invitedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    resetPasswordToken: { type: String },
    resetPasswordExpiry: { type: Date },
    loginAttempts: { type: Number, default: 0 },
    lockUntil: { type: Date },
    lastLogin: { type: Date },
  },
  {
    timestamps: {
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  }
);

// Hash password before save
userSchema.pre("save", async function (next) {
  if (!this.isModified("password") || !this.password) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare password
userSchema.methods.matchPassword = async function (enteredPassword) {
  if (!this.password) return false;
  return await bcrypt.compare(enteredPassword, this.password);
};

// Check if account is locked
userSchema.methods.isLocked = function () {
  return this.lockUntil && this.lockUntil > Date.now();
};

// Check if fully active
userSchema.methods.isFullyActive = function () {
  return this.status === "active" && this.approvalStatus === "approved";
};

// Check if invite is valid
userSchema.methods.isInviteValid = function () {
  return (
    this.inviteToken && this.inviteExpiry && this.inviteExpiry > new Date()
  );
};

// Indexes
userSchema.index({ email: 1 });
userSchema.index({ idnumber: 1 });
userSchema.index({ project_id: 1 });
userSchema.index({ role: 1, status: 1 });

module.exports = mongoose.models.User || mongoose.model("User", userSchema);
