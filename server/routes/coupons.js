const express = require('express');
const db = require('../db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// 获取用户优惠券
router.get('/', authMiddleware, (req, res) => {
  const coupons = db.prepare('SELECT * FROM coupons WHERE user_id = ? ORDER BY created_at DESC').all(req.user.id);
  res.json(coupons);
});

// 领取优惠券
router.post('/claim', authMiddleware, (req, res) => {
  const { type, value, min_amount } = req.body;
  const result = db.prepare(
    "INSERT INTO coupons (user_id, type, value, min_amount, expires_at) VALUES (?, ?, ?, ?, DATE('now', '+30 days'))"
  ).run(req.user.id, type || 'voucher', value || 10, min_amount || 0);
  res.json({ id: result.lastInsertRowid, message: '领取成功' });
});

module.exports = router;
