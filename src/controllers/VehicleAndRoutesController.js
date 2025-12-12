const TransportRoute = require("../models/transportRouteModel");
const VehicleType = require("../models/vehicleTypeModel");

const getAllVehiclesAndRoutes = async (req, res) => {
  try {
    const { project_id } = req.query;

    // console.log("project_id", project_id);

    if (!project_id) {
      return;
      res.status(400).json({
        success: false,
        message: "Project ID is required",
      });
    }

    const routes = await TransportRoute.find(
      { project_id: project_id },
      "_id code type"
    ).lean();

    const vehicleTypes = await VehicleType.find(
      { project_id: project_id },
      "_id type"
    ).lean();

    res.status(200).json({
      success: true,
      data: {
        routes,
        vehicleTypes,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// const getAllVehiclesAndRoutes = async (req, res) => {
//   try {
//     const routes = await TransportRoute.find({}, "_id code type").lean();
//     const vehicleTypes = await VehicleType.find({}, "_id type").lean();

//     res.status(200).json({
//       success: true,
//       data: {
//         routes,
//         vehicleTypes,
//       },
//     });
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// };

module.exports = { getAllVehiclesAndRoutes };
