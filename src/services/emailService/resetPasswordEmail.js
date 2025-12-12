const logger = require("../../utils/logger");
const sendEmail = require("../../config/emailConfig");

const sendPasswordResetEmail = async (userEmail, resetLink) => {
  try {
    logger.info(`Sending password reset email to ${userEmail}`);

    return await sendEmail({
      to: userEmail,
      subject: "Password Reset Request",
      text: `Click this link to reset your password: ${resetLink}`,
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
                        Password Reset Request
                      </h1>
                    </td>
                  </tr>
                  
                  <tr>
                    <td style="padding: 40px 30px;">
                      <p style="margin: 0 0 20px; color: #555555; font-size: 16px; line-height: 1.6;">
                        Click the button below to reset your password:
                      </p>
                      <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                        <tr>
                          <td align="center">
                            <a href="${resetLink}" style="display: inline-block; background-color: #117FE6; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-size: 16px; font-weight: 500;">
                              Reset Password
                            </a>
                          </td>
                        </tr>
                      </table>
                      <p style="margin: 20px 0 0; color: #888888; font-size: 14px;">
                        If you didn't request this, please ignore this email.
                      </p>
                    </td>
                  </tr>
                  
                  <tr>
                    <td style="background-color: #f9f9f9; padding: 25px 30px; text-align: center; border-top: 1px solid #eeeeee;">
                      <p style="margin: 0; color: #888888; font-size: 14px;">
                        Thank you!
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
    logger.error(`Failed to send password reset email to ${userEmail}:`, error);
    throw error;
  }
};

module.exports = {
  sendPasswordResetEmail,
};

// const logger = require("../../utils/logger");
// const sendEmail = require("../../config/emailConfig");

// const sendPasswordResetEmail = async (userEmail, resetLink) => {
//   try {
//     logger.info(`Sending password reset email to ${userEmail}`);
//     console.log(`Sending password reset email to ${userEmail}`);
//     return await sendEmail({
//       to: userEmail,
//       subject: "Password Reset Request",
//       text: `Click this link to reset your password: ${resetLink}`,
//       html: `
//         <h2>Password Reset Request</h2>
//         <p>Click the link below to reset your password:</p>
//         <a href="${resetLink}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
//           Reset Password
//         </a>
//         <p>If you didn't request this, please ignore this email.</p>
//       `,
//     });
//   } catch (error) {
//     logger.error(`Failed to send password reset email to ${userEmail}:`, error);
//     throw error;
//   }
// };

// module.exports = {
//   sendPasswordResetEmail,
// };
