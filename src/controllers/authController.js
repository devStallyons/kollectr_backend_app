const User = require("../models/userModel");
const generateToken = require("../utils/generateToken");
const logger = require("../utils/logger");
const sendAcceptanceConfirmationEmail = require("../services/emailService/sendAcceptanceConfirmationEmail");
const sendInviteEmail = require("../services/emailService/sendInviteEmail");
const { sendWelcomeEmail } = require("../services/emailService/welcomEmail");
const { sendApprovalEmail } = require("../services/emailService/approvalEmail");
const generatePassword = require("../utils/generatePassword");
const generateRandomUsername = require("../utils/generateRandomName");
const ProjectModel = require("../models/ProjectModel");

// Constants
const MAX_ATTEMPTS = 5;
const LOCK_TIME = 10 * 60 * 1000;
const INVITE_EXPIRY = 24 * 60 * 60 * 1000;

const canCreateRole = (creatorRole, newRole) => {
  const permissions = {
    superadmin: ["admin", "user", "mapper"],
    admin: ["user", "mapper"],
  };
  return permissions[creatorRole]?.includes(newRole);
};

// Superadmin/Admin creates user
const createUser = async (req, res, next) => {
  const { name, cellphone, email, idnumber, projectcode, role } = req.body;

  const creator = req.user || null;
  const password = generatePassword();

  try {
    logger.info(
      `Creating user attempt: ${email}, role: ${role}, creator: ${
        creator?.role || "self-registration"
      }`
    );

    const existing = await User.findOne({ $or: [{ email }, { idnumber }] });
    if (existing) {
      logger.error(
        `User creation failed - duplicate found: ${email} or ${idnumber}`
      );
      res.status(400);
      return next(
        new Error("User with this email or ID number already exists")
      );
    }

    // CASE 1: Superadmin creating any role
    if (creator && creator.role === "superadmin") {
      const user = await User.create({
        name,
        cellphone,
        email,
        idnumber,
        projectcode,
        role,
        password,
        status: "active",
        approvalStatus: "approved",
      });

      logger.info(
        `Superadmin created and auto-approved user: ${user._id}, role: ${role}`
      );

      // Send welcome email
      try {
        await sendWelcomeEmail(email, name, password);
        logger.info(`Welcome email sent to: ${email}`);
      } catch (emailError) {
        logger.error(`Failed to send welcome email to ${email}:`, emailError);
      }

      return res.status(201).json({
        success: true,
        message: `User with role '${role}' created and auto-approved.`,
        user: {
          id: user._id,
          name: user.name,
          role: user.role,
          email: user.email,
          status: user.status,
          approvalStatus: user.approvalStatus,
        },
      });
    }

    // CASE 2: Admin creating user or mapper
    if (creator && creator.role === "admin") {
      if (!canCreateRole(creator.role, role)) {
        logger.error(
          `Admin ${creator._id} attempted to create unauthorized role: ${role}`
        );
        res.status(403);
        return next(new Error("Admin cannot create this role"));
      }

      const user = await User.create({
        name,
        cellphone,
        email,
        idnumber,
        projectcode,
        role,
        password,
        status: "inactive",
        approvalStatus: "under_review",
      });

      logger.info(
        `Admin created user pending approval: ${user._id}, role: ${role}`
      );

      // Send welcome email
      try {
        await sendWelcomeEmail(email, name, password);
        logger.info(`Welcome email sent to: ${email}`);
      } catch (emailError) {
        logger.error(`Failed to send welcome email to ${email}:`, emailError);
      }

      return res.status(201).json({
        success: true,
        message: `User with role '${role}' created and pending approval.`,
        user: {
          id: user._id,
          name: user.name,
          role: user.role,
          email: user.email,
          status: user.status,
          approvalStatus: user.approvalStatus,
        },
      });
    }

    // CASE 3: Self-registration (no token)
    if (!creator) {
      const user = await User.create({
        name,
        cellphone,
        email,
        idnumber,
        projectcode,
        role: "user",
        password,
        status: "active",
        approvalStatus: "under_review",
      });

      logger.info(`Self-registration completed: ${user._id}`);

      // Send welcome email
      try {
        await sendWelcomeEmail(email, name, password);
        logger.info(`Welcome email sent to: ${email}`);
      } catch (emailError) {
        logger.error(`Failed to send welcome email to ${email}:`, emailError);
      }

      return res.status(201).json({
        success: true,
        message: "Account created. Awaiting approval by admin.",
        user: {
          id: user._id,
          name: user.name,
          role: user.role,
          email: user.email,
          status: user.status,
          approvalStatus: user.approvalStatus,
        },
      });
    }

    // Fallback (shouldn't reach here)
    logger.error(
      `Unauthorized user creation attempt by: ${creator?.role || "unknown"}`
    );
    res.status(403);
    return next(new Error("Unauthorized to create this user"));
  } catch (error) {
    logger.error(`User creation error: ${error.message}`, error);
    next(error);
  }
};

// Invite User Function
const inviteUser = async (req, res, next) => {
  const { name, email, role, projectcode, idnumber, cellphone, project_id } =
    req.body;
  const inviter = req.user;

  try {
    logger.info(
      `User invitation attempt by ${inviter.role} (${inviter._id}) for email: ${email}, role: ${role}`
    );

    // Check if inviter can create this role
    if (!canCreateRole(inviter.role, role)) {
      logger.error(
        `${inviter.role} attempted to invite unauthorized role: ${role}`
      );
      res.status(403);
      return next(new Error(`${inviter.role} cannot invite this role`));
    }

    // Check if user already exists
    const existing = await User.findOne({ email });
    if (existing) {
      logger.error(`Invitation failed - user already exists: ${email}`);
      res.status(400);
      return next(new Error("User with this email already exists"));
    }

    // Generate invitation token
    const inviteToken = generateToken({ email }, "24h");
    const inviteExpiry = new Date(Date.now() + INVITE_EXPIRY);

    // Create user with pending invitation status
    const user = await User.create({
      name,
      email,
      projectcode,
      idnumber,
      cellphone,
      role,
      status: "inactive",
      approvalStatus: "unapproved",
      inviteToken,
      inviteExpiry,
      invitedBy: inviter._id,
      project_id,
    });

    logger.info(`Invitation created for user: ${user._id}, token generated`);

    // Send invitation email
    const inviteLink = `${process.env.FRONTEND_URL}/accept-invite?token=${inviteToken}`;

    try {
      await sendInviteEmail(email, name, inviter.name, role, inviteLink);
      logger.info(`Invitation email sent to: ${email}`);
    } catch (emailError) {
      logger.error(`Failed to send invitation email to ${email}:`, emailError);
      // Don't fail the request if email fails
    }

    res.status(201).json({
      success: true,
      message: "Invitation sent successfully",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        approvalStatus: user.approvalStatus,
        inviteExpiry: user.inviteExpiry,
      },
    });
  } catch (error) {
    logger.error(`Invitation error: ${error.message}`, error);
    next(error);
  }
};

// Accept Invitation Function
const acceptInvite = async (req, res, next) => {
  const { token, password, cellphone, idnumber } = req.body;

  try {
    logger.info(
      `Invitation acceptance attempt with token: ${token?.substring(0, 10)}...`
    );

    // Find user by invitation token
    const user = await User.findOne({
      inviteToken: token,
      inviteExpiry: { $gt: new Date() },
    });

    if (!user) {
      logger.error(
        `Invalid or expired invitation token: ${token?.substring(0, 10)}...`
      );
      res.status(400);
      return next(new Error("Invalid or expired invitation token"));
    }

    // Check if idnumber already exists
    // if (idnumber) {
    //   const existingId = await User.findOne({
    //     idnumber,
    //     _id: { $ne: user._id },
    //   });
    //   if (existingId) {
    //     logger.error(
    //       `ID number already exists during invite acceptance: ${idnumber}`
    //     );
    //     res.status(400);
    //     return next(new Error("ID number already exists"));
    //   }
    // }

    // Update user with complete information
    user.password = password;
    // user.idnumber = idnumber;
    user.status = "active";
    user.approvalStatus = user.role === "user" ? "under_review" : "approved";
    user.inviteToken = undefined;
    user.inviteExpiry = undefined;

    await user.save();

    logger.info(`Invitation accepted successfully by user: ${user._id}`);

    // Send confirmation email using the dedicated function
    try {
      await sendAcceptanceConfirmationEmail(
        user.email,
        user.name,
        user.role,
        user.projectcode,
        user.approvalStatus,
        next
      );
      logger.info(`Welcome confirmation email sent to: ${user.email}`);
    } catch (emailError) {
      logger.error(
        `Failed to send welcome confirmation email to ${user.email}:`,
        emailError
      );
    }

    res.json({
      success: true,
      message: "Invitation accepted successfully",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        approvalStatus: user.approvalStatus,
        projectcode: user.projectcode,
      },
    });
  } catch (error) {
    logger.error(`Accept invitation error: ${error.message}`, error);
    next(error);
  }
};

// Admin/Superadmin Login
const loginAdmin = async (req, res, next) => {
  const { email, password } = req.body;

  try {
    logger.info(`Admin login attempt: ${email}`);

    const user = await User.findOne({ email });

    if (!user || !["admin", "superadmin", "user"].includes(user.role)) {
      logger.error(`Invalid admin login attempt: ${email}`);
      res.status(401);
      return next(new Error("Invalid credentials or role"));
    }

    if (user?.isLocked()) {
      logger.error(`Locked account login attempt: ${email}`);
      return res.status(423).json({ message: "Account is temporarily locked" });
    }

    if (!(await user.matchPassword(password))) {
      user.loginAttempts += 1;
      if (user.loginAttempts >= MAX_ATTEMPTS) {
        user.lockUntil = Date.now() + LOCK_TIME;
        logger.error(`Account locked due to max attempts: ${email}`);
      }
      await user.save();
      logger.error(
        `Incorrect password attempt: ${email}, attempts: ${user.loginAttempts}`
      );
      return res.status(401).json({ message: "Incorrect password" });
    }

    if (!user.isFullyActive()) {
      logger.error(`Inactive account login attempt: ${email}`);
      return res
        .status(403)
        .json({ message: "Account not active or approved" });
    }

    user.loginAttempts = 0;
    user.lockUntil = null;
    await user.save();

    logger.info(`Successful admin login: ${email}, role: ${user.role}`);

    return res.json({
      success: true,
      token: generateToken({ id: user._id, role: user.role }),
      user: {
        id: user._id,
        name: user.name,
        role: user.role,
        email: user.email,
        status: user.status,
        approvalStatus: user.approvalStatus,
      },
    });
  } catch (error) {
    logger.error(`Admin login error: ${error.message}`, error);
    next(error);
  }
};

// User or Mapper Login
const loginUser = async (req, res, next) => {
  const { idnumber, projectcode } = req.body;

  console.log(idnumber, projectcode);

  try {
    logger.info(`User login attempt: ID ${idnumber}, Project ${projectcode}`);

    if (!idnumber && !projectcode) {
      res.status(400);
      return next(new Error("ID number and project code are required"));
    }

    if (!idnumber) {
      res.status(400);
      return next(new Error("ID number is required"));
    }
    if (!projectcode) {
      res.status(400);
      return next(new Error("Project code is required"));
    }

    const user = await User.findOne({ idnumber, projectcode });

    if (!user || !["user", "mapper"].includes(user.role)) {
      logger.error(
        `Invalid user login attempt: ID ${idnumber}, Project ${projectcode}`
      );
      res.status(401);
      return next(new Error("Invalid credentials"));
    }

    if (user.isLocked()) {
      logger.error(`Locked user account login attempt: ${idnumber}`);
      return res.status(423).json({ message: "Account is temporarily locked" });
    }

    if (!user.isFullyActive()) {
      logger.error(`Inactive user account login attempt: ${idnumber}`);
      return res
        .status(403)
        .json({ message: "Account not active or approved" });
    }

    user.loginAttempts = 0;
    user.lockUntil = null;
    await user.save();

    logger.info(`Successful user login: ${idnumber}, role: ${user.role}`);

    return res.json({
      success: true,
      token: generateToken({ id: user._id, role: user.role }),
      user: {
        id: user._id,
        name: user.name,
        role: user.role,
        idnumber: user.idnumber,
        projectcode: user.projectcode,
        status: user.status,
        approvalStatus: user.approvalStatus,
      },
    });
  } catch (error) {
    logger.error(`User login error: ${error.message}`, error);
    next(error);
  }
};

// Superadmin approves account
const approveUser = async (req, res, next) => {
  const { userId } = req.params;
  const approver = req.user;

  try {
    logger.info(
      `User approval attempt by ${approver.role} (${approver._id}) for user: ${userId}`
    );

    if (approver.role !== "superadmin") {
      logger.error(`Non-superadmin approval attempt by: ${approver.role}`);
      res.status(403);
      return next(new Error("Only superadmin can approve users"));
    }

    const user = await User.findById(userId);
    if (!user) {
      logger.error(`User not found for approval: ${userId}`);
      res.status(404);
      return next(new Error("User not found"));
    }

    user.approvalStatus = "approved";
    user.status = "active";
    await user.save();

    logger.info(`User approved successfully: ${userId} by ${approver._id}`);

    // Send approval email
    try {
      await sendApprovalEmail(user.email, user.name, "approved", next);
      logger.info(`Approval email sent to: ${user.email}`);
    } catch (emailError) {
      logger.error(
        `Failed to send approval email to ${user.email}:`,
        emailError
      );
    }

    res.json({
      success: true,
      message: "User approved successfully",
      user: {
        id: user._id,
        name: user.name,
        status: user.status,
        approvalStatus: user.approvalStatus,
      },
    });
  } catch (error) {
    logger.error(`User approval error: ${error.message}`, error);
    next(error);
  }
};

const createMapper = async (req, res, next) => {
  const { cellphone, idnumber, name, project_id } = req.body;

  const creator = req.user.id || null;

  logger.info(
    `Creating mapper attempt: ${name}, role: mapper, creator: ${
      creator || "-registration"
    }`
  );

  if (!cellphone || !idnumber || !name || !project_id) {
    res.status(400);
    return next(
      new Error("Cellphone, ID number, name, and project ID are required")
    );
  }

  const existing = await User.findOne({ idnumber });
  if (existing) {
    logger.error(`User creation failed - duplicate found: ${idnumber}`);
    res.status(400);
    return next(new Error("User with this ID number already exists"));
  }

  const project = await ProjectModel.findById({ _id: project_id });
  if (!project) {
    logger.error(`User creation failed - project not found: ${project_id}`);
    res.status(400);
    return next(new Error("Project not found"));
  }

  try {
    const user = await User.create({
      name,
      cellphone,
      idnumber,
      projectcode: project.project_code,
      role: "mapper",
      approvalStatus: "approved",
      status: "active",
      project_id,
      creator,
    });

    res.status(201).json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        role: user.role,
        projectcode: user.projectcode,
        idnumber: user.idnumber,
        cellphone: user.cellphone,
        timestamp: user.timestamp,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createUser,
  inviteUser,
  acceptInvite,
  loginAdmin,
  loginUser,
  approveUser,
  createMapper,
};
