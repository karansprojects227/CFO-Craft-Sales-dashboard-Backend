const twilio = require("twilio");

const client = twilio(process.env.TWILIO_SID, process.env.TWILIO_AUTH_TOKEN);

const sendSMS = async (phone, otp) => {
  return client.messages.create({
    to: phone, // e.g., +91xxxxxxxxxx
    from: process.env.TWILIO_NUMBER,
    body: `Your OTP is: ${otp}`,
  });
};

module.exports = sendSMS;

