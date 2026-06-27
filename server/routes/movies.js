const express = require('express');
const db = require('../db');

const router = express.Router();

// 影片列表（支持分页和筛选）
router.get('/', (req, res) => {
  const { page = 1, limit = 20, genre, region, status, search } = req.query;
  const offset = (page - 1) * limit;

  let sql = 'SELECT * FROM movies WHERE 1=1';
  const params = [];

  if (genre) {
    sql += ' AND genre LIKE ?';
    params.push(`%"${genre}"%`);
  }
  if (region) {
    sql += ' AND region = ?';
    params.push(region);
  }
  if (status) {
    sql += ' AND status = ?';
    params.push(status);
  }
  if (search) {
    sql += ' AND (title LIKE ? OR director LIKE ? OR actors LIKE ?)';
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }

  const countSql = sql.replace('SELECT *', 'SELECT COUNT(*) as total');
  const total = db.prepare(countSql).get(...params).total;

  sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(Number(limit), Number(offset));

  const movies = db.prepare(sql).all(...params);

  res.json({
    movies,
    pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / limit) }
  });
});

// 热门排行
router.get('/hot', (req, res) => {
  const movies = db.prepare(
    "SELECT * FROM movies WHERE status = 'playing' ORDER BY rating DESC LIMIT 10"
  ).all();
  res.json(movies);
});

// 影片详情
router.get('/:id', (req, res) => {
  const movie = db.prepare('SELECT * FROM movies WHERE id = ?').get(req.params.id);
  if (!movie) return res.status(404).json({ error: '影片不存在' });

  const stats = db.prepare(
    'SELECT AVG(rating) as avg_rating, COUNT(*) as review_count FROM reviews WHERE movie_id = ?'
  ).get(req.params.id);

  movie.avg_rating = stats.avg_rating || 0;
  movie.review_count = stats.review_count || 0;

  res.json(movie);
});

module.exports = router;
