const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const authMiddleware = require('../middleware/authMiddleware');

// Récupérer messages d'une salle (protégé)
router.get('/:roomId', authMiddleware, async (req, res) => {
  try {
    const messages = await Message.find({ room: req.params.roomId })
      .populate('author', 'username')
      .sort({ createdAt: 1 });

    res.json(messages);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Envoyer message (protégé)
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { content, room } = req.body;

    if (!content || !room) {
      return res.status(400).json({ message: 'Contenu et salle requis' });
    }

    const message = new Message({
      content,
      room,
      author: req.user.userId
    });

    // Suppression d'un message (protégé)
router.delete('/:messageId', authMiddleware, async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user.userId;

    const message = await Message.findById(messageId);
    if (!message) return res.status(404).json({ message: 'Message non trouvé' });

    // Option : seul l'auteur ou un admin peut supprimer
    if (message.author.toString() !== userId /* && req.user.role !== 'admin' */) {
      return res.status(403).json({ message: 'Suppression non autorisée' });
    }

    await message.remove();
    res.json({ message: 'Message supprimé' });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur' });
  }
});


    await message.save();
    res.status(201).json(message);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

module.exports = router;
