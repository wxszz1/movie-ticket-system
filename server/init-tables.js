const db = require('./db');

const tables = `
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  phone TEXT UNIQUE,
  email TEXT UNIQUE,
  password_hash TEXT NOT NULL,
  nickname TEXT DEFAULT '用户',
  avatar TEXT DEFAULT '/assets/default-avatar.png',
  vip_level INTEGER DEFAULT 0,
  points INTEGER DEFAULT 0,
  role TEXT DEFAULT 'user',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS cinemas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  phone TEXT,
  facilities TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS halls (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cinema_id INTEGER REFERENCES cinemas(id),
  name TEXT NOT NULL,
  type TEXT DEFAULT '普通',
  total_seats INTEGER,
  layout_config TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS seats (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  hall_id INTEGER REFERENCES halls(id),
  row INTEGER NOT NULL,
  col INTEGER NOT NULL,
  type TEXT DEFAULT 'normal',
  status TEXT DEFAULT 'available',
  UNIQUE(hall_id, row, col)
);

CREATE TABLE IF NOT EXISTS movies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  poster TEXT,
  trailer TEXT,
  director TEXT,
  actors TEXT,
  genre TEXT,
  region TEXT,
  year INTEGER,
  duration INTEGER,
  rating REAL DEFAULT 0,
  description TEXT,
  status TEXT DEFAULT 'upcoming',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS schedules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  movie_id INTEGER REFERENCES movies(id),
  hall_id INTEGER REFERENCES halls(id),
  show_time DATETIME NOT NULL,
  price REAL NOT NULL,
  member_price REAL,
  status TEXT DEFAULT 'available',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_no TEXT UNIQUE NOT NULL,
  user_id INTEGER REFERENCES users(id),
  schedule_id INTEGER REFERENCES schedules(id),
  seat_ids TEXT,
  seat_info TEXT,
  total_price REAL NOT NULL,
  coupon_id INTEGER,
  points_used INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending',
  qr_code TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  paid_at DATETIME,
  refunded_at DATETIME
);

CREATE TABLE IF NOT EXISTS reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER REFERENCES users(id),
  movie_id INTEGER REFERENCES movies(id),
  rating REAL NOT NULL,
  content TEXT,
  type TEXT DEFAULT 'short',
  likes INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS coupons (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER REFERENCES users(id),
  type TEXT NOT NULL,
  value REAL NOT NULL,
  min_amount REAL DEFAULT 0,
  used INTEGER DEFAULT 0,
  expires_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_movies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER REFERENCES users(id),
  movie_id INTEGER REFERENCES movies(id),
  status TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, movie_id)
);

CREATE TABLE IF NOT EXISTS achievements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER REFERENCES users(id),
  type TEXT NOT NULL,
  unlocked_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
`;

db.exec(tables);
console.log('数据库表创建完成');
