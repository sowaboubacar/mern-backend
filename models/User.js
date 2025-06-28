const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  photo: { type: String, default: '' },
  bio: { type: String, default: '' },
  preferences: {
    type: Map,
    of: String,
    default: {}
  },
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  isBanned: { type: Boolean, default: false },
  reports: { type: Number, default: 0 },

  // Ajout du tableau des utilisateurs bloqués
  blockedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
