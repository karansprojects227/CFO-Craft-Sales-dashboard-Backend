const express = require("express");
const verifyToken = require("../middleware/verifyToken");

const router = express.Router();

// ✅ Protected route — only works if cookie has a valid token
router.get("/protected", verifyToken , (req, res) => {
  res.json({
    success: true,
    message: "Access granted!",
    user: req.user, // this will show the decoded JWT payload
  });
});

module.exports = router;
