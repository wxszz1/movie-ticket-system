const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'movie.db'));

// 启用 WAL 模式提升性能
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

module.exports = db;
