// routes/privateMessages.js
const express = require('express');
const router = express.Router();
const PrivateMessage = require('../models/PrivateMessage');
const authMiddleware = require('../middleware/authMiddleware');

router.get('/:userId', authMiddleware, async (req, res) => {
  const currentUserId = req.user.userId;  // récupérer userId du token
  const otherUserId = req.params.userId;

  try {
    const messages = await PrivateMessage.find({
      $or: [
        { from: currentUserId, to: otherUserId },
        { from: otherUserId, to: currentUserId }
      ]
    })
    .sort({ createdAt: 1 })
    .populate('from to', 'username');

    res.json(messages);
  } catch (err) {
    console.error('Erreur chargement messages privés:', err);
    res.status(500).json({ message: 'Erreur chargement messages privés' });
  }
});

module.exports = router;
