const express = require("express");
const { upload } = require("../middleware/upload");
const User = require("../models/user");

const router = express.Router();

router.post("/", upload.single("profile"), async (req, res) => {
  try {
    const userId = req.body.id;

    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    // Save image filename in DB
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { profilePic: req.file.filename },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({
      message: "Profile uploaded successfully",
      user: updatedUser,
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
