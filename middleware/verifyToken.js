// middleware/verifyToken.js
const jwt = require("jsonwebtoken");

module.exports = (req, res, next) => {
  const token = req.cookies.token; // ✅ from cookie
  if (!token) return res.status(403).json({ message: "Access denied! Please Login to continue..." });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // save user id to req.user.id taken from cookie so that when we access req.user.id and get user data means user id saved in cookie through login 
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};
