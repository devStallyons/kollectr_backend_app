const sendEmail = require("../../config/emailConfig");
const logger = require("../../utils/logger");

const sendApprovalEmail = async (userEmail, userName, status) => {
  try {
    const subject =
      status === "approved" ? "Account Approved" : "Account Status Update";
    const text =
      status === "approved"
        ? `Hello ${userName}, your account has been approved and is now active.`
        : `Hello ${userName}, your account status has been updated to: ${status}`;

    const html = `
      <h2>Account Status Update</h2>
      <p>Hello <strong>${userName}</strong>,</p>
      <p>${
        status === "approved"
          ? "Congratulations! Your account has been approved and is now active."
          : `Your account status has been updated to: <strong>${status}</strong>`
      }</p>
      <p>Thank you!</p>
    `;

    logger.info(`Sending approval email to ${userEmail} for status: ${status}`);
    return await sendEmail({
      to: userEmail,
      subject: subject,
      text: text,
      html: html,
    });
  } catch (error) {
    logger.error(`Failed to send approval email to ${userEmail}:`, error);
    throw error;
  }
};

module.exports = {
  sendApprovalEmail,
};
