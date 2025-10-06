const User = require("../models/userModel");

const createDefaultAdmin = async () => {
  try {
    const admin = await User.findOne({ role: "superadmin" });

    if (admin) {
      // console.log("✅ Default admin user already exists");
      return;
    }

    // Create new admin
    const defaultAdmin = new User({
      name: "Default Admin",
      username: "admin_1",
      cellphone: "0000000000",
      email: "admin@gmail.com",
      idnumber: "admin001",
      projectcode: "ADMIN_PROJ",
      role: "superadmin",
      status: "active",
      approvalStatus: "approved",
      password: "Admin123", // Make sure to hash this in production
    });

    await defaultAdmin.save();
    console.log("✅ Default admin user created");
  } catch (error) {
    console.error("❌ Error creating/updating default admin:", error.message);
  }
};

module.exports = createDefaultAdmin;
