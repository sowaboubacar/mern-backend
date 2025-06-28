const mongoose = require('mongoose');

const privateMessageSchema = new mongoose.Schema({
  content: { type: String, required: true, trim: true },
  from: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  to: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, {
  timestamps: true,
});

module.exports = mongoose.model('PrivateMessage', privateMessageSchema);
