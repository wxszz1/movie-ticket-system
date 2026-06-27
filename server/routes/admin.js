const express = require('express');
const db = require('../db');
const { authMiddleware } = require('../middleware/auth');
const adminMiddleware = require('../middleware/admin');

const router = express.Router();
router.use(authMiddleware, adminMiddleware);

// 数据看板
router.get('/dashboard', (req, res) => {
  const totalUsers = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
  const totalMovies = db.prepare('SELECT COUNT(*) as count FROM movies').get().count;
  const totalOrders = db.prepare("SELECT COUNT(*) as count FROM orders WHERE status = 'paid'").get().count;
  const totalRevenue = db.prepare("SELECT COALESCE(SUM(total_price), 0) as total FROM orders WHERE status = 'paid'").get().total;

  const today = new Date().toISOString().split('T')[0];
  const todayOrders = db.prepare("SELECT COUNT(*) as count FROM orders WHERE status = 'paid' AND DATE(paid_at) = ?").get(today).count;
  const todayRevenue = db.prepare("SELECT COALESCE(SUM(total_price), 0) as total FROM orders WHERE status = 'paid' AND DATE(paid_at) = ?").get(today).total;

  const hotMovies = db.prepare(`
    SELECT m.title, COUNT(o.id) as order_count, SUM(o.total_price) as revenue
    FROM orders o JOIN schedules s ON o.schedule_id = s.id JOIN movies m ON s.movie_id = m.id
    WHERE o.status = 'paid' GROUP BY m.id ORDER BY order_count DESC LIMIT 5
  `).all();

  const userGrowth = db.prepare(`
    SELECT DATE(created_at) as date, COUNT(*) as count FROM users
    WHERE DATE(created_at) >= DATE('now', '-7 days') GROUP BY DATE(created_at) ORDER BY date
  `).all();

  res.json({ totalUsers, totalMovies, totalOrders, totalRevenue, todayOrders, todayRevenue, hotMovies, userGrowth });
});

// 影片管理
router.get('/movies', (req, res) => {
  res.json(db.prepare('SELECT * FROM movies ORDER BY created_at DESC').all());
});

router.put('/movies/:id', (req, res) => {
  const { title, director, actors, genre, region, year, duration, rating, description, status } = req.body;
  db.prepare(`UPDATE movies SET title=COALESCE(?,title), director=COALESCE(?,director), actors=COALESCE(?,actors),
    genre=COALESCE(?,genre), region=COALESCE(?,region), year=COALESCE(?,year), duration=COALESCE(?,duration),
    rating=COALESCE(?,rating), description=COALESCE(?,description), status=COALESCE(?,status) WHERE id=?`)
    .run(title, director, actors, genre, region, year, duration, rating, description, status, req.params.id);
  res.json({ message: '更新成功' });
});

// 排片管理
router.get('/schedules', (req, res) => {
  res.json(db.prepare(`
    SELECT s.*, m.title as movie_title, h.name as hall_name, c.name as cinema_name
    FROM schedules s JOIN movies m ON s.movie_id = m.id JOIN halls h ON s.hall_id = h.id JOIN cinemas c ON h.cinema_id = c.id
    ORDER BY s.show_time DESC
  `).all());
});

router.post('/schedules', (req, res) => {
  const { movie_id, hall_id, show_time, price, member_price } = req.body;
  if (!movie_id || !hall_id || !show_time || !price) return res.status(400).json({ error: '请填写完整信息' });
  const result = db.prepare('INSERT INTO schedules (movie_id, hall_id, show_time, price, member_price) VALUES (?, ?, ?, ?, ?)')
    .run(movie_id, hall_id, show_time, price, member_price || price * 0.85);
  res.json({ id: result.lastInsertRowid, message: '排片成功' });
});

// 用户管理
router.get('/users', (req, res) => {
  res.json(db.prepare('SELECT id, phone, email, nickname, vip_level, points, role, created_at FROM users').all());
});

router.put('/users/:id/role', (req, res) => {
  db.prepare('UPDATE users SET role = ? WHERE id = ?').run(req.body.role, req.params.id);
  res.json({ message: '更新成功' });
});

// 订单管理
router.get('/orders', (req, res) => {
  res.json(db.prepare(`
    SELECT o.*, u.nickname as user_name, m.title as movie_title
    FROM orders o JOIN users u ON o.user_id = u.id JOIN schedules s ON o.schedule_id = s.id JOIN movies m ON s.movie_id = m.id
    WHERE o.status != 'checkin' ORDER BY o.created_at DESC
  `).all());
});

router.post('/orders/:id/refund', (req, res) => {
  const order = db.prepare("SELECT * FROM orders WHERE id = ? AND status = 'paid'").get(req.params.id);
  if (!order) return res.status(400).json({ error: '订单不存在或无法退款' });
  db.prepare("UPDATE orders SET status = 'refunded', refunded_at = datetime('now') WHERE id = ?").run(order.id);
  res.json({ message: '退款成功' });
});

module.exports = router;
