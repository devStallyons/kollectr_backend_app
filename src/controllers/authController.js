const User = require("../models/userModel");
const generateToken = require("../utils/generateToken");
const logger = require("../utils/logger");
const sendAcceptanceConfirmationEmail = require("../services/emailService/sendAcceptanceConfirmationEmail");
const sendInviteEmail = require("../services/emailService/sendInviteEmail");
const { sendWelcomeEmail } = require("../services/emailService/welcomEmail");
const { sendApprovalEmail } = require("../services/emailService/approvalEmail");
const {
  sendPasswordResetEmail,
} = require("../services/emailService/resetPasswordEmail");
const generatePassword = require("../utils/generatePassword");
const generateRandomUsername = require("../utils/generateRandomName");
const ProjectModel = require("../models/ProjectModel");
const tripModel = require("../models/tripModel");
const tripStopModel = require("../models/tripStopModel");
const dayjs = require("dayjs");

// Constants
const MAX_ATTEMPTS = 5;
const LOCK_TIME = 10 * 60 * 1000;
const INVITE_EXPIRY = 24 * 60 * 60 * 1000;
const RESET_TOKEN_EXPIRY = 24 * 60 * 60 * 1000;

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
  const { name, email, projectcode, idnumber, cellphone, project_id } =
    req.body;
  const inviter = req.user;
  const role = "user";

  try {
    logger.info(
      `User invitation attempt by ${inviter.role} (${inviter._id}) for email: ${email}, role: ${role}`
    );

    if (!canCreateRole(inviter.role, role)) {
      logger.error(
        `${inviter.role} attempted to invite unauthorized role: ${role}`
      );
      res.status(403);
      return next(new Error(`${inviter.role} cannot invite this role`));
    }

    const existing = await User.findOne({ email });
    if (existing) {
      logger.error(`Invitation failed - user already exists: ${email}`);
      res.status(400);
      return next(new Error("User with this email already exists"));
    }

    const inviteToken = generateToken({ email }, "24h");
    const inviteExpiry = new Date(Date.now() + INVITE_EXPIRY);

    const user = await User.create({
      // name,
      email,
      // projectcode,
      // idnumber,
      // cellphone,
      role: "user",
      status: "inactive",
      approvalStatus: "unapproved",
      inviteStatus: "pending",
      inviteToken,
      inviteExpiry,
      invitedBy: inviter._id,
      project_id,
    });

    logger.info(`Invitation created for user: ${user._id}, token generated`);

    const inviteLink = `${process.env.FRONTEND_URL}/accept-invite?token=${inviteToken}`;

    try {
      await sendInviteEmail(email, "", "", role, inviteLink);
      logger.info(`Invitation email sent to: ${email}`);
    } catch (emailError) {
      logger.error(`Failed to send invitation email to ${email}:`, emailError);
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

    if (!email || !password) {
      logger.error("Login attempt with missing credentials");
      res.status(400);
      return next(new Error("Email and password are required"));
    }

    const user = await User.findOne({ email });

    if (!user) {
      logger.error(`Login failed - user not found: ${email}`);
      res.status(401);
      return next(new Error("Invalid email or password"));
    }

    if (!["admin", "superadmin", "user"].includes(user.role)) {
      logger.error(
        `Unauthorized role login attempt: ${email}, role: ${user.role}`
      );
      res.status(403);
      return next(new Error("Access denied. Invalid role for this login"));
    }

    if (user.isLocked()) {
      const lockTimeRemaining = Math.ceil(
        (user.lockUntil - Date.now()) / 60000
      );
      logger.error(`Locked account login attempt: ${email}`);
      res.status(423);
      return next(
        new Error(
          `Account is temporarily locked. Please try again in ${lockTimeRemaining} minutes`
        )
      );
    }

    const isPasswordMatch = await user.matchPassword(password);

    if (!isPasswordMatch) {
      user.loginAttempts += 1;

      if (user.loginAttempts >= MAX_ATTEMPTS) {
        user.lockUntil = Date.now() + LOCK_TIME;
        await user.save();
        logger.error(`Account locked due to max attempts: ${email}`);
        res.status(423);
        return next(
          new Error("Account locked due to multiple failed login attempts")
        );
      }

      await user.save();
      const remainingAttempts = MAX_ATTEMPTS - user.loginAttempts;
      logger.error(
        `Incorrect password attempt: ${email}, attempts: ${user.loginAttempts}`
      );
      res.status(401);
      return next(
        new Error(
          `Invalid email or password. ${remainingAttempts} attempts remaining`
        )
      );
    }

    if (!user.isFullyActive()) {
      const statusMessage =
        user.status !== "active"
          ? "Your account is not active"
          : "Your account is pending approval";
      logger.error(
        `Inactive account login attempt: ${email}, status: ${user.status}, approval: ${user.approvalStatus}`
      );
      res.status(403);
      return next(new Error(statusMessage));
    }

    user.loginAttempts = 0;
    user.lockUntil = null;
    user.lastLogin = new Date();
    await user.save();

    logger.info(`Successful admin login: ${email}, role: ${user.role}`);

    res.status(200).json({
      success: true,
      message: "Login successful",
      token: generateToken({ id: user._id, role: user.role }),
      user: {
        id: user._id,
        name: user.name,
        role: user.role,
        email: user.email,
        status: user.status,
        approvalStatus: user.approvalStatus,
        lastLogin: user.lastLogin,
      },
    });
  } catch (error) {
    logger.error(`Admin login error: ${error.message}`, error);
    next(error);
  }
};
// const loginAdmin = async (req, res, next) => {
//   const { email, password } = req.body;

//   try {
//     logger.info(`Admin login attempt: ${email}`);

//     const user = await User.findOne({ email });

//     if (!user || !["admin", "superadmin", "user"].includes(user.role)) {
//       logger.error(`Invalid admin login attempt: ${email}`);
//       res.status(401);
//       return next(new Error("Invalid credentials or role"));
//     }

//     if (user?.isLocked()) {
//       logger.error(`Locked account login attempt: ${email}`);
//       return res.status(423).json({ message: "Account is temporarily locked" });
//     }

//     if (!(await user.matchPassword(password))) {
//       user.loginAttempts += 1;
//       if (user.loginAttempts >= MAX_ATTEMPTS) {
//         user.lockUntil = Date.now() + LOCK_TIME;
//         logger.error(`Account locked due to max attempts: ${email}`);
//       }
//       await user.save();
//       logger.error(
//         `Incorrect password attempt: ${email}, attempts: ${user.loginAttempts}`
//       );
//       return res.status(401).json({ message: "Incorrect password" });
//     }

//     if (!user.isFullyActive()) {
//       logger.error(`Inactive account login attempt: ${email}`);
//       return res
//         .status(403)
//         .json({ message: "Account not active or approved" });
//     }

//     user.loginAttempts = 0;
//     user.lockUntil = null;
//     await user.save();

//     logger.info(`Successful admin login: ${email}, role: ${user.role}`);

//     return res.json({
//       success: true,
//       token: generateToken({ id: user._id, role: user.role }),
//       user: {
//         id: user._id,
//         name: user.name,
//         role: user.role,
//         email: user.email,
//         status: user.status,
//         approvalStatus: user.approvalStatus,
//       },
//     });
//   } catch (error) {
//     logger.error(`Admin login error: ${error.message}`, error);
//     next(error);
//   }
// };

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

const updateMapper = async (req, res, next) => {
  const { id } = req.params;

  const { cellphone, idnumber, name, project_id } = req.body;

  const updater = req.user?.id || null;

  console.log("updater", req.body, id);

  logger.info(
    `Update mapper attempt: ${
      name || "-"
    } , mapper_id: ${id}, updater: ${updater}`
  );

  if (!cellphone || !idnumber || !name) {
    res.status(400);
    return next(
      new Error("Cellphone, ID number, name, and project ID are required")
    );
  }

  try {
    const mapper = await User.findById(id);

    if (!mapper) {
      logger.error(`Mapper update failed - user not found: ${id}`);
      res.status(404);
      return next(new Error("Mapper not found"));
    }

    const existing = await User.findOne({
      idnumber,
      _id: { $ne: id },
    });

    if (existing) {
      logger.error(`Mapper update failed - duplicate ID number: ${idnumber}`);
      res.status(400);
      return next(new Error("Another user with this ID number already exists"));
    }

    mapper.name = name;
    mapper.cellphone = cellphone;
    mapper.idnumber = idnumber;
    mapper.updatedBy = updater;
    mapper.timestamp = new Date();

    await mapper.save();

    logger.info(`Mapper updated successfully: ${mapper._id}`);

    return res.status(200).json({
      success: true,
      user: {
        id: mapper._id,
        name: mapper.name,
        role: mapper.role,
        idnumber: mapper.idnumber,
        cellphone: mapper.cellphone,
        timestamp: mapper.timestamp,
      },
    });
  } catch (error) {
    next(error);
  }
};

const forgotPassword = async (req, res, next) => {
  const { email } = req.body;

  try {
    logger.info(`Password reset request for email: ${email}`);

    if (!email) {
      res.status(400);
      return next(new Error("Email is required"));
    }

    const user = await User.findOne({ email });
    if (!user) {
      logger.error(`Password reset failed - user not found: ${email}`);
      res.status(404);
      return next(new Error("User with this email does not exist"));
    }

    if (user.status !== "active") {
      logger.error(`Password reset failed - user is inactive: ${email}`);
      res.status(400);
      return next(new Error("User account is not active"));
    }

    const resetToken = generateToken({ email, userId: user._id }, "24h");
    const resetExpiry = new Date(Date.now() + RESET_TOKEN_EXPIRY);

    user.resetPasswordToken = resetToken;
    user.resetPasswordExpiry = resetExpiry;
    await user.save();

    logger.info(`Password reset token generated for user: ${user._id}`);

    const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

    try {
      await sendPasswordResetEmail(email, resetLink);
      logger.info(`Password reset email sent to: ${email}`);
    } catch (emailError) {
      logger.error(
        `Failed to send password reset email to ${email}:`,
        emailError
      );
    }

    res.status(200).json({
      success: true,
      message: "Password reset link sent to your email",
      resetExpiry: resetExpiry,
    });
  } catch (error) {
    logger.error(`Forgot password error: ${error.message}`, error);
    next(error);
  }
};

const resetPassword = async (req, res, next) => {
  const { token, newPassword } = req.body;

  try {
    logger.info(`Password reset attempt with token`);

    if (!token || !newPassword) {
      res.status(400);
      return next(new Error("Token and new password are required"));
    }

    if (newPassword.length < 6) {
      res.status(400);
      return next(new Error("Password must be at least 6 characters long"));
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (jwtError) {
      logger.error(`Invalid JWT token: ${jwtError.message}`);
      res.status(400);
      return next(new Error("Invalid or expired token"));
    }

    const user = await User.findOne({
      _id: decoded.userId,
      resetPasswordToken: token,
      resetPasswordExpiry: { $gt: Date.now() },
    });

    if (!user) {
      logger.error(
        `Invalid or expired reset token for user: ${decoded.userId}`
      );
      res.status(400);
      return next(new Error("Invalid or expired reset token"));
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    user.password = hashedPassword;
    user.resetPasswordToken = null;
    user.resetPasswordExpiry = null;
    await user.save();

    logger.info(`Password reset successful for user: ${user._id}`);

    res.status(200).json({
      success: true,
      message:
        "Password reset successful. You can now login with your new password.",
    });
  } catch (error) {
    logger.error(`Reset password error: ${error.message}`, error);
    next(error);
  }
};

const getInvitedUsers = async (req, res, next) => {
  const inviter = req.user;
  const { project_id } = req.query;

  try {
    logger.info(`Fetching invited users for inviter: ${inviter._id}`);

    // Build query
    const query = { invitedBy: inviter._id };

    if (project_id) {
      query.project_id = project_id;
      query.role = "user";
    }

    const invitedUsers = await User.find(query)
      .select("-password -inviteToken -resetPasswordToken")
      .populate("project_id", "name code")
      .populate("invitedBy", "name email role")
      .sort({ timestamp: -1 });

    logger.info(
      `Found ${invitedUsers.length} invited users for inviter: ${inviter._id}${
        project_id ? ` in project: ${project_id}` : ""
      }`
    );

    res.status(200).json({
      success: true,
      count: invitedUsers.length,
      filters: {
        invitedBy: inviter._id,
        project_id: project_id || "all",
      },
      users: invitedUsers.map((user) => ({
        id: user._id,
        name: user.name || "Not provided",
        email: user.email,
        cellphone: user.cellphone || "Not provided",
        idnumber: user.idnumber || "Not provided",
        projectcode: user.projectcode || "Not provided",
        role: user.role,
        status: user.status,
        approvalStatus: user.approvalStatus,
        inviteStatus: user.inviteStatus,
        inviteExpiry: user.inviteExpiry,
        isInviteExpired: user.inviteExpiry
          ? user.inviteExpiry < new Date()
          : false,
        isInviteValid: user.isInviteValid ? user.isInviteValid() : false,
        invitedAt: dayjs(user.timestamp).format("YYYY-MM-DD"),
        project: user.project_id,
        invitedBy: user.invitedBy,
      })),
    });
  } catch (error) {
    logger.error(`Error fetching invited users: ${error.message}`, error);
    next(error);
  }
};

// const deleteInvitedUser = async (req, res, next) => {
//   const { userId } = req.params;
//   const inviter = req.user;
//   // console.log(inviter);

//   try {
//     if (!userId || userId === "undefined") {
//       logger.error("Invalid userId in delete request");
//       res.status(400);
//       return next(new Error("User ID is required"));
//     }

//     if (!inviter || !inviter.id) {
//       logger.error("Inviter not authenticated");
//       res.status(401);
//       return next(new Error("Authentication required"));
//     }

//     logger.info(
//       `Delete request for user ${userId} by ${inviter.role} (${inviter._id})`
//     );

//     const userToDelete = await User.findById(userId);

//     if (!userToDelete) {
//       logger.error(`User not found: ${userId}`);
//       res.status(404);
//       return next(new Error("User not found"));
//     }

//     if (
//       userToDelete.invitedBy?.toString() !== inviter.id.toString() &&
//       inviter.role !== "superadmin"
//     ) {
//       logger.error(
//         `Unauthorized delete attempt by ${inviter._id} for user ${userId}`
//       );
//       res.status(403);
//       return next(new Error("You are not authorized to delete this user"));
//     }

//     if (userToDelete.status === "active") {
//       logger.error(`Attempt to delete active user: ${userId}`);
//       res.status(400);
//       return next(
//         new Error("Cannot delete active users. Deactivate them first.")
//       );
//     }

//     // Delete the user
//     await User.findByIdAndDelete(userId);

//     logger.info(`User ${userId} deleted successfully by ${inviter._id}`);

//     res.status(200).json({
//       success: true,
//       message: "User deleted successfully",
//       deletedUser: {
//         id: userToDelete._id,
//         email: userToDelete.email,
//         name: userToDelete.name,
//       },
//     });
//   } catch (error) {
//     logger.error(`Error deleting user: ${error.message}`, error);
//     next(error);
//   }
// };

const deleteInvitedUser = async (req, res, next) => {
  const { userId } = req.params;
  const inviter = req.user;

  try {
    if (!userId || userId === "undefined") {
      logger.error("Invalid userId in delete request");
      res.status(400);
      return next(new Error("User ID is required"));
    }

    if (!inviter || !inviter.id) {
      logger.error("Inviter not authenticated");
      res.status(401);
      return next(new Error("Authentication required"));
    }

    logger.info(
      `Delete request for user ${userId} by ${inviter.role} (${inviter.id})`
    );

    const userToDelete = await User.findById(userId);

    if (!userToDelete) {
      logger.error(`User not found: ${userId}`);
      res.status(404);
      return next(new Error("User not found"));
    }

    if (
      userToDelete.invitedBy?.toString() !== inviter.id.toString() &&
      inviter.role !== "superadmin"
    ) {
      logger.error(
        `Unauthorized delete attempt by ${inviter.id} for user ${userId}`
      );
      res.status(403);
      return next(new Error("You are not authorized to delete this user"));
    }

    // if (userToDelete.status === "active") {
    //   logger.error(`Attempt to delete active user: ${userId}`);
    //   res.status(400);
    //   return next(
    //     new Error("Cannot delete active users. Deactivate them first.")
    //   );
    // }

    const trips = await tripModel.find({ mapper: userId });
    const tripIds = trips.map((trip) => trip._id);

    if (tripIds.length > 0) {
      const deletedStops = await tripStopModel.deleteMany({
        trip: { $in: tripIds },
      });
      logger.info(
        `Deleted ${deletedStops.deletedCount} trip stops for user ${userId}`
      );

      const deletedTrips = await Trip.deleteMany({ mapper: userId });
      logger.info(
        `Deleted ${deletedTrips.deletedCount} trips for user ${userId}`
      );
    }

    await User.findByIdAndDelete(userId);

    logger.info(
      `User ${userId} and all related data deleted successfully by ${inviter.id}`
    );

    res.status(200).json({
      success: true,
      message: "User and all related data deleted successfully",
      deletedUser: {
        id: userToDelete._id,
        email: userToDelete.email,
        name: userToDelete.name,
      },
      deletedData: {
        trips: tripIds.length,
        stops:
          tripIds.length > 0
            ? await TripStop.countDocuments({ trip: { $in: tripIds } })
            : 0,
      },
    });
  } catch (error) {
    logger.error(`Error deleting user: ${error.message}`, error);
    next(error);
  }
};
const getUsersByFilters = async (req, res, next) => {
  const inviter = req.user;
  const { role, project_id, status, approvalStatus, invitedBy } = req.query;

  try {
    if (!inviter || !inviter.id) {
      logger.error("Inviter not authenticated");
      res.status(401);
      return next(new Error("Authentication required"));
    }

    logger.info(
      `Fetching users with filters by ${inviter.role} (${inviter.id})`
    );

    const query = {};

    if (role) query.role = role;
    if (project_id) query.project_id = project_id;
    if (status) query.status = status;
    if (approvalStatus) query.approvalStatus = approvalStatus;

    if (invitedBy === "me") {
      query.invitedBy = inviter._id;
    } else if (invitedBy) {
      query.invitedBy = invitedBy;
    }

    if (inviter.role !== "superadmin") {
      query.$or = [
        { invitedBy: inviter._id },
        { project_id: inviter.project_id },
      ];
    }

    const users = await User.find(query)
      .select("-password -inviteToken -resetPasswordToken")
      .populate("project_id", "name code")
      .populate("invitedBy", "name email role")
      .sort({ timestamp: -1 });

    const stats = {
      total: users.length,
      active: users.filter((u) => u.status === "active").length,
      inactive: users.filter((u) => u.status === "inactive").length,
      approved: users.filter((u) => u.approvalStatus === "approved").length,
      unapproved: users.filter((u) => u.approvalStatus === "unapproved").length,
      byRole: {},
    };

    users.forEach((user) => {
      stats.byRole[user.role] = (stats.byRole[user.role] || 0) + 1;
    });

    logger.info(`Found ${users.length} users for inviter: ${inviter._id}`);

    res.status(200).json({
      success: true,
      filters: {
        role: role || "all",
        project_id: project_id || "all",
        status: status || "all",
        approvalStatus: approvalStatus || "all",
        invitedBy: invitedBy || "all",
      },
      stats,
      count: users.length,
      users: users.map((user) => ({
        id: user._id,
        name: user.name || "Not provided",
        email: user.email,
        cellphone: user.cellphone || "Not provided",
        idnumber: user.idnumber || "Not provided",
        projectcode: user.projectcode || "Not provided",
        role: user.role,
        status: user.status,
        approvalStatus: user.approvalStatus,
        inviteStatus: user.inviteStatus,
        inviteExpiry: user.inviteExpiry,
        isExpired: user.inviteExpiry ? user.inviteExpiry < new Date() : false,
        invitedAt: user.timestamp,
        project: user.project_id,
        invitedBy: user.invitedBy,
      })),
    });
  } catch (error) {
    logger.error(`Error fetching users: ${error.message}`, error);
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
  updateMapper,
  forgotPassword,
  resetPassword,
  getInvitedUsers,
  deleteInvitedUser,
  getUsersByFilters,
};
