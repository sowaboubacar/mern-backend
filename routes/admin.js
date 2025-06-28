const express = require('express');
const router = express.Router();
const User = require('../models/User');
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');
// ➤ Bannir un utilisateur
// PATCH /api/admin/ban/:userId
router.patch('/ban/:userId', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ message: 'Utilisateur non trouvé' });

    user.isBanned = true;
    await user.save();
    res.json({ message: `Utilisateur ${user.username} banni.` });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// GET /api/admin/users
// Récupérer tous les utilisateurs (infos de base + reports + isBanned)
router.get('/users', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const users = await User.find({}, 'username email reports isBanned role');
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// ➤ Signaler un utilisateur
// POST /api/admin/report/:userId
router.post('/report/:userId', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ message: 'Utilisateur non trouvé' });

    user.reports += 1;

    // auto-ban après 5 signalements (exemple)
    if (user.reports >= 5) {
      user.isBanned = true;
    }

    await user.save();
    res.json({ message: `Utilisateur ${user.username} signalé.` });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

module.exports = router;
