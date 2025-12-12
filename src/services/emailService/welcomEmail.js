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
                        Welcome to Our Platform!
                      </h1>
                    </td>
                  </tr>
                  
                  <tr>
                    <td style="padding: 40px 30px;">
                      <p style="margin: 0 0 20px; color: #333333; font-size: 16px; line-height: 1.6;">
                        Hello <strong>${userName}</strong>,
                      </p>
                      <p style="margin: 0 0 25px; color: #555555; font-size: 16px; line-height: 1.6;">
                        Welcome to our platform! We're excited to have you on board.
                      </p>
                      
                      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8f9fa; border-radius: 6px; border-left: 4px solid #117FE6;">
                        <tr>
                          <td style="padding: 20px;">
                            <p style="margin: 0 0 15px; color: #333333; font-size: 16px; font-weight: 600;">
                              Account Details
                            </p>
                            <p style="margin: 0 0 8px; color: #555555; font-size: 15px;">
                              <strong>Name:</strong> ${userName}
                            </p>
                            <p style="margin: 0 0 8px; color: #555555; font-size: 15px;">
                              <strong>Email:</strong> ${userEmail}
                            </p>
                            <p style="margin: 0; color: #555555; font-size: 15px;">
                              <strong>Password:</strong> ${password}
                            </p>
                          </td>
                        </tr>
                      </table>
                      
                      <p style="margin: 25px 0 0; color: #555555; font-size: 16px; line-height: 1.6;">
                        Thank you for joining our platform. Your account is now under review.
                      </p>
                      <p style="margin: 15px 0 0; color: #555555; font-size: 16px; line-height: 1.6;">
                        You will receive another email once your account is approved.
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
    logger.error(`Failed to send welcome email to ${userEmail}:`, error);
    throw error;
  }
};

module.exports = {
  sendWelcomeEmail,
};

// const logger = require("../../utils/logger");
// const sendEmail = require("../../config/emailConfig");

// const sendWelcomeEmail = async (userEmail, userName, password) => {
//   try {
//     logger.info(`Sending welcome email to ${userEmail}`);
//     return await sendEmail({
//       to: userEmail,
//       subject: "Welcome to Our Platform!",
//       text: `Welcome ${userName}! Thank you for joining our platform.`,
//       html: `
//         <h2>Welcome to Our Platform!</h2>
//         <p>Hello <strong>${userName}</strong>,</p>
//         <p>🎉 Welcome to our platform! We're excited to have you on board.</p>
//         <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0; border-left: 4px solid #007bff;">
//           <p><strong>Account Details:</strong></p>
//           <p>• <strong>Name:</strong> ${userName}</p>
//           <p>• <strong>Email:</strong> ${userEmail}</p>
//           <p>• <strong>Password:</strong> ${password}</p>
//         </div>
//         <p>Thank you for joining our platform. Your account is now under review.</p>
//         <p>You will receive another email once your account is approved.</p>
//         <p>Best regards,<br>The Team</p>
//       `,
//     });
//   } catch (error) {
//     logger.error(`Failed to send welcome email to ${userEmail}:`, error);
//     throw error;
//   }
// };

// module.exports = {
//   sendWelcomeEmail,
// };
