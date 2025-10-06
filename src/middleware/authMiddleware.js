const jwt = require("jsonwebtoken");
const User = require("../models/userModel");

const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      token = req.headers.authorization.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Optional: fetch full user details (minus password)
      const user = await User.findById(decoded.id).select("-password");

      if (!user) {
        res.status(401);
        return next(new Error("User not found"));
      }

      // Attach to req.user
      req.user = {
        id: user._id,
        role: user.role,
        name: user.name,
        email: user.email,
        status: user.status,
        approvalStatus: user.approvalStatus,
      };

      return next();
    } catch (error) {
      res.status(401);
      return next(new Error("Not authorized, token failed"));
    }
  }

  res.status(401);
  return next(new Error("Not authorized, please login"));
};
// const protect = async (req, res, next) => {
//   let token;

//   if (
//     req.headers.authorization &&
//     req.headers.authorization.startsWith("Bearer")
//   ) {
//     try {
//       //   console.log("toekn----->>", req.headers.authorization);
//       token = req.headers.authorization.split(" ")[1];

//       const decoded = jwt.verify(token, process.env.JWT_SECRET);
//       req.user = await User.findById(decoded.id).select("-password");

//       next();
//     } catch (error) {
//       res.status(401);
//       return next(new Error("Not authorized, token failed"));
//     }
//   }

//   if (!token) {
//     res.status(401);
//     return next(new Error("Not authorized, Please login"));
//   }
// };

const adminOnly = (req, res, next) => {
  console.log("checking user", req.user);

  if (req.user && req.user.role === "admin") {
    next();
  } else {
    res.status(403);
    return next(new Error("Admin access required"));
  }
};

const roleCheck = (allowedRoles) => {
  return (req, res, next) => {
    const userRole = req.user?.role;

    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({
        message: `Access denied. Your role (${userRole}) is not authorized. Required: [${allowedRoles.join(
          ", "
        )}]`,
      });
    }
    next();
  };
};

module.exports = { protect, adminOnly, roleCheck };
