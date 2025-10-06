const generatePassword = (len = 12) =>
  [...Array(len)]
    .map(
      () =>
        "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+[]{}"[
          Math.floor(Math.random() * 84)
        ]
    )
    .join("");

module.exports = generatePassword;
