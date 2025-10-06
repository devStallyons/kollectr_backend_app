const TransportRoute = require("../models/transportRouteModel");
const VehicleType = require("../models/vehicleTypeModel");

const getAllVehiclesAndRoutes = async (req, res) => {
  try {
    const routes = await TransportRoute.find({}, "_id code type").lean();
    const vehicleTypes = await VehicleType.find({}, "_id type").lean();

    res.status(200).json({
      success: true,
      data: {
        routes,
        vehicleTypes,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getAllVehiclesAndRoutes };
