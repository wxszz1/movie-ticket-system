const db = require('../db');

function adminMiddleware(req, res, next) {
  const user = db.prepare('SELECT role FROM users WHERE id = ?').get(req.user.id);

  if (!user || user.role !== 'admin') {
    return res.status(403).json({ error: '无管理员权限' });
  }

  next();
}

module.exports = adminMiddleware;
