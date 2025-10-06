const sendEmail = require("../../config/emailConfig");
const logger = require("../../utils/logger");

const sendInviteEmail = async (
  userEmail,
  userName,
  inviterName,
  role,
  inviteLink
) => {
  try {
    logger.info(`Sending invitation email to ${userEmail} for role: ${role}`);

    return await sendEmail({
      to: userEmail,
      subject: "You're Invited to Join Our Platform",
      text: `Hello ${userName}, you've been invited by ${inviterName} to join our platform with the role of ${role}. Click this link to complete your registration: ${inviteLink}`,
      html: `
        <h2>You're Invited!</h2>
        <p>Hello <strong>${userName}</strong>,</p>
        <p>You've been invited by <strong>${inviterName}</strong> to join our platform with the role of <strong>${role}</strong>.</p>
        <p>Click the link below to complete your registration:</p>
        <a href="${inviteLink}" style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
          Accept Invitation
        </a>
        <p><strong>Important:</strong> This invitation expires in 24 hours.</p>
        <p>If you didn't expect this invitation, please ignore this email.</p>
        <hr style="margin: 20px 0;">
        <p>Best regards,<br>The Team</p>
      `,
    });
  } catch (error) {
    logger.error(`Failed to send invitation email to ${userEmail}:`, error);
    if (next) {
      return next(error);
    }
    throw error;
  }
};

module.exports = sendInviteEmail;
