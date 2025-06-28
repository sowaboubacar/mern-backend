const express = require('express');
const router = express.Router();
const Room = require('../models/Room');
const authMiddleware = require('../middleware/authMiddleware');

// GET /api/rooms - liste des salles
router.get('/', authMiddleware, async (req, res) => {
  try {
    const rooms = await Room.find().sort({ createdAt: -1 });
    res.json(rooms);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// POST /api/rooms - créer une salle
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { name, description } = req.body;

    const existing = await Room.findOne({ name });
    if (existing) {
      return res.status(400).json({ message: 'Nom de salle déjà utilisé' });
    }

    const room = new Room({
      name,
      description,
      members: [req.user.userId]
    });

    await room.save();
    res.status(201).json(room);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

module.exports = router;
