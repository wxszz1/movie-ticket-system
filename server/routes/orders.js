const express = require('express');
const db = require('../db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// 用户订单列表
router.get('/', authMiddleware, (req, res) => {
  const orders = db.prepare(`
    SELECT o.*, m.title as movie_title, m.poster,
           s.show_time, h.name as hall_name, c.name as cinema_name
    FROM orders o
    JOIN schedules s ON o.schedule_id = s.id
    JOIN movies m ON s.movie_id = m.id
    JOIN halls h ON s.hall_id = h.id
    JOIN cinemas c ON h.cinema_id = c.id
    WHERE o.user_id = ? AND o.status != 'checkin'
    ORDER BY o.created_at DESC
  `).all(req.user.id);

  orders.forEach(o => { o.seat_info = JSON.parse(o.seat_info || '[]'); });
  res.json(orders);
});

// 订单详情
router.get('/:id', authMiddleware, (req, res) => {
  const order = db.prepare(`
    SELECT o.*, m.title as movie_title, m.poster, m.duration,
           s.show_time, h.name as hall_name, h.type as hall_type,
           c.name as cinema_name, c.address
    FROM orders o
    JOIN schedules s ON o.schedule_id = s.id
    JOIN movies m ON s.movie_id = m.id
    JOIN halls h ON s.hall_id = h.id
    JOIN cinemas c ON h.cinema_id = c.id
    WHERE o.id = ? AND o.user_id = ?
  `).get(req.params.id, req.user.id);

  if (!order) return res.status(404).json({ error: '订单不存在' });
  order.seat_info = JSON.parse(order.seat_info || '[]');
  res.json(order);
});

// 支付（mock）
router.post('/:id/pay', authMiddleware, (req, res) => {
  const order = db.prepare(
    "SELECT * FROM orders WHERE id = ? AND user_id = ? AND status = 'pending'"
  ).get(req.params.id, req.user.id);

  if (!order) return res.status(400).json({ error: '订单不存在或已支付' });

  db.prepare("UPDATE orders SET status = 'paid', paid_at = datetime('now') WHERE id = ?").run(order.id);

  const qrCode = Math.random().toString().slice(2, 8);
  db.prepare('UPDATE orders SET qr_code = ? WHERE id = ?').run(qrCode, order.id);

  // Add points
  db.prepare('UPDATE users SET points = points + 10 WHERE id = ?').run(req.user.id);

  res.json({ message: '支付成功', qr_code: qrCode, points_earned: 10 });
});

// 取消订单
router.post('/:id/cancel', authMiddleware, (req, res) => {
  const order = db.prepare(
    "SELECT * FROM orders WHERE id = ? AND user_id = ? AND status = 'pending'"
  ).get(req.params.id, req.user.id);

  if (!order) return res.status(400).json({ error: '订单不存在或无法取消' });

  db.prepare("UPDATE orders SET status = 'cancelled' WHERE id = ?").run(order.id);
  res.json({ message: '订单已取消' });
});

// 退款
router.post('/:id/refund', authMiddleware, (req, res) => {
  const order = db.prepare(
    "SELECT * FROM orders WHERE id = ? AND user_id = ? AND status = 'paid'"
  ).get(req.params.id, req.user.id);

  if (!order) return res.status(400).json({ error: '订单不存在或无法退款' });

  const schedule = db.prepare('SELECT show_time FROM schedules WHERE id = ?').get(order.schedule_id);
  if (new Date(schedule.show_time) <= new Date()) {
    return res.status(400).json({ error: '开场后无法退款' });
  }

  db.prepare("UPDATE orders SET status = 'refunded', refunded_at = datetime('now') WHERE id = ?").run(order.id);
  db.prepare('UPDATE users SET points = MAX(0, points - 10) WHERE id = ?').run(req.user.id);

  res.json({ message: '退款成功' });
});

module.exports = router;
