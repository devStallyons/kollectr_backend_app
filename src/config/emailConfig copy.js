const nodemailer = require("nodemailer");
const logger = require("../utils/logger");
require("dotenv").config();

const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: Number(process.env.EMAIL_PORT),
    secure: process.env.EMAIL_SECURE === "true",
    auth: {
      user: process.env.EMAIL_USERNAME,
      pass: process.env.EMAIL_PASSWORD,
    },
  });
};

const sendEmail = async (emailData) => {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: process.env.FROM_EMAIL || emailData?.from,
      to: emailData.to,
      subject: emailData.subject,
      text: emailData.text,
      html: emailData.html,
    };

    const info = await transporter.sendMail(mailOptions);

    logger.info(`Email sent successfully to ${emailData.to}: ${info.response}`);
    return {
      success: true,
      message: "Email sent successfully",
      info: info.response,
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
