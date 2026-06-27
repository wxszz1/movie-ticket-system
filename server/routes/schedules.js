const express = require('express');
const db = require('../db');

const router = express.Router();

router.get('/', (req, res) => {
  const { movie_id, cinema_id, date } = req.query;

  let sql = `
    SELECT s.*, m.title as movie_title, m.poster, m.duration,
           h.name as hall_name, h.type as hall_type, c.name as cinema_name, c.address
    FROM schedules s
    JOIN movies m ON s.movie_id = m.id
    JOIN halls h ON s.hall_id = h.id
    JOIN cinemas c ON h.cinema_id = c.id
    WHERE s.status = 'available'
  `;
  const params = [];

  if (movie_id) { sql += ' AND s.movie_id = ?'; params.push(movie_id); }
  if (cinema_id) { sql += ' AND h.cinema_id = ?'; params.push(cinema_id); }
  if (date) { sql += ' AND DATE(s.show_time) = ?'; params.push(date); }

  sql += ' ORDER BY s.show_time ASC';
  res.json(db.prepare(sql).all(...params));
});

router.get('/:id', (req, res) => {
  const schedule = db.prepare(`
    SELECT s.*, m.title as movie_title, m.poster, m.duration, m.rating,
           h.name as hall_name, h.type as hall_type, h.total_seats,
           c.name as cinema_name, c.address
    FROM schedules s
    JOIN movies m ON s.movie_id = m.id
    JOIN halls h ON s.hall_id = h.id
    JOIN cinemas c ON h.cinema_id = c.id
    WHERE s.id = ?
  `).get(req.params.id);

  if (!schedule) return res.status(404).json({ error: '场次不存在' });

  const soldCount = db.prepare(
    "SELECT COUNT(*) as count FROM orders WHERE schedule_id = ? AND status IN ('paid', 'pending')"
  ).get(req.params.id);
  schedule.sold_seats = soldCount.count;

  res.json(schedule);
});

module.exports = router;
