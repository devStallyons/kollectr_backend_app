const deviceModel = require("../models/deviceModel");

function generateRandomUsername(length = 10) {
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let username = "";
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    username += characters[randomIndex];
  }
  return username;
}

const generateUniqueCode = async () => {
  const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code;

  do {
    code = Array.from({ length: 4 }, () =>
      characters.charAt(Math.floor(Math.random() * characters.length))
    ).join("");
  } while (await deviceModel.exists({ code }));

  return code;
};

module.exports = {
  generateRandomUsername,
  generateUniqueCode,
};
