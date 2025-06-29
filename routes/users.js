const express = require('express');
const router = express.Router();
const User = require('../models/User');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'change_this_secret';

// Middleware pour vérifier le token (authentification)
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.sendStatus(401);

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
}

// GET /api/users - récupère tous les utilisateurs
router.get('/', authenticateToken, async (req, res) => {
  try {
    const users = await User.find({}, '_id username email');
    res.json(users);
  } catch (err) {
    console.error('Erreur récupération utilisateurs:', err.message);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// POST /api/users/block/:userId - bloquer un utilisateur
router.post('/block/:userId', authenticateToken, async (req, res) => {
  try {
    const blockerId = req.user.userId;
    const blockedId = req.params.userId;

    if (blockerId === blockedId) {
      return res.status(400).json({ message: "Vous ne pouvez pas vous bloquer vous-même." });
    }

    const blocker = await User.findById(blockerId);
    if (!blocker) return res.status(404).json({ message: "Utilisateur non trouvé." });

    if (!blocker.blockedUsers.includes(blockedId)) {
      blocker.blockedUsers.push(blockedId);
      await blocker.save();
    }

    res.json({ message: "Utilisateur bloqué avec succès." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur serveur." });
  }
});

// POST /api/users/unblock/:userId - débloquer un utilisateur
router.post('/unblock/:userId', authenticateToken, async (req, res) => {
  try {
    const blockerId = req.user.userId;
    const blockedId = req.params.userId;

    const blocker = await User.findById(blockerId);
    if (!blocker) return res.status(404).json({ message: "Utilisateur non trouvé." });

    blocker.blockedUsers = blocker.blockedUsers.filter(id => id.toString() !== blockedId);
    await blocker.save();

    res.json({ message: "Utilisateur débloqué avec succès." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur serveur." });
  }
});

// GET /api/users/blocked - récupérer la liste des utilisateurs bloqués
router.get('/blocked', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const user = await User.findById(userId).populate('blockedUsers', 'username email');
    if (!user) return res.status(404).json({ message: "Utilisateur non trouvé." });
    res.json(user.blockedUsers);
  } catch (err) {
    console.error("Erreur récupération utilisateurs bloqués:", err.message);
    res.status(500).json({ message: "Erreur serveur." });
  }
});

// PUT /api/users/:id - mise à jour du profil utilisateur (ancienne route, inchangée)
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const targetId = req.params.id;

    if (userId !== targetId) {
      return res.status(403).json({ message: "Vous ne pouvez modifier que votre propre profil." });
    }

    const { username, email } = req.body;

    if (!username || !email) {
      return res.status(400).json({ message: "Nom d'utilisateur et email sont requis." });
    }

    const existingUser = await User.findOne({
      $or: [{ username }, { email }],
      _id: { $ne: userId }
    });
    if (existingUser) {
      return res.status(400).json({ message: "Nom d'utilisateur ou email déjà utilisé." });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "Utilisateur non trouvé." });

    user.username = username;
    user.email = email;

    await user.save();

    res.json({ message: "Profil mis à jour avec succès." });
  } catch (err) {
    console.error('Erreur mise à jour profil:', err);
    res.status(500).json({ message: "Erreur serveur." });
  }
});

// Nouvelle route PATCH /api/users/:id/full - mise à jour et renvoi du user à jour
router.patch('/:id/full', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const targetId = req.params.id;

    if (userId !== targetId) {
      return res.status(403).json({ message: "Vous ne pouvez modifier que votre propre profil." });
    }

    const { username, email } = req.body;

    if (!username || !email) {
      return res.status(400).json({ message: "Nom d'utilisateur et email sont requis." });
    }

    const existingUser = await User.findOne({
      $or: [{ username }, { email }],
      _id: { $ne: userId }
    });
    if (existingUser) {
      return res.status(400).json({ message: "Nom d'utilisateur ou email déjà utilisé." });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "Utilisateur non trouvé." });

    user.username = username;
    user.email = email;

    await user.save();

    // Renvoi du message + user à jour
    res.json({ 
      message: "Profil mis à jour avec succès.",
      user: { _id: user._id, username: user.username, email: user.email }
    });
  } catch (err) {
    console.error('Erreur mise à jour profil:', err);
    res.status(500).json({ message: "Erreur serveur." });
  }
});

module.exports = router;
