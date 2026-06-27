const express = require('express');
const db = require('../db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// 获取影片评价
router.get('/movie/:movieId', (req, res) => {
  const reviews = db.prepare(`
    SELECT r.*, u.nickname, u.avatar
    FROM reviews r JOIN users u ON r.user_id = u.id
    WHERE r.movie_id = ? ORDER BY r.created_at DESC
  `).all(req.params.movieId);
  res.json(reviews);
});

// 发表评价
router.post('/', authMiddleware, (req, res) => {
  const { movie_id, rating, content, type } = req.body;
  if (!movie_id || !rating) return res.status(400).json({ error: '请填写评分' });

  const existing = db.prepare('SELECT id FROM reviews WHERE user_id = ? AND movie_id = ?').get(req.user.id, movie_id);
  if (existing) return res.status(400).json({ error: '您已评价过该影片' });

  db.prepare('INSERT INTO reviews (user_id, movie_id, rating, content, type) VALUES (?, ?, ?, ?, ?)')
    .run(req.user.id, movie_id, rating, content || '', type || 'short');

  db.prepare('UPDATE users SET points = points + 5 WHERE id = ?').run(req.user.id);

  res.json({ message: '评价成功', points_earned: 5 });
});

module.exports = router;
