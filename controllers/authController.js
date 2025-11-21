const User = require("../models/user");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const transporter = require("../config/mail");
const generateOTP = require("../config/generateOTP");
const formatName = require("../config/formatName");
const redisClient = require("../config/redis");

const passwordValidation = (password) => {
  const errors = [];
  if (password.length < 8) errors.push("Minimum 8 characters required");
  if (!/[A-Z]/.test(password)) errors.push("At least 1 uppercase letter required");
  if (!/[a-z]/.test(password)) errors.push("At least 1 lowercase letter required");
  if (!/[0-9]/.test(password)) errors.push("At least 1 number required");
  if (!/[!@#$%^&*]/.test(password)) errors.push("At least 1 special character (!@#$%^&*) required");
  return errors;
};

// ------------------------------------
// 🔐 REGISTER (STEP 1 → Send OTP)
// ------------------------------------
const register = async (req, res) => {
  try {
    let { name, email, password, phone } = req.body;

    // Capitalize name
    name = formatName(name);

    // Validate
    if (!name || !email || !password || !phone)
      return res.status(400).json({ message: "All fields are required!" });

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email))
      return res.status(400).json({ message: "Invalid email format!" });

    // Validate password
    const errors = passwordValidation(password);
    if (errors.length > 0) {
      // line by line errors array bhej rahe hain
      return res.status(400).json({ errors });
    }

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser)
      return res.status(400).json({ message: "User already exists. Please login!" });

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Generate OTP
    const otp = generateOTP();

    // Save temp registration data
    await redisClient.set(`reg:${email}`, JSON.stringify({
      name,
      email,
      password: hashedPassword,
      phone
    }), "EX", 600);

    // Save OTP separately
    await redisClient.set(`otp:${email}`, otp, "EX", 300); // 5 min

    // Send email
    await transporter.sendMail({
      from: '"CFO Sales Dashboard" <info@cfocraft.com>',
      to:email,
      subject: "🔐 Your Register Secure OTP Code",
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

    return res.status(200).json({ message: "Registration OTP sent!" });

  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// ------------------------------------
// 🔐 REGISTER STEP 2 — VERIFY OTP
// ------------------------------------
const verifyRegisterOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    // Validate input empty
    if (!otp) {
      return res.status(400).json({ message: "OTP are required!" });
    }

    // Validate input 6 digit or not
    if (!/^\d{6}$/.test(otp)) {
      return res.status(400).json({ message: "OTP must be 6 digits!" });
    }

    const savedOtp = await redisClient.get(`otp:${email}`);
    if (!savedOtp) return res.status(400).json({ message: "OTP expired!" });
    if (savedOtp !== otp) return res.status(400).json({ message: "Invalid OTP!" });

    // Get user data from redis
    const userDataJson = await redisClient.get(`reg:${email}`);
    if (!userDataJson)
      return res.status(400).json({ message: "Registration expired!" });

    const userData = JSON.parse(userDataJson);

    // Create user
    const user = await User.create(userData);

    // Delete redis keys
    await redisClient.del(`otp:${email}`);
    await redisClient.del(`reg:${email}`);

    // Generate token
    // const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
    //   expiresIn: "7d"
    // });

    // // Save token in cookie
    // res.cookie("token", token, {
    //   httpOnly: true,
    //   secure: false,
    //   sameSite: "lax"
    // });

    return res.status(201).json({
      message: "Registered Successfull!",
      userId: user._id
    });

  } catch (err) {
    console.error("Verify Register OTP Error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// ------------------------------------
// 🟦 LOGIN STEP 1 — Email Check
// ------------------------------------
const login = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email)
      return res.status(400).json({ message: "Email is required!" });

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email))
      return res.status(400).json({ message: "Invalid email format!" });

    const user = await User.findOne({ email }).select("+password");

    if (!user)
      return res.status(404).json({ message: "User not found. Please register!" });

    // If password exists → user must login via password
    if (user.password && user.password !== "") {
      return res.status(200).json({
        requiresPassword: true,
        message: "Enter your password!"
      });
    }

    // If NO password → send login OTP (Google user)
    const otp = generateOTP();

    await redisClient.set(`otp:${email}`, otp, "EX", 300);

    await transporter.sendMail({
      from: '"CFO Sales Dashboard" <info@cfocraft.com>',
      to:email,
      subject: "🔐 Your Login Secure OTP Code",
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

    return res.status(200).json({
      requiresOtp: true,
      message: "Login OTP sent!"
    });

  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// ------------------------------------
// 🟩 LOGIN STEP 2 — Verify OTP
// ------------------------------------
const verifyLoginOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    // Validate input empty
    if (!otp) {
      return res.status(400).json({ message: "OTP are required!" });
    }

    // Validate input 6 digit or not
    if (!/^\d{6}$/.test(otp)) {
      return res.status(400).json({ message: "OTP must be 6 digits!" });
    }

    const savedOtp = await redisClient.get(`otp:${email}`);
    if (!savedOtp) return res.status(400).json({ message: "OTP expired!" });
    if (savedOtp !== otp) return res.status(400).json({ message: "Invalid OTP!" });

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found!" });

    // Delete OTP
    await redisClient.del(`otp:${email}`);

    // Generate token
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "7d"
    });

    res.cookie("token", token, {
      httpOnly: true,
      secure: false,
      sameSite: "lax"
    });

    return res.status(200).json({
      message: "Login successful!",
      userId: user._id
    });

  } catch (error) {
    console.error("Verify Login OTP Error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// ------------------------------------
// 🔑 CHECK PASSWORD AND LOGIN
// ------------------------------------
const checkPass = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!password)
      return res.status(400).json({ message: "Password required!" });

    const user = await User.findOne({ email }).select("+password");
    if (!user)
      return res.status(404).json({ message: "User not found!" });

    if (!user.password)
      return res.status(400).json({ message: "Use OTP login for this account" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(400).json({ message: "Incorrect password!" });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "1d"
    });

    res.cookie("token", token, {
      httpOnly: true,
      secure: false,
      sameSite: "lax"
    });

    return res.status(200).json({
      message: "Password login successful!",
      userId: user._id
    });

  } catch (err) {
    console.error("CheckPass Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ------------------------------------
// 🚪 LOGOUT
// ------------------------------------
const logout = (req, res) => {
  res.clearCookie("token");
  res.json({ message: "Logged out successfully" });
};

// ------------------------------------
// 📧 FORGOT PASSWORD (with Nodemailer)
// ------------------------------------
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    
    const user = await User.findOne({ email });

    if (!user)
      return res.status(404).json({ error: "User with this email not found" });

    // Create a simple reset link (you can later make it token-based)
    const resetLink = `${process.env.FRONTEND_URL}/auth/reset-password/${user._id}`;

    // generate otp
    const otp = generateOTP();

    // save otp separately
    await redisClient.set(`otp:${email}`, otp, "EX", 300);

    // 🔹 Mail options
    const mailOptions = ({
      user,
      resetLink,
      otp = null,
      subject = "🔐 Secure Password Reset",
    }) => ({
      from: '"CFO Sales Dashboard" <info@cfocraft.com>',
      to: user.email,
      subject: subject,
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
    
          <!-- Logo + Header -->
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
    
          <!-- Main Content -->
          <div style="
            background: #111;
            padding: 28px;
            border-radius: 12px;
            border: 1px solid #222;
          ">
    
            <h2 style="margin: 0 0 18px 0; font-size: 22px; font-weight: 600;">
              Password Reset Request
            </h2>
    
            <p style="color: #c7c7c7; font-size: 15px; line-height: 1.6;">
              Hi <b>${user.name}</b>,  
              We received a request to reset your password.  
              Use the secure button below to reset it:
            </p>
    
            <!-- Reset Button -->
            <div style="text-align:center; margin: 28px 0;">
              <a href="${resetLink}" 
                style="
                  background: #4c8dff;
                  color: white;
                  padding: 12px 22px;
                  text-decoration: none;
                  border-radius: 8px;
                  font-size: 16px;
                  font-weight: 600;
                  display: inline-block;
                ">
                Reset Password
              </a>
            </div>
    
            <!-- Show OTP only if provided -->
            ${
              otp
                ? `
              <div style="
                margin: 28px 0;
                background: #0a0f27;
                padding: 16px;
                border-radius: 10px;
                text-align: center;
                border: 1px solid #1d2b53;
              ">
                <span style="
                  font-size: 32px;
                  font-weight: bold;
                  letter-spacing: 6px;
                  color: #4c8dff;
                ">
                  ${otp}
                </span>
                <p style="color:#9aa0a6; font-size:13px; margin-top:10px;">
                  This OTP is valid for <b>5 minutes</b>.
                </p>
              </div>
            `
                : ""
            }
          
            <p style="color: #8f949c; font-size: 13px; line-height: 1.5;">
              If you did not request a password reset, safely ignore this email.
            </p>
          
          </div>
          
          <!-- Footer -->
          <div style="text-align: center; margin-top: 25px; color: #6f6f6f; font-size: 12px;">
            © ${new Date().getFullYear()} CFO CRAFT • All Rights Reserved  
          </div>
        </div>
      `,
    });

    // 🔹 Send mail
    await transporter.sendMail(
      mailOptions({
        user,
        resetLink: resetLink,
        otp: otp,             // <- extra field
        subject: "🔐 Reset Your Password (OTP + Link)"
      })
    );

    res.json({message: `Reset link sent to your ${email}.`});
  } catch (err) {
    console.error("Forgot Password Error:", err);
    res.status(500).json({ error: "Server error" });
  }
};

// ------------------------------------
// 🔁 RESET PASSWORD
// ------------------------------------
const resetPasswordVerifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    // Validate input empty
    if (!otp) {
      return res.status(400).json({ message: "OTP are required!" });
    }

    // Validate input 6 digit or not
    if (!/^\d{6}$/.test(otp)) {
      return res.status(400).json({ message: "OTP must be 6 digits!" });
    }

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ error: "User not found" });

    const savedOtp = await redisClient.get(`otp:${email}`);
    if (!savedOtp) return res.status(400).json({ message: "OTP expired!" });
    if (savedOtp !== otp) return res.status(400).json({ message: "Invalid OTP!" });

    res.json({ 
      message: "Password Reset OTP Verified!",
      userId: user._id,
     });
    
  } catch (err) {
    console.error("Verify Password Reset OTP Error:", err);
    res.status(500).json({ error: "Server error" });
  }
};

// ------------------------------------
// 🔁 RESET PASSWORD
// ------------------------------------
const resetPassword = async (req, res) => {
  try {
    const { userId } = req.params;
    const { password, confirmPassword } = req.body;

    if (password !== confirmPassword) {
      res.status(404).json({ error: "Passwords do not match!" });
      return;
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    // Validate password
    const errors = passwordValidation(password);
    if (errors.length > 0) {
      // line by line errors array bhej rahe hain
      return res.status(400).json({ errors });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    user.password = hashedPassword;
    await user.save();

    res.json({ message: "Password reset successful!" });
  } catch (err) {
    console.error("Reset Password Error:", err);
    res.status(500).json({ error: "Server error" });
  }
};

// ------------------------------------
// 🔁 SEND OTP
// ------------------------------------
const sendOtp = async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) return res.status(400).json({ message: "Email is required!" });

    const otp = generateOTP();
    await redisClient.set(`otp:${email}`, otp, "EX", 300); // ex in 5 minute

    await transporter.sendMail({
      from: '"CFO Sales Dashboard" <info@cfocraft.com>',
      to:email,
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

    return res.status(200).json({ message: "OTP sent successfully!" });
  } catch (err) {
    console.error("SEND OTP ERROR:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// ------------------------------------
// 🔁 VERIFY OTP
// ------------------------------------
const verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    // Validate input empty
    if (!otp) {
      return res.status(400).json({ message: "OTP are required!" });
    }

    // Validate input 6 digit or not
    if (!/^\d{6}$/.test(otp)) {
      return res.status(400).json({ message: "OTP must be 6 digits!" });
    }

    const savedOtp = await redisClient.get(`otp:${email}`);
    if (!savedOtp) return res.status(400).json({ message: "OTP expired!" });
    if (savedOtp !== otp) return res.status(400).json({ message: "Invalid OTP!" });

    const tempData = await redisClient.get(`reg:${email}`);
    if (!tempData) return res.status(400).json({ message: "Session expired!" });

    const googleData = JSON.parse(tempData);

    let user = await User.findOne({ email });

    if (!user) {
      user = await User.create({
        name:googleData.name,
        email:googleData.email,
        profilePic:googleData.profilePic,
        googleId:googleData.googleId
      });
    }

    await redisClient.del(`otp:${email}`);
    await redisClient.del(`reg:${email}`);

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    res.cookie("token", token, {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
    });
    
    return res.status(200).json({
      message: "OTP Verified — Login successful!",
      userId: user,
    });
  } catch (err) {
    console.error("Verify OTP Error:", err);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};

module.exports = {
  register,
  verifyRegisterOtp,
  login,
  verifyLoginOtp,
  checkPass,
  logout,
  forgotPassword,
  resetPassword,
  resetPasswordVerifyOtp,
  verifyOtp,
  sendOtp,
};
