const tripModel = require("../models/tripModel");

const haversineDistance = (coord1, coord2) => {
  const toRad = (x) => (x * Math.PI) / 180;

  const [lon1, lat1] = coord1;
  const [lon2, lat2] = coord2;

  const R = 6371000; // meters

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
};

const determineDirection = async (tripId, newStopCoordinates) => {
  try {
    const trip = await tripModel.findById(tripId).populate({
      path: "route",
      populate: [
        { path: "forwardStops", model: "TransportStop" },
        { path: "reverseStops", model: "TransportStop" },
      ],
    });

    if (!trip || !trip.route) {
      console.log("Trip or route not found");
      return null;
    }

    const route = trip.route;

    const firstForwardStop = route.forwardStops?.[0];
    const firstReverseStop = route.reverseStops?.[0];

    let forwardDistance = Infinity;
    let reverseDistance = Infinity;

    // Get forward stop coordinates
    if (firstForwardStop?.location?.coordinates) {
      forwardDistance = haversineDistance(
        newStopCoordinates,
        firstForwardStop.location.coordinates
      );
    }

    // Get reverse stop coordinates
    if (firstReverseStop?.location?.coordinates) {
      reverseDistance = haversineDistance(
        newStopCoordinates,
        firstReverseStop.location.coordinates
      );
    }

    // console.log("=== Direction Detection ===");
    // console.log("New Stop Coordinates:", newStopCoordinates);
    // console.log("Forward First Stop:", firstForwardStop?.location?.coordinates);
    // console.log("Reverse First Stop:", firstReverseStop?.location?.coordinates);
    // console.log("Forward Distance:", forwardDistance.toFixed(2), "meters");
    // console.log("Reverse Distance:", reverseDistance.toFixed(2), "meters");

    // Threshold 100 meters
    const THRESHOLD = 100;

    if (forwardDistance <= THRESHOLD && forwardDistance <= reverseDistance) {
      console.log("Direction: F (Forward)");
      return "F";
    } else if (reverseDistance <= THRESHOLD) {
      console.log("Direction: R (Reverse)");
      return "R";
    } else if (forwardDistance < reverseDistance) {
      console.log("Direction: F (Closer to Forward)");
      return "F";
    } else {
      console.log("Direction: R (Closer to Reverse)");
      return "R";
    }
  } catch (error) {
    console.error("Error determining direction:", error);
    return null;
  }
};

module.exports = { determineDirection, haversineDistance };
