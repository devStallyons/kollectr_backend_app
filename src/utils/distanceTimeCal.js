require("dotenv").config();

function parseDuration(durationStr) {
  const match = durationStr.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
  const hours = parseInt(match[1]) || 0;
  const minutes = parseInt(match[2]) || 0;
  const seconds = parseInt(match[3]) || 0;
  return hours * 3600 + minutes * 60 + seconds;
}

async function getGoogleRoute(lat1, lon1, lat2, lon2, mode = "DRIVE") {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    throw new Error("Missing Google Maps API key");
  }

  const url = `https://routes.googleapis.com/directions/v2:computeRoutes`;

  const body = {
    origin: {
      location: {
        latLng: { latitude: lat1, longitude: lon1 },
      },
    },
    destination: {
      location: {
        latLng: { latitude: lat2, longitude: lon2 },
      },
    },
    travelMode: mode.toUpperCase(), // "DRIVE", "WALK", "BICYCLE"
    computeTravelTime: true,
  };

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": "routes.duration,routes.distanceMeters",
    },
    body: JSON.stringify(body),
  });

  const data = await response.json();

  console.log(data);

  if (!data.routes || !data.routes[0]) {
    console.error("Routes API response:", data);
    throw new Error("Invalid Routes API response");
  }

  const route = data.routes[0];
  const distance = (route.distanceMeters / 1000).toFixed(2); // km
  const duration = (parseDuration(route.duration) / 60).toFixed(2); // minutes

  const straightLine = haversineDistance(lat1, lon1, lat2, lon2); // in km
  const offsetMeters = (distance - straightLine) * 1000;
  const gpsAccuracy = `±${offsetMeters.toFixed(3)}m`;

  return {
    distance,
    duration,
    gpsAccuracy,
  };
}

// async function getGraphHopperRoute(lat1, lon1, lat2, lon2, vehicle = "car") {
//   console.log(
//     `lat1: ${lat1}, lon1: ${lon1}, lat2: ${lat2}, lon2: ${lon2}, vehicle: ${vehicle}`
//   );

//   try {
//     const url = `https://graphhopper.com/api/1/matrix?point=${lat1},${lon1}&point=${lat2},${lon2}&type=json&profile=${vehicle}&out_array=times&out_array=distances&key=${process.env.GRAPH_HOPPER_MAP_API}`;

//     const response = await fetch(url);
//     const data = await response.json();

//     if (
//       data.distances &&
//       data.times &&
//       data.distances[0] &&
//       data.distances[0][1] != null &&
//       data.times[0][1] != null
//     ) {
//       const distance = (data.distances[0][1] / 1000).toFixed(2); // meters to kilometers
//       const duration = (data.times[0][1] / 60000).toFixed(2); // milliseconds to minutes

//       const straightLine = haversineDistance(lat1, lon1, lat2, lon2); // in km
//       const offsetMeters = (distance - straightLine) * 1000;
//       const gpsAccuracy = `±${offsetMeters.toFixed(3)}m`;

//       return {
//         distance,
//         duration,
//         gpsAccuracy,
//       };
//     }
//     // else {
//     //   throw new Error("Invalid matrix response data");
//     // }
//   } catch (error) {
//     throw new Error(`GraphHopper API Error: ${error}`);
//   }
// }

// Helper function
function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const toRad = (angle) => (angle * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

const haversineDistanceCord = (coord1, coord2) => {
  const toRad = (x) => (x * Math.PI) / 180;
  const [lon1, lat1] = coord1;
  const [lon2, lat2] = coord2;

  const R = 6371; // Radius of Earth in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

module.exports = {
  getGoogleRoute,
  // getGraphHopperRoute,
  haversineDistanceCord,
  haversineDistance,
};
