const logger = require("../../utils/logger");
const sendEmail = require("../../config/emailConfig");

const sendWelcomeEmail = async (userEmail, userName, password) => {
  try {
    logger.info(`Sending welcome email to ${userEmail}`);
    return await sendEmail({
      to: userEmail,
      subject: "Welcome to Our Platform!",
      text: `Welcome ${userName}! Thank you for joining our platform.`,
      html: `
        <h2>Welcome to Our Platform!</h2>
        <p>Hello <strong>${userName}</strong>,</p>
        <p>🎉 Welcome to our platform! We're excited to have you on board.</p>
        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0; border-left: 4px solid #007bff;">
          <p><strong>Account Details:</strong></p>
          <p>• <strong>Name:</strong> ${userName}</p>
          <p>• <strong>Email:</strong> ${userEmail}</p>
          <p>• <strong>Password:</strong> ${password}</p>
        </div>
        <p>Thank you for joining our platform. Your account is now under review.</p>
        <p>You will receive another email once your account is approved.</p>
        <p>Best regards,<br>The Team</p>
      `,
    });
  } catch (error) {
    logger.error(`Failed to send welcome email to ${userEmail}:`, error);
    throw error;
  }
};

module.exports = {
  sendWelcomeEmail,
};
