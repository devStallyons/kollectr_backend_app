// models/userProjectModel.js
const mongoose = require("mongoose");

const UserProjectSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    project_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
    },
    role: {
      type: String,
      enum: ["admin", "user", "mapper"],
      default: "user",
    },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
    is_default: {
      type: Boolean,
      default: false,
    },
    invited_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    joined_at: {
      type: Date,
      default: Date.now,
    },
    last_accessed_at: {
      type: Date,
    },
  },
  {
    timestamps: {
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  }
);

// Unique constraint - user can only be in a project once
UserProjectSchema.index({ user_id: 1, project_id: 1 }, { unique: true });
UserProjectSchema.index({ project_id: 1, status: 1 });
UserProjectSchema.index({ user_id: 1, status: 1 });

// Get user's all projects
UserProjectSchema.statics.getUserProjects = async function (userId) {
  return this.find({ user_id: userId, status: "active" })
    .populate("project_id")
    .sort({ is_default: -1, last_accessed_at: -1 });
};

// Get all users in a project
UserProjectSchema.statics.getProjectUsers = async function (projectId) {
  return this.find({ project_id: projectId, status: "active" })
    .populate(
      "user_id",
      "name email cellphone idnumber role status approvalStatus"
    )
    .populate("invited_by", "name email")
    .sort({ joined_at: -1 });
};

// Check if user exists in project
UserProjectSchema.statics.isUserInProject = async function (userId, projectId) {
  const record = await this.findOne({ user_id: userId, project_id: projectId });
  return !!record;
};

// Add user to project
UserProjectSchema.statics.addUserToProject = async function (
  userId,
  projectId,
  role,
  invitedBy,
  session = null
) {
  const options = session ? { session } : {};

  // Check if already exists
  const existing = await this.findOne({
    user_id: userId,
    project_id: projectId,
  });

  if (existing) {
    return {
      success: false,
      message: "User already in project",
      data: existing,
    };
  }

  // Check if first project for user
  const count = await this.countDocuments({ user_id: userId });

  const userProject = await this.create(
    [
      {
        user_id: userId,
        project_id: projectId,
        role: role,
        invited_by: invitedBy,
        is_default: count === 0,
      },
    ],
    options
  );

  return { success: true, data: userProject[0] };
};

// Get default project
UserProjectSchema.statics.getDefaultProject = async function (userId) {
  let project = await this.findOne({
    user_id: userId,
    is_default: true,
    status: "active",
  }).populate("project_id");

  if (!project) {
    project = await this.findOne({
      user_id: userId,
      status: "active",
    })
      .populate("project_id")
      .sort({ last_accessed_at: -1 });
  }

  return project;
};

// Set default project
UserProjectSchema.statics.setDefaultProject = async function (
  userId,
  projectId
) {
  await this.updateMany({ user_id: userId }, { is_default: false });

  return this.findOneAndUpdate(
    { user_id: userId, project_id: projectId },
    { is_default: true, last_accessed_at: new Date() },
    { new: true }
  );
};

// Update last accessed
UserProjectSchema.methods.updateLastAccessed = async function () {
  this.last_accessed_at = new Date();
  return this.save();
};

module.exports =
  mongoose.models.UserProject ||
  mongoose.model("UserProject", UserProjectSchema);
