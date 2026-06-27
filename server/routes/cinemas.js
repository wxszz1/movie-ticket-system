const express = require('express');
const db = require('../db');

const router = express.Router();

router.get('/', (req, res) => {
  const cinemas = db.prepare('SELECT * FROM cinemas').all();
  cinemas.forEach(c => { c.facilities = JSON.parse(c.facilities || '[]'); });
  res.json(cinemas);
});

router.get('/:id', (req, res) => {
  const cinema = db.prepare('SELECT * FROM cinemas WHERE id = ?').get(req.params.id);
  if (!cinema) return res.status(404).json({ error: '影院不存在' });
  cinema.facilities = JSON.parse(cinema.facilities || '[]');
  cinema.halls = db.prepare('SELECT * FROM halls WHERE cinema_id = ?').all(cinema.id);
  res.json(cinema);
});

router.get('/:id/halls', (req, res) => {
  const halls = db.prepare('SELECT * FROM halls WHERE cinema_id = ?').all(req.params.id);
  halls.forEach(h => { h.layout_config = JSON.parse(h.layout_config || '{}'); });
  res.json(halls);
});

module.exports = router;
