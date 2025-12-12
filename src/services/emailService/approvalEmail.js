const sendEmail = require("../../config/emailConfig");
const logger = require("../../utils/logger");

const sendApprovalEmail = async (userEmail, userName, status) => {
  try {
    const isApproved = status === "approved";

    const subject = isApproved ? "Account Approved" : "Account Status Update";
    const text = isApproved
      ? `Hello ${userName}, your account has been approved and is now active.`
      : `Hello ${userName}, your account status has been updated to: ${status}`;

    const html = `
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
                      ${
                        isApproved
                          ? "Account Approved!"
                          : "Account Status Update"
                      }
                    </h1>
                  </td>
                </tr>
                
                <tr>
                  <td style="padding: 40px 30px;">
                    <p style="margin: 0 0 20px; color: #333333; font-size: 16px; line-height: 1.6;">
                      Hello <strong>${userName}</strong>,
                    </p>
                    <p style="margin: 0 0 20px; color: #555555; font-size: 16px; line-height: 1.6;">
                      ${
                        isApproved
                          ? "Congratulations! Your account has been approved and is now active."
                          : `Your account status has been updated to: <strong>${status}</strong>`
                      }
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
    `;

    logger.info(`Sending approval email to ${userEmail} for status: ${status}`);
    return await sendEmail({ to: userEmail, subject, text, html });
  } catch (error) {
    logger.error(`Failed to send approval email to ${userEmail}:`, error);
    throw error;
  }
};

module.exports = {
  sendApprovalEmail,
};

// const sendEmail = require("../../config/emailConfig");
// const logger = require("../../utils/logger");

// const sendApprovalEmail = async (userEmail, userName, status) => {
//   try {
//     const subject =
//       status === "approved" ? "Account Approved" : "Account Status Update";
//     const text =
//       status === "approved"
//         ? `Hello ${userName}, your account has been approved and is now active.`
//         : `Hello ${userName}, your account status has been updated to: ${status}`;

//     const html = `
//       <h2>Account Status Update</h2>
//       <p>Hello <strong>${userName}</strong>,</p>
//       <p>${
//         status === "approved"
//           ? "Congratulations! Your account has been approved and is now active."
//           : `Your account status has been updated to: <strong>${status}</strong>`
//       }</p>
//       <p>Thank you!</p>
//     `;

//     logger.info(`Sending approval email to ${userEmail} for status: ${status}`);
//     return await sendEmail({
//       to: userEmail,
//       subject: subject,
//       text: text,
//       html: html,
//     });
//   } catch (error) {
//     logger.error(`Failed to send approval email to ${userEmail}:`, error);
//     throw error;
//   }
// };

// module.exports = {
//   sendApprovalEmail,
// };
