// backend/routes/fetchUserData.js
const express = require("express");
const User = require("../models/user"); // Mongoose model

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const { id } = req.query;

    if (!id) {
      return res.status(400).json({ message: "User ID is required" });
    }

    const user = await User.findById(id).select("-password"); // remove sensitive data

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json({
      message: "User details fetched successfully",
      user,
    });
  } catch (error) {
    console.error("Error fetching user data:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// ✅ CommonJS export
module.exports = router;
