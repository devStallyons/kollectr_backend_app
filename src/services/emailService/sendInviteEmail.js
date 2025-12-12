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
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
            <tr>
              <td align="center">
                <table width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
                  
                  <tr>
                    <td style="background-color: #117FE6; padding: 30px; text-align: center;">
                      <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">
                        You're Invited!
                      </h1>
                    </td>
                  </tr>
                  
                  <tr>
                    <td style="padding: 40px 30px;">
                      <p style="margin: 0 0 20px; color: #333333; font-size: 16px; line-height: 1.6;">
                        Hello <strong>${userName}</strong>,
                      </p>
                      <p style="margin: 0 0 25px; color: #555555; font-size: 16px; line-height: 1.6;">
                        You've been invited by <strong>${inviterName}</strong> to join our platform with the role of <strong>${role}</strong>.
                      </p>
                      
                      <p style="margin: 0 0 20px; color: #555555; font-size: 16px; line-height: 1.6;">
                        Click the button below to complete your registration:
                      </p>
                      
                      <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                        <tr>
                          <td align="center">
                            <a href="${inviteLink}" style="display: inline-block; background-color: #117FE6; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-size: 16px; font-weight: 500;">
                              Accept Invitation
                            </a>
                          </td>
                        </tr>
                      </table>
                      
                      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #fff8e6; border-radius: 6px; border-left: 4px solid #f59e0b;">
                        <tr>
                          <td style="padding: 15px 20px;">
                            <p style="margin: 0; color: #92400e; font-size: 14px;">
                              <strong>Important:</strong> This invitation expires in 24 hours.
                            </p>
                          </td>
                        </tr>
                      </table>
                      
                      <p style="margin: 25px 0 0; color: #888888; font-size: 14px;">
                        If you didn't expect this invitation, please ignore this email.
                      </p>
                    </td>
                  </tr>
                  
                  <tr>
                    <td style="background-color: #f9f9f9; padding: 25px 30px; text-align: center; border-top: 1px solid #eeeeee;">
                      <p style="margin: 0; color: #888888; font-size: 14px;">
                        Best regards,<br>The Team
                      </p>
                    </td>
                  </tr>
                  
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `,
    });
  } catch (error) {
    logger.error(`Failed to send invitation email to ${userEmail}:`, error);
    throw error;
  }
};

module.exports = sendInviteEmail;

// const sendEmail = require("../../config/emailConfig");
// const logger = require("../../utils/logger");

// const sendInviteEmail = async (
//   userEmail,
//   userName,
//   inviterName,
//   role,
//   inviteLink
// ) => {
//   try {
//     logger.info(`Sending invitation email to ${userEmail} for role: ${role}`);

//     return await sendEmail({
//       to: userEmail,
//       subject: "You're Invited to Join Our Platform",
//       text: `Hello ${userName}, you've been invited by ${inviterName} to join our platform with the role of ${role}. Click this link to complete your registration: ${inviteLink}`,
//       html: `
//         <h2>You're Invited!</h2>
//         <p>Hello <strong>${userName}</strong>,</p>
//         <p>You've been invited by <strong>${inviterName}</strong> to join our platform with the role of <strong>${role}</strong>.</p>
//         <p>Click the link below to complete your registration:</p>
//         <a href="${inviteLink}" style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
//           Accept Invitation
//         </a>
//         <p><strong>Important:</strong> This invitation expires in 24 hours.</p>
//         <p>If you didn't expect this invitation, please ignore this email.</p>
//         <hr style="margin: 20px 0;">
//         <p>Best regards,<br>The Team</p>
//       `,
//     });
//   } catch (error) {
//     logger.error(`Failed to send invitation email to ${userEmail}:`, error);
//     if (next) {
//       return next(error);
//     }
//     throw error;
//   }
// };

// module.exports = sendInviteEmail;
