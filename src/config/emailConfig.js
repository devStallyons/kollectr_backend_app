const logger = require("../utils/logger");
require("dotenv").config();

const MAILTRAP_API_TOKEN = process.env.MAILTRAP_API_TOKEN;
const INBOX_ID = process.env.MAILTRAP_TEST_INBOX_ID || 4250108;

const sendEmail = async (emailData) => {
  try {
    const url = `https://sandbox.api.mailtrap.io/api/send/${INBOX_ID}`;

    const payload = {
      from: {
        email: process.env.FROM_EMAIL || "test@example.com",
        name: process.env.FROM_NAME || "Kollectr",
      },
      to: [
        {
          email: emailData.to,
        },
      ],
      subject: emailData.subject,
      text: emailData.text,
      html: emailData.html,
      category: emailData.category || "Default",
    };

    // console.log("URL:", url);
    // console.log("Payload:", JSON.stringify(payload, null, 2));

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${MAILTRAP_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    // console.log("Response Status:", response.status);
    // console.log("Response Body:", JSON.stringify(data, null, 2));

    if (!response.ok) {
      throw new Error(JSON.stringify(data));
    }

    logger.info(`Email sent successfully to ${emailData.to}`);
    return {
      success: true,
      message: "Email sent successfully",
      info: data,
    };
  } catch (error) {
    logger.error(`Email sending failed to ${emailData.to}:`, error.message);
    return {
      success: false,
      message: "Email failed to send",
      error: error.message,
    };
  }
};

module.exports = sendEmail;
