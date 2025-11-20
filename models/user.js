const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },

    phone: {
      type: String,
      required: function () {
        return !this.googleId; // Google login ke liye optional
      },
      select: false,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },

    password: {
      type: String,
      required: function () {
        return !this.googleId; // Google login ke liye optional
      },
      select: false,
    },

    googleId: {
      type: String,
      default: null,
    },

    profilePic: {
      type: String,
      default: "default-user",
      select: true,   // ← ADD THIS LINE
    },
  },
  { timestamps: true }
);

const User = mongoose.models.User || mongoose.model("User", UserSchema);
module.exports = User;
