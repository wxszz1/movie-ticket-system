const db = require('./db');
const crypto = require('crypto');

function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

// 清空所有数据（重置自增ID计数器）
const tables = ['achievements', 'user_movies', 'coupons', 'reviews', 'orders', 'schedules', 'seats', 'halls', 'cinemas', 'movies', 'users'];
for (const table of tables) {
  db.prepare(`DELETE FROM ${table}`).run();
}
// 重置 AUTOINCREMENT 计数器
for (const table of tables) {
  db.prepare(`DELETE FROM sqlite_sequence WHERE name = ?`).run(table);
}

console.log('已清空所有数据');

// 1. 创建管理员用户
const adminHash = hashPassword('admin123');
db.prepare(
  'INSERT INTO users (phone, password_hash, nickname, role) VALUES (?, ?, ?, ?)'
).run('13800000000', adminHash, '管理员', 'admin');
console.log('创建管理员用户完成');

// 2. 创建20个普通用户
const insertUser = db.prepare(
  'INSERT INTO users (phone, password_hash, nickname, role, vip_level, points) VALUES (?, ?, ?, ?, ?, ?)'
);
const userHash = hashPassword('123456');
for (let i = 1; i <= 20; i++) {
  insertUser.run(
    `13800000${String(i).padStart(3, '0')}`,
    userHash,
    `用户${String(i).padStart(2, '0')}`,
    'user',
    Math.floor(Math.random() * 3),
    Math.floor(Math.random() * 500)
  );
}
console.log('创建20个用户完成');

// 3. 创建影院
const insertCinema = db.prepare(
  'INSERT INTO cinemas (name, address, phone, facilities) VALUES (?, ?, ?, ?)'
);
insertCinema.run('星光国际影城', '北京市朝阳区建国路88号', '010-88881111', JSON.stringify(['IMAX', '杜比全景声', '4DX', '免费停车']));
insertCinema.run('万达影城', '北京市海淀区中关村大街100号', '010-66662222', JSON.stringify(['IMAX', '杜比影厅', '儿童厅', '按摩椅']));
console.log('创建2家影院完成');

// 4. 创建影厅（每个影院3个）
const insertHall = db.prepare(
  'INSERT INTO halls (cinema_id, name, type, total_seats, layout_config) VALUES (?, ?, ?, ?, ?)'
);
const insertSeat = db.prepare(
  'INSERT INTO seats (hall_id, row, col, type) VALUES (?, ?, ?, ?)'
);

function createHallWithSeats(cinemaId, name, type, rows, cols) {
  const totalSeats = rows * cols;
  const layoutConfig = JSON.stringify({ rows, cols, types: { vip: '1-2,3-5', normal: '6-10' } });
  const result = insertHall.run(cinemaId, name, type, totalSeats, layoutConfig);
  const hallId = result.lastInsertRowid;

  for (let r = 1; r <= rows; r++) {
    for (let c = 1; c <= cols; c++) {
      let seatType = 'normal';
      if (r <= 2) seatType = 'vip';
      else if (r === rows) seatType = 'disabled';
      insertSeat.run(hallId, r, c, seatType);
    }
  }
  return hallId;
}

const hallIds = [];
// 影院1
hallIds.push(createHallWithSeats(1, '1号IMAX厅', 'IMAX', 10, 20));
hallIds.push(createHallWithSeats(1, '2号杜比厅', '杜比', 8, 16));
hallIds.push(createHallWithSeats(1, '3号普通厅', '普通', 8, 12));
// 影院2
hallIds.push(createHallWithSeats(2, '1号IMAX厅', 'IMAX', 10, 20));
hallIds.push(createHallWithSeats(2, '2号杜比厅', '杜比', 8, 16));
hallIds.push(createHallWithSeats(2, '3号普通厅', '普通', 8, 12));
console.log('创建6个影厅和座位完成');

// 5. 创建电影
const insertMovie = db.prepare(
  'INSERT INTO movies (title, poster, director, actors, genre, region, year, duration, rating, description, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
);

const moviesData = [
  ['流浪地球3', '/posters/1.jpg', '郭帆', '吴京,刘德华,李雪健', '科幻', '中国大陆', 2026, 150, 9.2, '太阳即将毁灭，人类带着地球逃离太阳系寻找新家园。', 'playing'],
  ['封神第三部', '/posters/2.jpg', '乌尔善', '费翔,李雪健,黄渤', '奇幻', '中国大陆', 2026, 145, 8.8, '殷商末年，天下大乱，各路神仙妖怪纷纷登场。', 'playing'],
  ['满江红2', '/posters/3.jpg', '张艺谋', '沈腾,易烊千玺,雷佳音', '悬疑', '中国大陆', 2026, 135, 8.5, '南宋绍兴年间，一桩惊天阴谋在岳飞府中展开。', 'playing'],
  ['消失的她2', '/posters/4.jpg', '陈思诚', '朱一龙,倪妮,文咏珊', '悬疑', '中国大陆', 2026, 120, 8.0, '一对夫妻在海岛度假时，妻子突然消失。', 'playing'],
  ['唐人街探案4', '/posters/5.jpg', '陈思诚', '王宝强,刘昊然,妻夫木聪', '喜剧', '中国大陆', 2026, 130, 7.8, '唐仁和秦风再次踏上探案之旅。', 'playing'],
  ['你好世界', '/posters/6.jpg', '伊藤智彦', '北村匠海,松坂桃李', '爱情', '日本', 2026, 98, 8.3, '一个发生在京都的青春爱情故事。', 'playing'],
  ['功夫熊猫5', '/posters/7.jpg', '迈克·米切尔', '杰克·布莱克,安吉丽娜·朱莉', '动画', '美国', 2026, 95, 8.1, '阿宝再次踏上冒险之旅保护和平谷。', 'playing'],
  ['速度与激情11', '/posters/8.jpg', '林诣彬', '范·迪塞尔,杰森·莫玛', '动作', '美国', 2026, 140, 7.5, '多姆和他的团队面临最终极的挑战。', 'upcoming'],
  ['长安三万里2', '/posters/9.jpg', '谢君伟', '（配音）', '动画', '中国大陆', 2026, 160, 0, '盛唐诗人高适回忆与李白的友情故事。', 'upcoming'],
  ['深海2', '/posters/10.jpg', '田晓鹏', '（配音）', '动画', '中国大陆', 2026, 115, 0, '少女在深海世界的奇幻冒险继续。', 'upcoming'],
];

for (const m of moviesData) {
  insertMovie.run(...m);
}
console.log('创建10部电影完成');

// 6. 创建排片（只为上映状态的电影创建）
const insertSchedule = db.prepare(
  'INSERT INTO schedules (movie_id, hall_id, show_time, price, member_price, status) VALUES (?, ?, ?, ?, ?, ?)'
);
const playingMovieIds = [1, 2, 3, 4, 5, 6, 7];
const showTimes = ['10:00', '12:30', '14:00', '16:30', '19:00', '21:00'];
const prices = { 1: 60, 2: 55, 3: 50, 4: 45, 5: 40, 6: 35, 7: 38 };

let scheduleCount = 0;
for (const movieId of playingMovieIds) {
  for (const hallId of hallIds) {
    // 每部电影在每个厅安排2-3场
    const timesForHall = showTimes.slice(0, 2 + Math.floor(Math.random() * 2));
    for (const time of timesForHall) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const showTime = `${tomorrow.toISOString().split('T')[0]} ${time}`;
      const price = prices[movieId] + Math.floor(Math.random() * 10);
      const memberPrice = Math.round(price * 0.85 * 100) / 100;
      insertSchedule.run(movieId, hallId, showTime, price, memberPrice, 'available');
      scheduleCount++;
    }
  }
}
console.log(`创建${scheduleCount}条排片完成`);

// 7. 创建影评
const insertReview = db.prepare(
  'INSERT INTO reviews (user_id, movie_id, rating, content, type) VALUES (?, ?, ?, ?, ?)'
);
const reviewContents = [
  '非常精彩，视觉效果震撼！',
  '剧情紧凑，演员演技在线。',
  '值得一看，推荐给朋友。',
  '特效很棒，故事稍显薄弱。',
  '超乎预期，强烈推荐！',
  '一般般，没什么新意。',
  '画面很美，音乐也很好听。',
  '期待已久，没有失望。',
  '适合全家一起观看。',
  '节奏有点慢，但结局不错。',
];

let reviewCount = 0;
for (let userId = 2; userId <= 21; userId++) {
  // 每个用户评价2-4部电影
  const reviewedMovies = new Set();
  const numReviews = 2 + Math.floor(Math.random() * 3);
  for (let r = 0; r < numReviews; r++) {
    const movieId = 1 + Math.floor(Math.random() * 7);
    if (reviewedMovies.has(movieId)) continue;
    reviewedMovies.add(movieId);
    const rating = 6 + Math.random() * 4; // 6.0 - 10.0
    const content = reviewContents[Math.floor(Math.random() * reviewContents.length)];
    insertReview.run(userId, movieId, Math.round(rating * 10) / 10, content, 'short');
    reviewCount++;
  }
}
console.log(`创建${reviewCount}条影评完成`);

// 8. 创建优惠券
const insertCoupon = db.prepare(
  'INSERT INTO coupons (user_id, type, value, min_amount, used, expires_at) VALUES (?, ?, ?, ?, ?, ?)'
);
const couponTypes = [
  { type: 'discount', value: 5, min_amount: 0 },
  { type: 'discount', value: 10, min_amount: 30 },
  { type: 'discount', value: 20, min_amount: 60 },
  { type: 'free_food', value: 15, min_amount: 20 },
];

let couponCount = 0;
for (let userId = 2; userId <= 21; userId++) {
  // 每个用户发1-3张券
  const numCoupons = 1 + Math.floor(Math.random() * 3);
  for (let c = 0; c < numCoupons; c++) {
    const coupon = couponTypes[Math.floor(Math.random() * couponTypes.length)];
    const expiresDate = new Date();
    expiresDate.setDate(expiresDate.getDate() + 30 + Math.floor(Math.random() * 60));
    insertCoupon.run(userId, coupon.type, coupon.value, coupon.min_amount, 0, expiresDate.toISOString());
    couponCount++;
  }
}
console.log(`创建${couponCount}张优惠券完成`);

console.log('\n=== 种子数据创建完成 ===');
