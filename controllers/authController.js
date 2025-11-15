const User = require("../models/user");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");

// format correct name with caoitalize
const formatName = (name) => {
  return name
    .trim()
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
};

// ------------------------------------
// 🔐 REGISTER
// ------------------------------------
const register = async (req, res) => {
  try {
    let { name, email, password } = req.body;

    // Format name (capitalize correctly)
    name = formatName(name);

    // 🔹 1. Validate all fields
    if (!name || !email || !password) {
      return res.status(400).json({ message: "All fields are required!" });
    }

    // 🔹 2. Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: "Invalid email format!" });
    }

    // 🔹 3. Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists. Please login!" });
    }

    // 🔹 4. Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // 🔹 5. Create new user
    const newUser = await User.create({
      name,
      email,
      password: hashedPassword,
    });

    // 🔹 6. Success response
    res.status(201).json({
      message: "User registered successfully",
      user: { id: newUser._id, name: newUser.name, email: newUser.email },
    });

  } catch (error) {
    console.error("Register Error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// ------------------------------------
// 🔑 LOGIN
// ------------------------------------
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // 🔹 1. Validate required fields
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required!" });
    }

    // 🔹 2. Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: "Invalid email format!" });
    }

    // 🔹 3. Check if user exists
    const user = await User.findOne({ email });
    if (!user) {
      return res
        .status(404)
        .json({ message: "User not found. Please register first!" });
    }

    // 🔹 4. Compare password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials!" });
    }

    // 🔹 5. Create token
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "1d",
    });

    // 🔹 6. Save token in HTTP-only cookie
    res.cookie("token", token, {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      path: "/",
    });

    // 🔹 7. Send success response
    res.status(200).json({
      message: "Login successful. Redirecting to your Dashboard Please wait...",
      user: { id: user._id, name: user.name, email: user.email },
    });

  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// ------------------------------------
// 🚪 LOGOUT
// ------------------------------------
const logout = (req, res) => {
  res.cookie("token", "", {
    httpOnly: true,
    secure: true,
    sameSite: "none",
    path: "/",
    expires: new Date(0)   // <-- force delete
  });
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
    const resetLink = `http://localhost:3000/auth/reset-password/${user._id}`;

    // 🔹 Setup nodemailer transporter
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: "karansprojects227@gmail.com",        // 🟢 Replace with your Gmail
        pass: "rnoxkrzgwvrglwhx",          // 🟢 Use Gmail App Password
      },
    });

    // 🔹 Mail options
    const mailOptions = {
      from: '"CFO Dashboard" <karansprojects227@gmail.com>',
      to: user.email,
      subject: "Password Reset Link",
      html: `
        <p>Hi ${user.name},</p>
        <p>You requested a password reset.</p>
        <p>Click below to reset your password:</p>
        <a href="${resetLink}">${resetLink}</a>
        <p>If you didn't request this, please ignore this email.</p>
      `,
    };

    // 🔹 Send mail
    await transporter.sendMail(mailOptions);
    console.log("✅ Password reset mail sent to:", user.email);

    res.json({
      message: `Reset link sent to your email.`,
      userId: user._id,
    });
  } catch (err) {
    console.error("Forgot Password Error:", err);
    res.status(500).json({ error: "Server error" });
  }
};

// ------------------------------------
// 🔁 RESET PASSWORD
// ------------------------------------
const resetPassword = async (req, res) => {
  try {
    const { userId } = req.params;
    const { password } = req.body;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    const hashedPassword = await bcrypt.hash(password, 10);
    user.password = hashedPassword;
    await user.save();

    res.json({ message: "Password reset successful!" });
  } catch (err) {
    console.error("Reset Password Error:", err);
    res.status(500).json({ error: "Server error" });
  }
};

module.exports = {
  register,
  login,
  logout,
  forgotPassword,
  resetPassword,
};
