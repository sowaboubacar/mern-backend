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

    await message.save();
    res.status(201).json(message);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

router.delete('/:messageId', authMiddleware, async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user.userId;

    console.log('🗑️ Suppression message demandé :', messageId);
    console.log('🔐 Utilisateur demandeur :', userId);

    const message = await Message.findById(messageId);
    if (!message) {
      console.log('❌ Message non trouvé');
      return res.status(404).json({ message: 'Message non trouvé' });
    }

    if (!message.author) {
      console.log('❗ Problème : message.author est null ou undefined');
      return res.status(500).json({ message: 'Message corrompu (pas d’auteur)' });
    }

    if (message.author.toString() !== userId) {
      console.log('🚫 Suppression non autorisée');
      return res.status(403).json({ message: 'Suppression non autorisée' });
    }

    await message.deleteOne(); // ✅ correction ici
    console.log('✅ Message supprimé');
    res.json({ message: 'Message supprimé' });

  } catch (err) {
    console.error('🔥 Erreur serveur lors de la suppression :', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});


module.exports = router;
