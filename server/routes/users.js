const express = require('express');
const db = require('../db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// 获取当前用户资料
router.get('/profile', authMiddleware, (req, res) => {
  const user = db.prepare(
    'SELECT id, phone, email, nickname, avatar, vip_level, points, role, created_at FROM users WHERE id = ?'
  ).get(req.user.id);

  if (!user) {
    return res.status(404).json({ error: '用户不存在' });
  }

  res.json(user);
});

// 更新用户资料
router.put('/profile', authMiddleware, (req, res) => {
  const { nickname, avatar, email } = req.body;

  if (nickname) {
    db.prepare('UPDATE users SET nickname = ? WHERE id = ?').run(nickname, req.user.id);
  }
  if (avatar) {
    db.prepare('UPDATE users SET avatar = ? WHERE id = ?').run(avatar, req.user.id);
  }
  if (email) {
    const existing = db.prepare('SELECT id FROM users WHERE email = ? AND id != ?').get(email, req.user.id);
    if (existing) {
      return res.status(400).json({ error: '该邮箱已被使用' });
    }
    db.prepare('UPDATE users SET email = ? WHERE id = ?').run(email, req.user.id);
  }

  const user = db.prepare(
    'SELECT id, phone, email, nickname, avatar, vip_level, points, role FROM users WHERE id = ?'
  ).get(req.user.id);

  res.json(user);
});

// 每日签到
router.post('/checkin', authMiddleware, (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  const checked = db.prepare(
    "SELECT id FROM orders WHERE user_id = ? AND created_at LIKE ? AND status = 'checkin'"
  ).get(req.user.id, today + '%');

  if (checked) {
    return res.status(400).json({ error: '今天已经签到过了' });
  }

  db.prepare('UPDATE users SET points = points + 2 WHERE id = ?').run(req.user.id);

  db.prepare(
    "INSERT INTO orders (order_no, user_id, schedule_id, seat_ids, seat_info, total_price, status) VALUES (?, ?, NULL, '[]', '[]', 0, 'checkin')"
  ).run('CHECKIN-' + Date.now(), req.user.id);

  const user = db.prepare('SELECT points FROM users WHERE id = ?').get(req.user.id);

  res.json({ message: '签到成功，获得 2 积分', points: user.points });
});

// 获取积分明细
router.get('/points', authMiddleware, (req, res) => {
  const user = db.prepare('SELECT points FROM users WHERE id = ?').get(req.user.id);
  res.json({ total: user.points });
});

// 想看/看过列表
router.get('/movies', authMiddleware, (req, res) => {
  const { status } = req.query;

  let sql = 'SELECT m.*, um.status as user_status FROM user_movies um JOIN movies m ON um.movie_id = m.id WHERE um.user_id = ?';
  const params = [req.user.id];

  if (status) {
    sql += ' AND um.status = ?';
    params.push(status);
  }

  const movies = db.prepare(sql).all(...params);
  res.json(movies);
});

module.exports = router;
