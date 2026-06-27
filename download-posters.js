/**
 * 下载电影海报到本地
 * 使用方法: node download-posters.js
 * 需要能访问外网（VPN/代理）
 */
const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

const POSTERS_DIR = path.join(__dirname, 'public/posters');

const movies = [
  { id: 1, file: '1.jpg', url: 'https://upload.wikimedia.org/wikipedia/en/1/1b/The_Wandering_Earth_film_poster.jpg' },
  { id: 2, file: '2.jpg', url: 'https://upload.wikimedia.org/wikipedia/en/d/d2/Creation_of_the_Gods_I_Kingdom_of_Storms.jpg' },
  { id: 3, file: '3.jpg', url: 'https://upload.wikimedia.org/wikipedia/en/a/a6/Full_River_Red_Poster.jpg' },
  { id: 4, file: '4.webp', url: 'https://upload.wikimedia.org/wikipedia/en/0/01/Lost_in_the_Stars_2023.webp' },
  { id: 5, file: '5.jpeg', url: 'https://upload.wikimedia.org/wikipedia/en/5/51/Detective_Chinatown_poster.jpeg' },
  { id: 6, file: '6.jpg', url: 'https://upload.wikimedia.org/wikipedia/en/a/a8/HELLOWORLD.jpg' },
  { id: 7, file: '7.jpg', url: 'https://upload.wikimedia.org/wikipedia/en/7/76/Kungfupanda.jpg' },
  { id: 8, file: '8.jpg', url: 'https://upload.wikimedia.org/wikipedia/en/2/2d/The_Fate_of_The_Furious_Theatrical_Poster.jpg' },
  { id: 9, file: '9.webp', url: 'https://upload.wikimedia.org/wikipedia/en/6/6d/Chang%27an.webp' },
  { id: 10, file: '10.jpg', url: 'https://upload.wikimedia.org/wikipedia/en/9/99/Deep_Sea_2023_poster.jpg' },
];

function download(url, dest) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const req = client.get(url, { timeout: 15000 }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return download(res.headers.location, dest).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode}`));
      }
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        const buf = Buffer.concat(chunks);
        fs.writeFileSync(dest, buf);
        resolve(buf.length);
      });
      res.on('error', reject);
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
  });
}

async function main() {
  if (!fs.existsSync(POSTERS_DIR)) fs.mkdirSync(POSTERS_DIR, { recursive: true });

  let ok = 0, fail = 0;
  for (const m of movies) {
    const dest = path.join(POSTERS_DIR, m.file);
    try {
      const size = await download(m.url, dest);
      console.log(`✓ ${m.file} (${size} bytes)`);
      ok++;
    } catch (e) {
      console.log(`✗ ${m.file} - ${e.message}`);
      fail++;
    }
  }
  console.log(`\n完成: ${ok} 成功, ${fail} 失败`);
  if (ok > 0) console.log('记得重新运行 npm run seed 更新数据库');
}

main();
