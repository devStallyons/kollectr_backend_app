const sendEmail = require("../../config/emailConfig");
const logger = require("../../utils/logger");

const sendAcceptanceConfirmationEmail = async (
  userEmail,
  userName,
  userRole,
  projectCode,
  approvalStatus
) => {
  try {
    logger.info(`Sending acceptance confirmation email to ${userEmail}`);

    const statusMessage =
      approvalStatus === "approved"
        ? "Approved and ready to use"
        : "Under review by admin";

    return await sendEmail({
      to: userEmail,
      subject: "Welcome! Your Account is Active",
      text: `Welcome ${userName}! Your account has been activated with the role of ${userRole}.`,
      html: `
        <h2>Welcome to Our Platform!</h2>
        <p>Hello <strong>${userName}</strong>,</p>
        <p>🎉 Your account has been successfully activated!</p>
        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0; border-left: 4px solid #007bff;">
          <p><strong>Account Details:</strong></p>
          <p>• <strong>Name:</strong> ${userName}</p>
          <p>• <strong>Role:</strong> ${userRole}</p>
          <p>• <strong>Project Code:</strong> ${projectCode}</p>
          <p>• <strong>Status:</strong> ${statusMessage}</p>
        </div>
        ${
          approvalStatus === "approved"
            ? `<p style="color: #28a745;">✅ Your account is fully approved and ready to use!</p>`
            : `<p style="color: #ffc107;">⏳ Your account is under admin review and will be activated soon.</p>`
        }
        <p>You can now log in to your account using your credentials.</p>
        <hr style="margin: 20px 0;">
        <p>Best regards,<br>The Team</p>
      `,
    });
  } catch (error) {
    logger.error(
      `Failed to send acceptance confirmation email to ${userEmail}:`,
      error
    );
    if (next) {
      return next(error);
    }
    throw error;
  }
};

module.exports = sendAcceptanceConfirmationEmail;
