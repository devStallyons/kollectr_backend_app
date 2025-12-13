// controllers/AuthController.js
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const User = require("../models/userModel");
const UserProject = require("../models/userProjectModel");
const Project = require("../models/ProjectModel");
const Trip = require("../models/tripModel");
const TripStop = require("../models/tripStopModel");
const generateToken = require("../utils/generateToken");
const generatePassword = require("../utils/generatePassword");
const logger = require("../utils/logger");
const dayjs = require("dayjs");
const relativeTime = require("dayjs/plugin/relativeTime");
dayjs.extend(relativeTime);

// Email Services
const sendInviteEmail = require("../services/emailService/sendInviteEmail");
const sendAcceptanceConfirmationEmail = require("../services/emailService/sendAcceptanceConfirmationEmail");
const { sendWelcomeEmail } = require("../services/emailService/welcomEmail");
const { sendApprovalEmail } = require("../services/emailService/approvalEmail");
const {
  sendPasswordResetEmail,
} = require("../services/emailService/resetPasswordEmail");
const { generateIdNumber } = require("../utils/generateTripAndStopId");

// Constants
const MAX_ATTEMPTS = 5;
const LOCK_TIME = 1 * 60 * 1000; // 1 minute
const INVITE_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours
const RESET_TOKEN_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours

// Role permissions - who can invite whom
const canInviteRole = (inviterRole, targetRole) => {
  const permissions = {
    superadmin: ["admin", "user", "mapper"],
    admin: ["user", "mapper"],
    user: ["mapper"],
  };
  return permissions[inviterRole]?.includes(targetRole) || false;
};

// ====================================
// CREATE USER (By Superadmin/Admin)
// ====================================
const createUser = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { name, cellphone, email, idnumber, role, project_id } = req.body;
    const creator = req.user;
    const password = generatePassword();

    logger.info(
      `Create user attempt: ${email}, role: ${role} by ${creator.role}`
    );

    // Validation
    if (!email || !role) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: "Email and role are required",
      });
    }

    // Check permission
    if (!canInviteRole(creator.role, role)) {
      await session.abortTransaction();
      session.endSession();
      return res.status(403).json({
        success: false,
        message: `${creator.role} cannot create ${role} role`,
      });
    }

    // Check existing
    const existing = await User.findOne({
      $or: [{ email }, ...(idnumber ? [{ idnumber }] : [])],
    }).session(session);

    if (existing) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: "User with this email or ID number already exists",
      });
    }

    // Get project if provided
    let project = null;
    if (project_id) {
      project = await Project.findById(project_id).session(session);
      if (!project) {
        await session.abortTransaction();
        session.endSession();
        return res.status(404).json({
          success: false,
          message: "Project not found",
        });
      }
    }

    // Determine status based on creator
    const isSuperadmin = creator.role === "superadmin";

    const user = await User.create(
      [
        {
          name,
          cellphone,
          email,
          idnumber,
          role,
          password,
          project_id: project_id || null,
          projectcode: project?.project_code || null,
          status: isSuperadmin ? "active" : "inactive",
          approvalStatus: isSuperadmin ? "approved" : "under_review",
          inviteStatus: "accepted",
          invitedBy: creator._id,
        },
      ],
      { session }
    );

    // Add to project if provided
    if (project_id) {
      await UserProject.addUserToProject(
        user[0]._id,
        project_id,
        role === "admin" ? "admin" : role,
        creator._id,
        session
      );
    }

    await session.commitTransaction();
    session.endSession();

    // Send welcome email
    try {
      await sendWelcomeEmail(email, name, password);
      logger.info(`Welcome email sent to: ${email}`);
    } catch (emailError) {
      logger.error(`Failed to send welcome email: ${emailError.message}`);
    }

    logger.info(`User created: ${user[0]._id}`);

    res.status(201).json({
      success: true,
      message: isSuperadmin
        ? "User created and approved successfully"
        : "User created and pending approval",
      data: {
        id: user[0]._id,
        name: user[0].name,
        email: user[0].email,
        role: user[0].role,
        status: user[0].status,
        approvalStatus: user[0].approvalStatus,
      },
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    logger.error(`Create user error: ${error.message}`);
    next(error);
  }
};

// ====================================
// INVITE USER
// ====================================
const inviteUser = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { email, project_id, role = "admin" } = req.body;
    const inviter = req.user;

    logger.info(`Invite user: ${email}, project: ${project_id}, role: ${role}`);

    // Validation
    if (!email || !project_id) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: "Email and project_id are required",
      });
    }

    // Check permission
    // if (!canInviteRole(inviter.role, role)) {
    //   await session.abortTransaction();
    //   session.endSession();
    //   return res.status(403).json({
    //     success: false,
    //     message: `${inviter.role} cannot invite ${role} role`,
    //   });
    // }

    // Check project
    const project = await Project.findById(project_id).session(session);
    if (!project) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    // Check existing user
    let user = await User.findOne({ email }).session(session);

    if (user) {
      // User exists - check if already in project
      const isInProject = await UserProject.isUserInProject(
        user._id,
        project_id
      );

      if (isInProject) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({
          success: false,
          message: "User is already in this project",
        });
      }

      // Add existing user to project
      await UserProject.addUserToProject(
        user._id,
        project_id,
        role,
        inviter._id,
        session
      );

      // Update user's default project if not set
      if (!user.project_id) {
        user.project_id = project_id;
        user.projectcode = project.project_code;
        await user.save({ session });
      }

      await session.commitTransaction();
      session.endSession();

      logger.info(
        `Existing user ${email} added to project ${project.project_code}`
      );

      return res.status(200).json({
        success: true,
        message: "User added to project successfully",
        data: {
          user: {
            id: user._id,
            name: user.name,
            email: user.email,
          },
          project: {
            id: project._id,
            name: project.name,
            project_code: project.project_code,
          },
          projectRole: role,
        },
      });
    }

    // Create new user with invite
    const inviteToken = generateToken({ email }, "24h");
    const inviteExpiry = new Date(Date.now() + INVITE_EXPIRY);

    const newUser = await User.create(
      [
        {
          email,
          role,
          status: "inactive",
          approvalStatus: "unapproved",
          inviteStatus: "pending",
          inviteToken,
          inviteExpiry,
          invitedBy: inviter._id,
          project_id,
          projectcode: project.project_code,
        },
      ],
      { session }
    );

    // Add to UserProject
    await UserProject.addUserToProject(
      newUser[0]._id,
      project_id,
      role,
      inviter._id,
      session
    );

    await session.commitTransaction();
    session.endSession();

    // Send invite email
    const inviteLink = `${process.env.FRONTEND_URL}/accept-invite?token=${inviteToken}`;
    try {
      await sendInviteEmail(email, "", project.name, role, inviteLink);
      logger.info(`Invite email sent to: ${email}`);
    } catch (emailError) {
      logger.error(`Failed to send invite email: ${emailError.message}`);
    }

    logger.info(
      `User invited: ${newUser[0]._id} to project ${project.project_code}`
    );

    res.status(201).json({
      success: true,
      message: "Invitation sent successfully",
      data: {
        user: {
          id: newUser[0]._id,
          email: newUser[0].email,
          role: newUser[0].role,
          inviteExpiry: newUser[0].inviteExpiry,
        },
        project: {
          id: project._id,
          name: project.name,
          project_code: project.project_code,
        },
      },
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    logger.error(`Invite user error: ${error.message}`);
    next(error);
  }
};

// ====================================
// ACCEPT INVITE
// ====================================
const acceptInvite = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { token, password, name, cellphone } = req.body;

    logger.info(`Accept invite attempt`);

    const idnumber = await generateIdNumber();

    // Validation
    if (!token || !password) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: "Token and password are required",
      });
    }

    // Find user by token
    const user = await User.findOne({
      inviteToken: token,
      inviteExpiry: { $gt: new Date() },
    }).session(session);

    if (!user) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: "Invalid or expired invitation token",
      });
    }

    // Check duplicate idnumber
    if (idnumber) {
      const existingId = await User.findOne({
        idnumber,
        _id: { $ne: user._id },
      }).session(session);

      if (existingId) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({
          success: false,
          message: "ID number already exists",
        });
      }
    }

    // Update user
    user.name = name || user.name;
    user.cellphone = cellphone || user.cellphone;
    user.idnumber = idnumber || user.idnumber;
    user.password = password;
    user.status = "active";
    user.approvalStatus =
      user.role === "mapper" || user.role === "admin"
        ? "approved"
        : "under_review";
    // user.approvalStatus = user.role === "mapper" ? "approved" : "under_review";
    user.inviteStatus = "accepted";
    user.inviteToken = undefined;
    user.inviteExpiry = undefined;

    await user.save({ session });

    // Get user's projects
    const userProjects = await UserProject.getUserProjects(user._id);

    await session.commitTransaction();
    session.endSession();

    // Send confirmation email
    try {
      await sendAcceptanceConfirmationEmail(
        user.email,
        user.name,
        user.role,
        user.projectcode,
        user.approvalStatus
      );
    } catch (emailError) {
      logger.error(`Failed to send confirmation email: ${emailError.message}`);
    }

    logger.info(`Invite accepted by user: ${user._id}`);

    res.json({
      success: true,
      message: "Invitation accepted successfully",
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          status: user.status,
          approvalStatus: user.approvalStatus,
        },
        projects: userProjects.map((up) => ({
          id: up.project_id?._id,
          name: up.project_id?.name,
          project_code: up.project_id?.project_code,
          role: up.role,
        })),
      },
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    logger.error(`Accept invite error: ${error.message}`);
    next(error);
  }
};

// ====================================
// CREATE MAPPER
// ====================================

const createMapper = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { name, cellphone, idnumber, project_id } = req.body;
    const creator = req.user;

    logger.info(`Create mapper: ${name}, project: ${project_id}`);

    // Validation
    const requiredFields = {
      name: "Name is required",
      cellphone: "Cellphone is required",
      idnumber: "ID number is required",
      project_id: "Project ID is required",
    };

    for (let field in requiredFields) {
      if (!req.body[field]) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({
          success: false,
          message: requiredFields[field],
        });
      }
    }

    if (cellphone.length < 8 || cellphone.length > 16) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: "Cellphone must be between 8 and 16 characters",
      });
    }

    // Check permission
    if (!canInviteRole(creator.role, "mapper")) {
      await session.abortTransaction();
      session.endSession();
      return res.status(403).json({
        success: false,
        message: `${creator.role} cannot create mapper`,
      });
    }

    // Check project
    const project = await Project.findById(project_id).session(session);
    if (!project) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    // Check existing idnumber
    const existing = await User.findOne({ idnumber }).session(session);

    if (existing) {
      // Check if mapper is already in this project
      const isInProject = await UserProject.isUserInProject(
        existing._id,
        project_id
      );

      if (isInProject) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({
          success: false,
          message: "Mapper with this ID number already exists in this project",
        });
      }

      // Add existing mapper to project
      await UserProject.addUserToProject(
        existing._id,
        project_id,
        "mapper",
        creator._id,
        session
      );

      // ✅ Update user's projectcodes array - push new project code
      const updatedMapper = await User.findByIdAndUpdate(
        existing._id,
        {
          $addToSet: { projectcodes: project.project_code },
          $set: {
            project_id: project_id,
            projectcode: project.project_code,
          },
        },
        { session, new: true }
      );

      await session.commitTransaction();
      session.endSession();

      logger.info(
        `Existing mapper ${existing._id} added to project ${project_id}`
      );

      return res.status(200).json({
        success: true,
        message: "Existing mapper added to project",
        data: {
          id: updatedMapper._id,
          name: updatedMapper.name,
          idnumber: updatedMapper.idnumber,
          cellphone: updatedMapper.cellphone,
          projectcode: updatedMapper.projectcode,
          projectcodes: updatedMapper.projectcodes,
          project: {
            id: project._id,
            name: project.name,
            project_code: project.project_code,
          },
        },
      });
    }

    // Create new mapper
    const mapper = await User.create(
      [
        {
          name,
          cellphone,
          idnumber,
          role: "mapper",
          status: "active",
          approvalStatus: "approved",
          inviteStatus: "accepted",
          invitedBy: creator._id,
          project_id,
          projectcode: project.project_code,
          projectcodes: [project.project_code],
        },
      ],
      { session }
    );

    // Add to UserProject
    await UserProject.addUserToProject(
      mapper[0]._id,
      project_id,
      "mapper",
      creator._id,
      session
    );

    await session.commitTransaction();
    session.endSession();

    logger.info(`Mapper created: ${mapper[0]._id}`);

    res.status(201).json({
      success: true,
      message: "Mapper created successfully",
      data: {
        id: mapper[0]._id,
        name: mapper[0].name,
        role: mapper[0].role,
        idnumber: mapper[0].idnumber,
        cellphone: mapper[0].cellphone,
        projectcode: mapper[0].projectcode,
        projectcodes: mapper[0].projectcodes,
        project: {
          id: project._id,
          name: project.name,
          project_code: project.project_code,
        },
      },
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    logger.error(`Create mapper error: ${error.message}`);
    next(error);
  }
};
// const createMapper = async (req, res, next) => {
//   const session = await mongoose.startSession();
//   session.startTransaction();

//   try {
//     const { name, cellphone, idnumber, project_id } = req.body;
//     const creator = req.user;

//     logger.info(`Create mapper: ${name}, project: ${project_id}`);

//     // Validation
//     const requiredFields = {
//       name: "Name is required",
//       cellphone: "Cellphone is required",
//       idnumber: "ID number is required",
//       project_id: "Project ID is required",
//     };

//     for (let field in requiredFields) {
//       if (!req.body[field]) {
//         await session.abortTransaction();
//         session.endSession();
//         return res.status(400).json({
//           success: false,
//           message: requiredFields[field],
//         });
//       }
//     }
//     if (cellphone.length < 8 || cellphone.length > 16) {
//       await session.abortTransaction();
//       session.endSession();
//       return res.status(400).json({
//         success: false,
//         message: "Cellphone must be between 8 and 16 characters",
//       });
//     }
//     // if (!name || !cellphone || !idnumber || !project_id) {
//     //   await session.abortTransaction();
//     //   session.endSession();
//     //   return res.status(400).json({
//     //     success: false,
//     //     message: "Name, cellphone, ID number, and project_id are required",
//     //   });
//     // }

//     // Check permission
//     if (!canInviteRole(creator.role, "mapper")) {
//       await session.abortTransaction();
//       session.endSession();
//       return res.status(403).json({
//         success: false,
//         message: `${creator.role} cannot create mapper`,
//       });
//     }

//     // Check project
//     const project = await Project.findById(project_id).session(session);
//     if (!project) {
//       await session.abortTransaction();
//       session.endSession();
//       return res.status(404).json({
//         success: false,
//         message: "Project not found",
//       });
//     }

//     // Check existing idnumber
//     const existing = await User.findOne({ idnumber }).session(session);

//     if (existing) {
//       // Check if mapper is already in this project
//       const isInProject = await UserProject.isUserInProject(
//         existing._id,
//         project_id
//       );

//       if (isInProject) {
//         await session.abortTransaction();
//         session.endSession();
//         return res.status(400).json({
//           success: false,
//           message: "Mapper with this ID number already exists in this project",
//         });
//       }

//       // Add existing mapper to project
//       await UserProject.addUserToProject(
//         existing._id,
//         project_id,
//         "mapper",
//         creator._id,
//         session
//       );

//       await session.commitTransaction();
//       session.endSession();

//       return res.status(200).json({
//         success: true,
//         message: "Existing mapper added to project",
//         data: {
//           id: existing._id,
//           name: existing.name,
//           idnumber: existing.idnumber,
//         },
//       });
//     }

//     // Create new mapper
//     const mapper = await User.create(
//       [
//         {
//           name,
//           cellphone,
//           idnumber,
//           role: "mapper",
//           status: "active",
//           approvalStatus: "approved",
//           inviteStatus: "accepted",
//           invitedBy: creator._id,
//           project_id,
//           projectcode: project.project_code,
//           projectcodes: [project.project_code],
//         },
//       ],
//       { session }
//     );

//     // Add to UserProject
//     await UserProject.addUserToProject(
//       mapper[0]._id,
//       project_id,
//       "mapper",
//       creator._id,
//       session
//     );

//     await session.commitTransaction();
//     session.endSession();

//     logger.info(`Mapper created: ${mapper[0]._id}`);

//     res.status(201).json({
//       success: true,
//       message: "Mapper created successfully",
//       data: {
//         id: mapper[0]._id,
//         name: mapper[0].name,
//         role: mapper[0].role,
//         idnumber: mapper[0].idnumber,
//         cellphone: mapper[0].cellphone,
//         project: {
//           id: project._id,
//           name: project.name,
//           project_code: project.project_code,
//         },
//       },
//     });
//   } catch (error) {
//     await session.abortTransaction();
//     session.endSession();
//     logger.error(`Create mapper error: ${error.message}`);
//     next(error);
//   }
// };

// ====================================
// UPDATE MAPPER
// ====================================
const updateMapper = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, cellphone, idnumber } = req.body;

    logger.info(`Update mapper: ${id}`);

    // Validation
    const requiredFields = {
      name: "Name is required",
      cellphone: "Cellphone is required",
      idnumber: "ID number is required",
    };

    for (let field in requiredFields) {
      if (!req.body[field]) {
        return res.status(400).json({
          success: false,
          message: requiredFields[field],
        });
      }
    }
    if (cellphone.length < 8 || cellphone.length > 16) {
      return res.status(400).json({
        success: false,
        message: "Cellphone must be between 8 and 16 characters",
      });
    }

    const mapper = await User.findById(id);
    if (!mapper || mapper.role !== "mapper") {
      return res.status(404).json({
        success: false,
        message: "Mapper not found",
      });
    }

    // Check duplicate idnumber
    const existing = await User.findOne({ idnumber, _id: { $ne: id } });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: "ID number already exists",
      });
    }

    mapper.name = name;
    mapper.cellphone = cellphone;
    mapper.idnumber = idnumber;
    await mapper.save();

    logger.info(`Mapper updated: ${mapper._id}`);

    res.json({
      success: true,
      message: "Mapper updated successfully",
      data: {
        id: mapper._id,
        name: mapper.name,
        idnumber: mapper.idnumber,
        cellphone: mapper.cellphone,
      },
    });
  } catch (error) {
    logger.error(`Update mapper error: ${error.message}`);
    next(error);
  }
};

// ====================================
// LOGIN ADMIN
// ====================================
const loginAdmin = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    logger.info(`Admin login: ${email}`);

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // Check role
    if (!["admin", "superadmin", "user"].includes(user.role)) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    // Check lock
    if (user.isLocked()) {
      if (Date.now() > user.lockUntil) {
        user.loginAttempts = 0;
        user.lockUntil = null;
        await user.save();
      } else {
        const mins = Math.ceil((user.lockUntil - Date.now()) / 60000);
        return res.status(423).json({
          success: false,
          message: `Account locked. Try again in ${mins} minutes`,
        });
      }
    }

    // Check password
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      user.loginAttempts += 1;

      if (user.loginAttempts >= MAX_ATTEMPTS) {
        user.lockUntil = Date.now() + LOCK_TIME;
        await user.save();
        return res.status(423).json({
          success: false,
          message: "Account locked due to failed attempts",
        });
      }

      await user.save();
      const remaining = MAX_ATTEMPTS - user.loginAttempts;
      return res.status(401).json({
        success: false,
        message: `Invalid password. ${remaining} attempts remaining`,
      });
    }

    // Check active
    if (!user.isFullyActive()) {
      return res.status(403).json({
        success: false,
        message:
          user.status !== "active"
            ? "Account is not active"
            : "Account pending approval",
      });
    }

    // Reset attempts
    user.loginAttempts = 0;
    user.lockUntil = null;
    user.lastLogin = new Date();
    await user.save();

    // Get user projects
    const userProjects = await UserProject.getUserProjects(user._id);
    const defaultProject = await UserProject.getDefaultProject(user._id);

    logger.info(`Admin login successful: ${email}`);

    res.json({
      success: true,
      message: "Login successful",
      token: generateToken({ id: user._id, role: user.role }),
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          status: user.status,
          approvalStatus: user.approvalStatus,
          lastLogin: user.lastLogin,
        },
        projects: userProjects.map((up) => ({
          id: up.project_id?._id,
          name: up.project_id?.name,
          project_code: up.project_id?.project_code,
          role: up.role,
          isDefault: up.is_default,
        })),
        currentProject: defaultProject
          ? {
              id: defaultProject.project_id?._id,
              name: defaultProject.project_id?.name,
              project_code: defaultProject.project_id?.project_code,
              role: defaultProject.role,
            }
          : null,
      },
    });
  } catch (error) {
    logger.error(`Admin login error: ${error.message}`);
    next(error);
  }
};

// ====================================
// LOGIN USER/MAPPER
// ====================================

const loginUser = async (req, res, next) => {
  try {
    const { idnumber, projectcode } = req.body;

    logger.info(`User login: ${idnumber}, ${projectcode}`);

    // Validation
    if (!idnumber || !projectcode) {
      return res.status(400).json({
        success: false,
        message: "ID number and project code are required",
      });
    }

    // Find user
    const cleanId = String(idnumber).trim();
    const cleanProjectCode = String(projectcode).trim();

    const user = await User.findOne({ idnumber: cleanId });

    if (!user || !["mapper"].includes(user.role)) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    // ✅ Check if projectcode exists in user's projectcodes array
    if (!user.projectcodes || !user.projectcodes.includes(cleanProjectCode)) {
      return res.status(401).json({
        success: false,
        message:
          "Invalid project code or you don't have access to this project",
      });
    }

    // Find project
    const project = await Project.findOne({ project_code: cleanProjectCode });

    if (!project) {
      return res.status(401).json({
        success: false,
        message: "Invalid project code",
      });
    }

    // Check if user in project (UserProject table)
    const userProject = await UserProject.findOne({
      user_id: new mongoose.Types.ObjectId(user._id),
      project_id: new mongoose.Types.ObjectId(project._id),
      status: "active",
    });

    if (!userProject) {
      return res.status(403).json({
        success: false,
        message: "You do not have access to this project",
      });
    }

    // Check lock
    if (user.isLocked()) {
      return res.status(423).json({
        success: false,
        message: "Account is locked",
      });
    }

    // Check active
    if (!user.isFullyActive()) {
      return res.status(403).json({
        success: false,
        message: "Account not active or approved",
      });
    }

    // Update
    user.loginAttempts = 0;
    user.lockUntil = null;
    user.lastLogin = new Date();
    user.projectcode = cleanProjectCode; // ✅ Current active project code update
    user.project_id = project._id; // ✅ Current active project id update
    await user.save();

    await userProject.updateLastAccessed();

    logger.info(
      `User login successful: ${idnumber}, project: ${cleanProjectCode}`
    );

    return res.json({
      success: true,
      token: generateToken({ id: user._id, role: user.role }),
      user: {
        id: user._id,
        name: user.name,
        role: user.role,
        idnumber: user.idnumber,
        projectcode: cleanProjectCode,
        projectcodes: user.projectcodes,
        status: user.status,
        approvalStatus: user.approvalStatus,
        project: {
          id: project._id,
          name: project.name,
          project_code: project.project_code,
        },
      },
    });
  } catch (error) {
    logger.error(`User login error: ${error.message}`);
    next(error);
  }
};
// const loginUser = async (req, res, next) => {
//   try {
//     const { idnumber, projectcode } = req.body;

//     logger.info(`User login: ${idnumber}, ${projectcode}`);

//     console.log(idnumber, projectcode);

//     // Validation
//     if (!idnumber || !projectcode) {
//       return res.status(400).json({
//         success: false,
//         message: "ID number and project code are required",
//       });
//     }

//     // Find user
//     const cleanId = String(idnumber).trim();
//     const user = await User.findOne({ idnumber: cleanId });

//     // console.log("-->>", user);

//     if (!user || !["mapper"].includes(user.role)) {
//       return res.status(401).json({
//         success: false,
//         message: "Invalid credentials",
//       });
//     }

//     // Find project
//     const projectId = projectcode.trim();
//     const project = await Project.findOne({ project_code: "PROJ003" });
//     console.log("proejct----->>", project);

//     if (!project) {
//       return res.status(401).json({
//         success: false,
//         message: "Invalid project code",
//       });
//     }

//     // Check if user in project
//     const userProject = await UserProject.findOne({
//       user_id: new mongoose.Types.ObjectId(user._id),
//       project_id: new mongoose.Types.ObjectId(project._id),
//       status: "active",
//     });

//     // console.log(userProject, req.body);

//     if (!userProject) {
//       return res.status(403).json({
//         success: false,
//         message: "You do not have access to this project",
//       });
//     }

//     // Check lock
//     if (user.isLocked()) {
//       return res.status(423).json({
//         success: false,
//         message: "Account is locked",
//       });
//     }

//     // Check active
//     if (!user.isFullyActive()) {
//       return res.status(403).json({
//         success: false,
//         message: "Account not active or approved",
//       });
//     }

//     // Update
//     user.loginAttempts = 0;
//     user.lockUntil = null;
//     user.lastLogin = new Date();
//     await user.save();

//     await userProject.updateLastAccessed();

//     logger.info(`User login successful: ${idnumber}`);

//     return res.json({
//       success: true,
//       token: generateToken({ id: user._id, role: user.role }),
//       user: {
//         id: user._id,
//         name: user.name,
//         role: user.role,
//         idnumber: user.idnumber,
//         projectcode: user.projectcode,
//         status: user.status,
//         approvalStatus: user.approvalStatus,
//       },
//     });
//   } catch (error) {
//     logger.error(`User login error: ${error.message}`);
//     next(error);
//   }
// };

// ====================================
// APPROVE USER
// ====================================
const approveUser = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const approver = req.user;

    logger.info(`Approve user: ${userId} by ${approver._id}`);

    if (approver.role !== "superadmin") {
      return res.status(403).json({
        success: false,
        message: "Only superadmin can approve users",
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    user.approvalStatus = "approved";
    user.status = "active";
    await user.save();

    // Send email
    try {
      await sendApprovalEmail(user.email, user.name, "approved");
    } catch (emailError) {
      logger.error(`Failed to send approval email: ${emailError.message}`);
    }

    logger.info(`User approved: ${userId}`);

    res.json({
      success: true,
      message: "User approved successfully",
      data: {
        id: user._id,
        name: user.name,
        status: user.status,
        approvalStatus: user.approvalStatus,
      },
    });
  } catch (error) {
    logger.error(`Approve user error: ${error.message}`);
    next(error);
  }
};

// ====================================
// FORGOT PASSWORD
// ====================================
const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    logger.info(`Forgot password: ${email}`);

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found with this email",
      });
    }

    const resetToken = generateToken({ email, userId: user._id }, "24h");
    const resetExpiry = new Date(Date.now() + RESET_TOKEN_EXPIRY);

    user.resetPasswordToken = resetToken;
    user.resetPasswordExpiry = resetExpiry;
    await user.save();

    const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

    sendPasswordResetEmail(email, resetLink)
      .then(() => {
        logger.info(`Password reset email sent to ${email}`);
      })
      .catch(async (emailError) => {
        logger.error(`Failed to send reset email: ${emailError.message}`);
        // Optional: Clear token if email fails
        await User.findByIdAndUpdate(user._id, {
          resetPasswordToken: null,
          resetPasswordExpiry: null,
        });
      });
    // try {
    //   await sendPasswordResetEmail(email, resetLink);
    // } catch (emailError) {
    //   logger.error(`Failed to send reset email: ${emailError.message}`);

    //   user.resetPasswordToken = null;
    //   user.resetPasswordExpiry = null;
    //   await user.save();

    //   return res.status(500).json({
    //     success: false,
    //     message: "Failed to send reset email. Please try again later.",
    //   });
    // }

    logger.info(`Password reset token generated for: ${email}`);

    res.status(200).json({
      success: true,
      message: "Password reset link sent to your email",
    });
  } catch (error) {
    logger.error(`Forgot password error: ${error.message}`);
    next(error);
  }
};
// const forgotPassword = async (req, res, next) => {
//   try {
//     const { email } = req.body;

//     logger.info(`Forgot password: ${email}`);

//     if (!email) {
//       return res.status(400).json({
//         success: false,
//         message: "Email is required",
//       });
//     }

//     const user = await User.findOne({ email });
//     if (!user) {
//       return res.status(404).json({
//         success: false,
//         message: "User not found",
//       });
//     }

//     const resetToken = generateToken({ email, userId: user._id }, "24h");
//     const resetExpiry = new Date(Date.now() + RESET_TOKEN_EXPIRY);

//     user.resetPasswordToken = resetToken;
//     user.resetPasswordExpiry = resetExpiry;
//     await user.save();

//     const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
//     try {
//       await sendPasswordResetEmail(email, resetLink);
//     } catch (emailError) {
//       logger.error(`Failed to send reset email: ${emailError.message}`);
//     }

//     logger.info(`Password reset token generated for: ${email}`);

//     res.status(200).json({
//       success: true,
//       message: "Password reset link sent to your email",
//     });
//   } catch (error) {
//     logger.error(`Forgot password error: ${error.message}`);
//     next(error);
//   }
// };

// ====================================
// RESET PASSWORD
// ====================================
const resetPassword = async (req, res, next) => {
  try {
    const { token, newPassword } = req.body;

    logger.info(`Reset password attempt`);

    if (!token || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Token and new password are required",
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters",
      });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (jwtError) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired token",
      });
    }

    const user = await User.findOne({
      _id: decoded.userId,
      resetPasswordToken: token,
      resetPasswordExpiry: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired token",
      });
    }

    user.password = newPassword;
    user.resetPasswordToken = null;
    user.resetPasswordExpiry = null;
    await user.save();

    logger.info(`Password reset successful: ${user._id}`);

    res.json({
      success: true,
      message: "Password reset successful",
    });
  } catch (error) {
    logger.error(`Reset password error: ${error.message}`);
    next(error);
  }
};

// ====================================
// GET INVITED USERS
// ====================================
const getInvitedUsers = async (req, res, next) => {
  try {
    const inviter = req.user;
    const { project_id, status, role } = req.query;

    console.log(project_id, status, role);

    logger.info(`Get invited users by: ${inviter.id}`);

    // 🔹 Base query for UserProject
    const userProjectQuery = {
      invited_by: inviter.id,
    };

    if (project_id) {
      userProjectQuery.project_id = new mongoose.Types.ObjectId(project_id);
    }

    if (role) {
      userProjectQuery.role = role;
    }

    const userProjects = await UserProject.find(userProjectQuery)
      .populate(
        "user_id",
        "name email cellphone idnumber role status approvalStatus inviteStatus inviteExpiry created_at"
      )
      .populate("project_id", "name project_code");

    // ❗ remove null users (filter mismatch)
    const filtered = userProjects.filter((up) => up.user_id);

    const users = filtered.map((up) => ({
      id: up.user_id._id,
      name: up.user_id.name || "Not provided",
      email: up.user_id.email,
      cellphone: up.user_id.cellphone,
      idnumber: up.user_id.idnumber,
      userRole: up.user_id.role,
      projectRole: up.role,
      status: up.user_id.status,
      approvalStatus: up.user_id.approvalStatus,
      inviteStatus: up.user_id.inviteStatus,
      inviteExpiry: up.user_id.inviteExpiry,
      isExpired: up.user_id.inviteExpiry
        ? up.user_id.inviteExpiry < new Date()
        : false,
      project: {
        id: up.project_id?._id,
        name: up.project_id?.name,
        project_code: up.project_id?.project_code,
      },
      joinedAt: dayjs(up.joined_at).format("YYYY-MM-DD HH:mm:ss"),
      invitedAt: dayjs(up.created_at).format("YYYY-MM-DD HH:mm:ss"),
      invitedBy: up.invited_by,
    }));

    return res.json({
      success: true,
      count: users.length,
      data: users,
    });
  } catch (error) {
    logger.error(`Get invited users error: ${error.message}`);
    next(error);
  }
};

// const getInvitedUsers = async (req, res, next) => {
//   try {
//     const inviter = req.user;
//     const { project_id, status, role } = req.query;

//     logger.info(`Get invited users by: ${inviter.id}`);

//     // If project_id provided, get users in that project
//     if (project_id) {
//       const projectUsers = await UserProject.getProjectUsers(project_id);

//       const users = projectUsers.map((pu) => ({
//         id: pu.user_id?._id,
//         name: pu.user_id?.name || "Not provided",
//         email: pu.user_id?.email,
//         cellphone: pu.user_id?.cellphone,
//         idnumber: pu.user_id?.idnumber,
//         userRole: pu.user_id?.role,
//         projectRole: pu.role,
//         status: pu.user_id?.status,
//         approvalStatus: pu.user_id?.approvalStatus,
//         joinedAt: dayjs(pu.joined_at).format("YYYY-MM-DD HH:mm:ss"),
//         invitedAt: dayjs(pu.created_at).format("YYYY-MM-DD HH:mm:ss"),

//         invitedBy: pu.invited_by,
//       }));

//       // console.log("result====>>>", users);

//       return res.json({
//         success: true,
//         count: users.length,
//         data: users,
//       });
//     }

//     // Get all users invited by this user
//     const query = { invitedBy: inviter.id };
//     if (status) query.status = status;
//     if (role) query.role = role;

//     const users = await User.find(query)
//       .select("-password -inviteToken -resetPasswordToken")
//       .populate("project_id", "name project_code")
//       .sort({ created_at: -1 });

//     const result = await Promise.all(
//       users.map(async (user) => {
//         const userProjects = await UserProject.find({ user_id: user._id })
//           .populate("project_id", "name project_code")
//           .select("project_id role status joined_at");

//         return {
//           id: user._id,
//           name: user.name || "Not provided",
//           email: user.email,
//           cellphone: user.cellphone,
//           idnumber: user.idnumber,
//           role: user.role,
//           status: user.status,
//           approvalStatus: user.approvalStatus,
//           inviteStatus: user.inviteStatus,
//           inviteExpiry: user.inviteExpiry,
//           isExpired: user.inviteExpiry ? user.inviteExpiry < new Date() : false,
//           createdAt: user.created_at,
//           projects: userProjects.map((up) => ({
//             id: up.project_id?._id,
//             name: up.project_id?.name,
//             project_code: up.project_id?.project_code,
//             role: up.role,
//           })),
//         };
//       })
//     );

//     console.log("result====>>>", result);

//     res.json({
//       success: true,
//       count: result.length,
//       data: result,
//     });
//   } catch (error) {
//     logger.error(`Get invited users error: ${error.message}`);
//     next(error);
//   }
// };

// ====================================
// DELETE USER
// ====================================
const deleteInvitedUser = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { userId } = req.params;
    const inviter = req.user;

    logger.info(`Delete user: ${userId} by ${inviter._id}`);

    if (!userId) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: "User ID is required",
      });
    }

    const user = await User.findById({ _id: userId }).session(session);
    if (!user) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Check permission
    if (
      user.invitedBy?.toString() !== inviter.id.toString() &&
      inviter.role !== "superadmin"
    ) {
      await session.abortTransaction();
      session.endSession();
      return res.status(403).json({
        success: false,
        message: "Not authorized to delete this user",
      });
    }

    const deletionResults = {
      userProjects: 0,
      trips: 0,
      tripStops: 0,
    };

    // Delete user projects
    const upResult = await UserProject.deleteMany({ user_id: userId }).session(
      session
    );
    deletionResults.userProjects = upResult.deletedCount;

    // Delete trips and stops
    const trips = await Trip.find({ mapper: userId })
      .select("_id")
      .session(session);
    const tripIds = trips.map((t) => t._id);

    if (tripIds.length > 0) {
      const stopsResult = await TripStop.deleteMany({
        trip: { $in: tripIds },
      }).session(session);
      deletionResults.tripStops = stopsResult.deletedCount;

      const tripsResult = await Trip.deleteMany({ mapper: userId }).session(
        session
      );
      deletionResults.trips = tripsResult.deletedCount;
    }

    // Delete user
    await User.findByIdAndDelete(userId).session(session);

    await session.commitTransaction();
    session.endSession();

    logger.info(`User deleted: ${userId}`);

    res.json({
      success: true,
      message: "User deleted successfully",
      data: {
        deletedUser: {
          id: user._id,
          email: user.email,
          name: user.name,
        },
        deletionDetails: deletionResults,
      },
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    logger.error(`Delete user error: ${error.message}`);
    next(error);
  }
};

// ====================================
// GET USERS BY FILTERS
// ====================================
const getUsersByFilters = async (req, res, next) => {
  try {
    const inviter = req.user;
    const { role, project_id, status, approvalStatus } = req.query;

    logger.info(`Get users by filters by: ${inviter._id}`);

    const query = {};

    if (role) query.role = role;
    if (status) query.status = status;
    if (approvalStatus) query.approvalStatus = approvalStatus;

    // Non-superadmin can only see users they invited or in their projects
    if (inviter.role !== "superadmin") {
      query.invitedBy = inviter._id;
    }

    let users;

    if (project_id) {
      // Get users in specific project
      const projectUsers = await UserProject.find({ project_id })
        .populate({
          path: "user_id",
          match: query,
          select: "-password -inviteToken -resetPasswordToken",
        })
        .populate("invited_by", "name email");

      users = projectUsers
        .filter((pu) => pu.user_id)
        .map((pu) => ({
          id: pu.user_id._id,
          name: pu.user_id.name,
          email: pu.user_id.email,
          cellphone: pu.user_id.cellphone,
          idnumber: pu.user_id.idnumber,
          role: pu.user_id.role,
          projectRole: pu.role,
          status: pu.user_id.status,
          approvalStatus: pu.user_id.approvalStatus,
          inviteStatus: pu.user_id.inviteStatus,
          // joinedAt: pu.joined_at,
          joinedAt: dayjs(pu.joined_at).format("YYYY-MM-DD"),
        }));
    } else {
      users = await User.find(query)
        .select("-password -inviteToken -resetPasswordToken")
        .sort({ created_at: -1 });

      users = users.map((u) => ({
        id: u._id,
        name: u.name,
        email: u.email,
        cellphone: u.cellphone,
        idnumber: u.idnumber,
        role: u.role,
        status: u.status,
        approvalStatus: u.approvalStatus,
        inviteStatus: u.inviteStatus,
        createdAt: dayjs(u.created_at).format("YYYY-MM-DD"),
      }));
    }

    // Stats
    const stats = {
      total: users.length,
      active: users.filter((u) => u.status === "active").length,
      inactive: users.filter((u) => u.status === "inactive").length,
      approved: users.filter((u) => u.approvalStatus === "approved").length,
      pending: users.filter((u) => u.approvalStatus === "under_review").length,
    };

    // console.log("user mapper--->>", users, stats);

    res.json({
      success: true,
      stats,
      count: users.length,
      data: users,
    });
  } catch (error) {
    logger.error(`Get users by filters error: ${error.message}`);
    next(error);
  }
};

// getemail using token

const getEmailByToken = async (req, res, next) => {
  try {
    const token = req.params.token;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: "Token is required",
      });
    }

    const user = await User.findOne({ inviteToken: token });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Invalid or broken invitation link",
      });
    }

    if (user.inviteExpiry && user.inviteExpiry < Date.now()) {
      return res.status(400).json({
        success: false,
        message: "Invitation link has expired",
      });
    }
    return res.json({
      success: true,
      email: user.email,
    });
  } catch (error) {
    console.error("Error in getemail:", error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong",
      error: error.message,
    });
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
  getEmailByToken,
};
