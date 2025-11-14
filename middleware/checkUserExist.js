const jwt = require("jsonwebtoken");
const User = require("../models/user");

module.exports = async function (req, res, next) {
  try {
    const token = req.cookies?.token;

    if (!token) {
      return res.json({ success: false });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id);

    if (!user) {
      return res.json({ success: false });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.json({ success: false });
  }
};
