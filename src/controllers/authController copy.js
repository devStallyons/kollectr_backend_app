// const User = require("../models/userModel");
// const generateToken = require("../utils/generateToken");

// // Admin creates user (only admin route)
// const createUser = async (req, res, next) => {
//   const { name, cellphone, idnumber, projectcode, role, password } = req.body;

//   console.log(req.body);

//   try {
//     const userExists = await User.findOne({ idnumber });
//     if (userExists) {
//       res.status(400);
//       return next(new Error("User with this ID number already exists"));
//     }

//     const user = await User.create({
//       name,
//       cellphone,
//       idnumber,
//       projectcode,
//     });

//     res.status(201).json({
//       success: true,
//       user: {
//         id: user._id,
//         name: user.name,
//         role: user.role,
//         projectcode: user.projectcode,
//         idnumber: user.idnumber,
//         cellphone: user.cellphone,
//         timestamp: user.timestamp,
//       },
//       token: generateToken(user._id),
//     });
//   } catch (error) {
//     next(error);
//   }
// };

// const loginAdmin = async (req, res, next) => {
//   const { email, password } = req.body;

//   try {
//     if (!email || !password) {
//       res.status(400);
//       return next(new Error("Email and password are required"));
//     }

//     const user = await User.findOne({ email });

//     if (user && user.role === "admin" && (await user.matchPassword(password))) {
//       return res.json({
//         success: true,
//         user: {
//           id: user._id,
//           name: user.name,
//           role: user.role,
//           projectcode: user.projectcode,
//           idnumber: user.idnumber,
//           cellphone: user.cellphone,
//           timestamp: user.timestamp,
//         },
//         token: generateToken(user._id),
//       });
//     } else {
//       res.status(401);
//       return next(new Error("Invalid admin credentials"));
//     }
//   } catch (error) {
//     next(error);
//   }
// };

// const loginUser = async (req, res, next) => {
//   const { idnumber, projectcode } = req.body;

//   try {
//     if (!idnumber || !projectcode) {
//       res.status(400);
//       return next(new Error("ID number and project code are required"));
//     }

//     const user = await User.findOne({ idnumber });

//     if (user && user.role === "user" && user.projectcode === projectcode) {
//       return res.json({
//         success: true,
//         user: {
//           id: user._id,
//           name: user.name,
//           role: user.role,
//           projectcode: user.projectcode,
//           idnumber: user.idnumber,
//           cellphone: user.cellphone,
//           timestamp: user.timestamp,
//         },
//         token: generateToken(user._id),
//       });
//     } else {
//       res.status(401);
//       return next(new Error("Invalid user credentials"));
//     }
//   } catch (error) {
//     next(error);
//   }
// };

// module.exports = { createUser, loginUser, loginAdmin };
