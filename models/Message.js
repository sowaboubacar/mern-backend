const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  content: { type: String, required: true },
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  room: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true },
  to: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // optionnel, pour messages privés
}, { timestamps: true });

module.exports = mongoose.model('Message', messageSchema);
