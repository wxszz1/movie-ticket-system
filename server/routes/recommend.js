const express = require('express');
const db = require('../db');
const { optionalAuth } = require('../middleware/auth');

const router = express.Router();

// 首页推荐
router.get('/home', optionalAuth, (req, res) => {
  let recommendations = [];

  if (req.user) {
    // 已登录：基于用户历史推荐
    const userGenres = db.prepare(`
      SELECT DISTINCT m.genre FROM user_movies um
      JOIN movies m ON um.movie_id = m.id
      WHERE um.user_id = ? AND um.status = 'saw'
    `).all(req.user.id);

    if (userGenres.length > 0) {
      const genres = new Set();
      userGenres.forEach(ug => {
        // genre might be JSON array string or plain string
        try {
          JSON.parse(ug.genre || '[]').forEach(g => genres.add(g));
        } catch {
          if (ug.genre) genres.add(ug.genre);
        }
      });

      const genreConditions = Array.from(genres).map(() => "genre LIKE ?").join(' OR ');
      const genreParams = Array.from(genres).map(g => `%${g}%`);

      recommendations = db.prepare(`
        SELECT * FROM movies
        WHERE status = 'playing' AND (${genreConditions})
        ORDER BY rating DESC LIMIT 10
      `).all(...genreParams);
    }
  }

  // 冷启动或推荐不足时补充热门
  if (recommendations.length < 6) {
    const hot = db.prepare(
      "SELECT * FROM movies WHERE status = 'playing' ORDER BY rating DESC LIMIT 10"
    ).all();

    const existIds = new Set(recommendations.map(r => r.id));
    hot.forEach(m => {
      if (!existIds.has(m.id) && recommendations.length < 10) {
        recommendations.push(m);
      }
    });
  }

  res.json(recommendations);
});

// 相似影片推荐
router.get('/similar/:movieId', (req, res) => {
  const movie = db.prepare('SELECT * FROM movies WHERE id = ?').get(req.params.movieId);
  if (!movie) return res.status(404).json({ error: '影片不存在' });

  let genre;
  try {
    genre = JSON.parse(movie.genre || '[]');
  } catch {
    genre = movie.genre ? [movie.genre] : [];
  }

  if (genre.length === 0) {
    const hot = db.prepare(
      "SELECT * FROM movies WHERE status = 'playing' AND id != ? ORDER BY rating DESC LIMIT 6"
    ).all(movie.id);
    return res.json(hot);
  }

  const conditions = genre.map(() => "genre LIKE ?").join(' OR ');
  const params = genre.map(g => `%${g}%`);

  const similar = db.prepare(`
    SELECT * FROM movies
    WHERE status = 'playing' AND id != ? AND (${conditions})
    ORDER BY rating DESC LIMIT 6
  `).all(movie.id, ...params);

  res.json(similar);
});

module.exports = router;
