const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');

/**
 * @swagger
 * /api/chat/protected:
 *   get:
 *     summary: Route protégée par JWT
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Accès autorisé
 *       401:
 *         description: Non autorisé
 */
router.get('/protected', auth, (req, res) => {
  res.json({ message: `Bienvenue, utilisateur ID : ${req.user.userId}` });
});

module.exports = router;
