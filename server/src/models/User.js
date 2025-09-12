const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  googleId: String,
  email: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  password: String, // Only for manual registration
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', userSchema);
