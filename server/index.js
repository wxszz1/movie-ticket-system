const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./db');

const app = express();
const PORT = 3000;

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// API 路由
const authRoutes = require('./routes/auth');
app.use('/api/auth', authRoutes);

const userRoutes = require('./routes/users');
app.use('/api/users', userRoutes);

const movieRoutes = require('./routes/movies');
app.use('/api/movies', movieRoutes);

const cinemaRoutes = require('./routes/cinemas');
app.use('/api/cinemas', cinemaRoutes);

const scheduleRoutes = require('./routes/schedules');
app.use('/api/schedules', scheduleRoutes);

// 所有非 API 请求返回 index.html（支持前端路由）
app.get('/{*splat}', (req, res) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: 'API not found' });
  }
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// 启动时自动初始化数据库表
require('./init-tables');

app.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`);
});
