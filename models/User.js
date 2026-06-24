const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: false,
      trim: true,
      default: 'User',
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      // Not required for Google OAuth users
    },
    role: {
      type: String,
      // Accept any casing: admin, Admin, ADMIN, customer, Customer, etc.
      default: 'customer',
    },
    googleId: {
      type: String,
      default: null,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    // ✅ THIS IS THE KEY FIX — points to your "login" collection in MongoDB
    collection: 'login',
  }
);

module.exports = mongoose.model('User', userSchema);
