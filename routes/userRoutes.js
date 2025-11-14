const express = require("express");
const checkUserExist = require("../middleware/checkUserExist");
const router = express.Router();

router.get("/checkUserExist", checkUserExist, (req, res) => {
  return res.json({ success: true });  // user hai
});

module.exports = router;
