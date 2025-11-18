const logger = require("../../utils/logger");
const sendEmail = require("../../config/emailConfig");

const sendPasswordResetEmail = async (userEmail, resetLink) => {
  try {
    logger.info(`Sending password reset email to ${userEmail}`);
    console.log(`Sending password reset email to ${userEmail}`);
    return await sendEmail({
      to: userEmail,
      subject: "Password Reset Request",
      text: `Click this link to reset your password: ${resetLink}`,
      html: `
        <h2>Password Reset Request</h2>
        <p>Click the link below to reset your password:</p>
        <a href="${resetLink}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
          Reset Password
        </a>
        <p>If you didn't request this, please ignore this email.</p>
      `,
    });
  } catch (error) {
    logger.error(`Failed to send password reset email to ${userEmail}:`, error);
    throw error;
  }
};

module.exports = {
  sendPasswordResetEmail,
};
