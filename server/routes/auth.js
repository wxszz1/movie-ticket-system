const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const { JWT_SECRET } = require('../middleware/auth');

const router = express.Router();

// 注册
router.post('/register', (req, res) => {
  const { phone, email, password, nickname } = req.body;

  if (!password || (!phone && !email)) {
    return res.status(400).json({ error: '请填写完整信息' });
  }

  // 检查是否已存在
  const existing = phone
    ? db.prepare('SELECT id FROM users WHERE phone = ?').get(phone)
    : db.prepare('SELECT id FROM users WHERE email = ?').get(email);

  if (existing) {
    return res.status(400).json({ error: '该手机号/邮箱已注册' });
  }

  const password_hash = bcrypt.hashSync(password, 10);

  const result = db.prepare(
    'INSERT INTO users (phone, email, password_hash, nickname) VALUES (?, ?, ?, ?)'
  ).run(phone || null, email || null, password_hash, nickname || '用户');

  const token = jwt.sign(
    { id: result.lastInsertRowid, role: 'user' },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  res.json({
    token,
    user: {
      id: result.lastInsertRowid,
      nickname: nickname || '用户',
      phone,
      email,
      vip_level: 0,
      points: 0,
      role: 'user'
    }
  });
});

// 登录
router.post('/login', (req, res) => {
  const { account, password } = req.body;

  if (!account || !password) {
    return res.status(400).json({ error: '请填写账号和密码' });
  }

  // 支持手机号或邮箱登录
  const user = db.prepare(
    'SELECT * FROM users WHERE phone = ? OR email = ?'
  ).get(account, account);

  if (!user) {
    return res.status(400).json({ error: '账号不存在' });
  }

  if (!bcrypt.compareSync(password, user.password_hash)) {
    return res.status(400).json({ error: '密码错误' });
  }

  const token = jwt.sign(
    { id: user.id, role: user.role },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  res.json({
    token,
    user: {
      id: user.id,
      nickname: user.nickname,
      phone: user.phone,
      email: user.email,
      avatar: user.avatar,
      vip_level: user.vip_level,
      points: user.points,
      role: user.role
    }
  });
});

// 修改密码
router.put('/password', (req, res) => {
  const { account, oldPassword, newPassword } = req.body;

  const user = db.prepare(
    'SELECT * FROM users WHERE phone = ? OR email = ?'
  ).get(account, account);

  if (!user || !bcrypt.compareSync(oldPassword, user.password_hash)) {
    return res.status(400).json({ error: '账号或密码错误' });
  }

  const hash = bcrypt.hashSync(newPassword, 10);
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, user.id);

  res.json({ message: '密码修改成功' });
});

module.exports = router;
