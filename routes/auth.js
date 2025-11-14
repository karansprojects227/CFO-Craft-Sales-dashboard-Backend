const express = require("express");
const { register, login, forgotPassword, resetPassword, logout } = require("../controllers/authController.js");

const router = express.Router();

// Define auth routes
router.post("/register", register);
router.post("/login", login);
router.post("/logout", logout);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password/:userId", resetPassword);

// Export router properly
module.exports = router;
