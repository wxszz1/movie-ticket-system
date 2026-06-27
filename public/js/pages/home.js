import api from '../api.js';

export async function renderHome(container) {
  container.innerHTML = '<div class="loading">加载中...</div>';

  try {
    const [hotMovies, nowPlaying] = await Promise.all([
      api.get('/movies/hot'),
      api.get('/movies?status=playing&limit=12'),
    ]);

    container.innerHTML = `
      <div class="card">
        <h2>🔥 热门推荐</h2>
        <div class="movie-grid" id="hot-list"></div>
      </div>
      <div class="card">
        <h2>🎬 正在热映</h2>
        <div class="movie-grid" id="now-playing"></div>
      </div>
      <div class="card">
        <h2>🎬 即将上映</h2>
        <div class="movie-grid" id="upcoming"></div>
      </div>
    `;

    renderMovieList(document.getElementById('hot-list'), hotMovies);
    renderMovieList(document.getElementById('now-playing'), nowPlaying.movies);

    const upcoming = await api.get('/movies?status=upcoming&limit=6');
    renderMovieList(document.getElementById('upcoming'), upcoming.movies);
  } catch (err) {
    container.innerHTML = `<div class="error">加载失败: ${err.message}</div>`;
  }
}

function renderMovieList(container, movies) {
  if (!movies || movies.length === 0) {
    container.innerHTML = '<p style="color:#999;">暂无影片</p>';
    return;
  }
  container.innerHTML = movies.map(movie => {
    const genre = (movie.genre || '').split(',').slice(0, 2).join(' / ');
    return `
      <div class="movie-card" onclick="location.hash='#/movie/${movie.id}'">
        <img src="${movie.poster}" alt="${movie.title}" onerror="this.src='/posters/${movie.id}.svg'">
        <div class="info">
          <div class="title">${movie.title}</div>
          <div class="meta">${genre} | ${movie.region}</div>
          <div class="meta">⭐ ${movie.rating.toFixed(1)}</div>
        </div>
      </div>
    `;
  }).join('');
}
