const { Resend } = require("resend");
const logger = require("../utils/logger");
require("dotenv").config();

// Initialize Resend with API key
const resend = new Resend(process.env.RESEND_API_KEY);

const sendEmail = async (emailData) => {
  try {
    const { data, error } = await resend.emails.send({
      from: process.env.FROM_EMAIL || "onboarding@resend.dev",
      to: emailData.to,
      subject: emailData.subject,
      text: emailData.text,
      html: emailData.html,
    });

    if (error) {
      logger.error(`Email sending failed to ${emailData.to}:`, error);
      return {
        success: false,
        message: "Email failed to send",
        error: error.message,
      };
    }

    logger.info(`Email sent successfully to ${emailData.to}: ${data.id}`);
    return {
      success: true,
      message: "Email sent successfully",
      info: data.id,
    };
  } catch (error) {
    logger.error(`Email sending failed to ${emailData.to}:`, error);
    return {
      success: false,
      message: "Email failed to send",
      error: error.message,
    };
  }
};

module.exports = sendEmail;
