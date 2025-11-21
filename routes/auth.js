const express = require("express");
const { register, login, checkPass, forgotPassword, resetPasswordVerifyOtp, resetPassword, logout, verifyRegisterOtp, verifyOtp, sendOtp, verifyLoginOtp } = require("../controllers/authController.js");

const router = express.Router();

// Define auth routes
router.post("/register", register);
router.post("/verify-register-otp", verifyRegisterOtp);
router.post("/login", login);
router.post("/checkpass", checkPass);
router.post("/verify-login-otp", verifyLoginOtp);
router.post("/send-otp", sendOtp);
router.post("/verify-otp", verifyOtp);
router.post("/forgot-password", forgotPassword);
router.post("/verify-reset-password-otp", resetPasswordVerifyOtp);
router.post("/reset-password/:userId", resetPassword);
router.post("/logout", logout);
// Export router properly
module.exports = router;
