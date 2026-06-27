const express = require('express');
const db = require('../db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// 获取场次的座位图
router.get('/schedule/:scheduleId', (req, res) => {
  const schedule = db.prepare(`
    SELECT s.*, h.layout_config
    FROM schedules s
    JOIN halls h ON s.hall_id = h.id
    WHERE s.id = ?
  `).get(req.params.scheduleId);

  if (!schedule) return res.status(404).json({ error: '场次不存在' });

  const layout = JSON.parse(schedule.layout_config || '{}');

  // Get occupied seats from orders
  const occupiedSeats = db.prepare(`
    SELECT seat_ids FROM orders
    WHERE schedule_id = ? AND status IN ('pending', 'paid')
  `).all(req.params.scheduleId);

  const occupiedSet = new Set();
  occupiedSeats.forEach(order => {
    JSON.parse(order.seat_ids || '[]').forEach(id => occupiedSet.add(id));
  });

  const seats = db.prepare(
    'SELECT * FROM seats WHERE hall_id = ? ORDER BY row, col'
  ).all(schedule.hall_id);

  const seatsWithStatus = seats.map(seat => ({
    ...seat,
    status: occupiedSet.has(seat.id) ? 'sold' : seat.status,
  }));

  res.json({
    schedule: {
      id: schedule.id,
      movie_title: schedule.movie_title,
      show_time: schedule.show_time,
      price: schedule.price,
      member_price: schedule.member_price,
      hall_name: schedule.hall_name,
      cinema_name: schedule.cinema_name,
    },
    layout,
    seats: seatsWithStatus,
  });
});

// 锁定座位（创建待支付订单）
router.post('/lock', authMiddleware, (req, res) => {
  const { schedule_id, seat_ids } = req.body;

  if (!schedule_id || !seat_ids || seat_ids.length === 0) {
    return res.status(400).json({ error: '请选择座位' });
  }

  // Check if seats are occupied
  const occupied = db.prepare(`
    SELECT seat_ids FROM orders
    WHERE schedule_id = ? AND status IN ('pending', 'paid')
  `).all(schedule_id);

  const occupiedSet = new Set();
  occupied.forEach(order => {
    JSON.parse(order.seat_ids || '[]').forEach(id => occupiedSet.add(id));
  });

  const conflict = seat_ids.find(id => occupiedSet.has(id));
  if (conflict) return res.status(400).json({ error: '座位已被占用，请重新选择' });

  // Get schedule info for pricing
  const schedule = db.prepare('SELECT * FROM schedules WHERE id = ?').get(schedule_id);
  if (!schedule) return res.status(404).json({ error: '场次不存在' });

  // Check VIP level for pricing
  const user = db.prepare('SELECT vip_level FROM users WHERE id = ?').get(req.user.id);
  const unitPrice = user.vip_level > 0 ? schedule.member_price : schedule.price;
  const totalPrice = unitPrice * seat_ids.length;

  // Get seat info
  const seatInfos = seat_ids.map(id => {
    const seat = db.prepare('SELECT * FROM seats WHERE id = ?').get(id);
    return { id: seat.id, row: seat.row, col: seat.col, label: `${seat.row}排${seat.col}座` };
  });

  // Create pending order
  const orderNo = 'ORD' + Date.now() + Math.random().toString(36).slice(2, 8);

  const result = db.prepare(`
    INSERT INTO orders (order_no, user_id, schedule_id, seat_ids, seat_info, total_price, status)
    VALUES (?, ?, ?, ?, ?, ?, 'pending')
  `).run(orderNo, req.user.id, schedule_id, JSON.stringify(seat_ids), JSON.stringify(seatInfos), totalPrice);

  res.json({
    order_id: result.lastInsertRowid,
    order_no: orderNo,
    seats: seatInfos,
    total_price: totalPrice,
    unit_price: unitPrice,
    expires_in: 15 * 60,
  });
});

module.exports = router;
