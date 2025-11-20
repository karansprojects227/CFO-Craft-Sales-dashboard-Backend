// 1. load .env FIRST
const dotenv = require('dotenv');
dotenv.config();

// 2. now import libraries
const express =  require("express");
const mongoose =  require("mongoose");
const MongoStore = require("connect-mongo");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const session = require('express-session');
const passport = require("passport");
require("./controllers/googleStrategy");               // <-- path to your GoogleStrategy file

const authRoutes =  require("./routes/auth.js");
const protectedRoute = require("./routes/protectedRoutes");
const fetchUserDataRoute = require("./routes/fetchUserData.js");
const uploadProfile = require("./routes/uploadProfile.js");
const googleAuthRoute = require("./routes/googleAuthRoute.js");  // initialize passport google strategy


const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(express.json());
app.use(cookieParser());
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false },
    store: MongoStore.create({
      mongoUrl: process.env.MONGO_URI,
      ttl: 60 * 60 * 24,
    }),
}));

// Initialize passport AFTER session middleware
app.use(passport.initialize());
app.use(passport.session());

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
app.use("/upload-profile", uploadProfile);
app.use("/uploads", express.static("uploads"));
app.use("/api/auth", googleAuthRoute);

// MongoDB connection
mongoose
connect(process.env.MONGO_URI)
.then(() => console.log("MongoDB connected"))
.catch((err) => console.log(err));

// Root route (VERY important for Render deployment)
app.get("/", (req, res) => {
  res.send("Backend Running Successfully!");
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

