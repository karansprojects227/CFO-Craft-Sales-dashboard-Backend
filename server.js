const express =  require("express");
const mongoose =  require("mongoose");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const session = require('express-session');
const dotenv = require('dotenv');
const authRoutes =  require("./routes/auth.js");
const protectedRoute = require("./routes/protectedRoutes");
const fetchUserDataRoute = require("./routes/fetchUserData.js");
const uploadProfile = require("./routes/uploadProfile.js");
const userRoutes = require("./routes/userRoutes");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(express.json());
app.use(cookieParser());
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false
}));

// ✅ Allow frontend to send cookies
app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true, // allow cookies
  })
);

// Routes
app.use("/api/auth", authRoutes);
app.use("/api", protectedRoute);
app.use("/api/fetchUserData", fetchUserDataRoute);
app.use("/api/user", userRoutes);
app.use("/upload-profile", uploadProfile);
app.use("/uploads", express.static("uploads"));

// MongoDB connection
mongoose
.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
.then(() => console.log("MongoDB connected"))
.catch((err) => console.log(err));

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
