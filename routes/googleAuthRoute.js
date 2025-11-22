const express = require("express");
const passport = require("passport");
const router = express.Router();
const generateOTP = require("../config/generateOTP");
const transporter = require("../config/mail");
const redisClient = require("../config/redis");
const User = require("../models/user");
const jwt = require("jsonwebtoken");

router.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

router.get(
  "/api/auth/google/callback",
  passport.authenticate("google", {
    failureRedirect: `${process.env.FRONTEND_URL}/auth/login?error=GoogleAuthFailed`,
  }),
  async (req, res) => {
    try {
      const googleUser = req.user;

      // Clear old OTP/temp data
      await redisClient.del(`reg:${googleUser.email}`);
      await redisClient.del(`otp:${googleUser.email}`);

      // Check if user already exists in MongoDB
      const existingUser = await User.findOne({ email: googleUser.email });

      // Generate token
      const token = jwt.sign({ email: googleUser.email }, process.env.JWT_SECRET, {
        expiresIn: "7d"
      });

      // store email in cookies
      res.cookie("email_for_verification", token , {
        httpOnly: true,     // cannot be accessed by JS
        secure: false,      // true only on https
        sameSite: "lax"
      })

      if (existingUser) {
        // User exists → Still OTP required for login
        const otp = generateOTP();

        await redisClient.set(`reg:${googleUser.email}`, JSON.stringify(googleUser), "EX", 600);
        await redisClient.set(`otp:${googleUser.email}`, otp, "EX", 300);

        await transporter.sendMail({
          from: '"CFO Sales Dashboard" <info@cfocraft.com>',
          to: googleUser.email,
          subject: "🔐 Your Secure OTP Code",
          html: `
          <div style="
              font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
              max-width: 520px;
              margin: auto;
              border-radius: 14px;
              border: 1px solid #1f1f1f;
              background: #0d0d0d;
              padding: 32px;
              color: white;
            ">

            <!-- Logo -->
            <div style="text-align: center; margin-bottom: 20px;">
              <img 
                src="https://cfocraft.com/wp-content/uploads/2023/04/WhatsApp-Image-2024-06-17-at-5.12.35-PM-1-e1723554014801.jpeg"
                alt="CFO CRAFT Logo"
                style="width: 70px; border-radius: 12px; object-fit: cover;"
              />
              <h1 style="font-size: 26px; letter-spacing: 1px; color: #4c8dff; margin: 10px 0 0;">
                CFO CRAFT
              </h1>
              <p style="margin: 4px 0; color: #9aa0a6; font-size: 13px;">
                Secure Verification System
              </p>
            </div>

            <!-- Main Box -->
            <div style="
              background: #111;
              padding: 28px;
              border-radius: 12px;
              border: 1px solid #222;
            ">

              <h2 style="margin: 0 0 18px 0; font-size: 22px; font-weight: 600;">
                Your One-Time Password
              </h2>

              <p style="color: #c7c7c7; font-size: 15px; line-height: 1.6;">
                Use the OTP below to complete your verification.  
                This code is valid for <b>5 minutes</b>.
              </p>

              <div style="
                margin: 28px 0;
                background: #0a0f27;
                padding: 16px;
                border-radius: 10px;
                text-align: center;
                border: 1px solid #1d2b53;
              ">
                <span style="
                  font-size: 36px;
                  font-weight: bold;
                  letter-spacing: 6px;
                  color: #4c8dff;
                ">
                  ${otp}
                </span>
              </div>

              <p style="color: #8f949c; font-size: 13px; line-height: 1.5;">
                If you did not request this, please ignore this email.
              </p>

            </div>

            <!-- Footer -->
            <div style="text-align: center; margin-top: 25px; color: #6f6f6f; font-size: 12px;">
              © ${new Date().getFullYear()} CFO CRAFT • All Rights Reserved  
            </div>

          </div>
          `
        });

        return res.redirect(
          `${process.env.FRONTEND_URL}/auth/verify-otp`
        );
      }

      // New Google user → OTP for registration
      const otp = generateOTP();

      // Store Google OAuth data for later registration
      await redisClient.set(
        `reg:${googleUser.email}`,
        JSON.stringify(googleUser),
        "EX",
        600
      );

      // Store OTP
      await redisClient.set(`otp:${googleUser.email}`, otp, "EX", 300);

      // Email OTP
      await transporter.sendMail({
          from: '"CFO Sales Dashboard" <info@cfocraft.com>',
          to: googleUser.email,
          subject: "🔐 Your Secure OTP Code",
          html: `
          <div style="
              font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
              max-width: 520px;
              margin: auto;
              border-radius: 14px;
              border: 1px solid #1f1f1f;
              background: #0d0d0d;
              padding: 32px;
              color: white;
            ">

            <!-- Logo -->
            <div style="text-align: center; margin-bottom: 20px;">
              <img 
                src="https://cfocraft.com/wp-content/uploads/2023/04/WhatsApp-Image-2024-06-17-at-5.12.35-PM-1-e1723554014801.jpeg"
                alt="CFO CRAFT Logo"
                style="width: 70px; border-radius: 12px; object-fit: cover;"
              />
              <h1 style="font-size: 26px; letter-spacing: 1px; color: #4c8dff; margin: 10px 0 0;">
                CFO CRAFT
              </h1>
              <p style="margin: 4px 0; color: #9aa0a6; font-size: 13px;">
                Secure Verification System
              </p>
            </div>

            <!-- Main Box -->
            <div style="
              background: #111;
              padding: 28px;
              border-radius: 12px;
              border: 1px solid #222;
            ">

              <h2 style="margin: 0 0 18px 0; font-size: 22px; font-weight: 600;">
                Your One-Time Password
              </h2>

              <p style="color: #c7c7c7; font-size: 15px; line-height: 1.6;">
                Use the OTP below to complete your verification.  
                This code is valid for <b>5 minutes</b>.
              </p>

              <div style="
                margin: 28px 0;
                background: #0a0f27;
                padding: 16px;
                border-radius: 10px;
                text-align: center;
                border: 1px solid #1d2b53;
              ">
                <span style="
                  font-size: 36px;
                  font-weight: bold;
                  letter-spacing: 6px;
                  color: #4c8dff;
                ">
                  ${otp}
                </span>
              </div>

              <p style="color: #8f949c; font-size: 13px; line-height: 1.5;">
                If you did not request this, please ignore this email.
              </p>

            </div>

            <!-- Footer -->
            <div style="text-align: center; margin-top: 25px; color: #6f6f6f; font-size: 12px;">
              © ${new Date().getFullYear()} CFO CRAFT • All Rights Reserved  
            </div>

          </div>
          `
        });

      // Redirect to OTP page
      return res.redirect(
        `${process.env.FRONTEND_URL}/auth/verify-otp`
      );

    } catch (err) {
      console.error("❌ GOOGLE CALLBACK ERROR:", err);
      return res.redirect(`${process.env.FRONTEND_URL}/auth/login?error=ServerError`);
    }
  }
);

module.exports = router;
