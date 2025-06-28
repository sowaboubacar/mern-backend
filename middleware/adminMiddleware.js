function adminMiddleware(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Accès interdit : réservé aux administrateurs' });
  }
  next();
}

module.exports = adminMiddleware;
