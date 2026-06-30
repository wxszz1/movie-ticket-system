import api from '../api.js';

export async function renderHome(container) {
  container.innerHTML = '<div class="loading">加载中...</div>';

  try {
    const [hotMovies, nowPlaying, upcoming, recommendData] = await Promise.all([
      api.get('/movies/hot'),
      api.get('/movies?status=playing&limit=10'),
      api.get('/movies?status=upcoming&limit=6'),
      api.get('/recommend/home').catch(() => []),
    ]);

    const hero = hotMovies[0];
    const genre = (hero.genre || '').split(',').slice(0, 2).join(' / ');
    const isLoggedIn = window.__appState?.user;

    container.innerHTML = `
      <div class="hero-banner" onclick="location.hash='#/movie/${hero.id}'" style="cursor:pointer;">
        <div class="hero-bg" style="background-image:url('${hero.poster}')"></div>
        <div class="hero-content">
          <img class="hero-poster" src="${hero.poster}" alt="${hero.title}">
          <div class="hero-info">
            <h1>${hero.title}</h1>
            <div class="hero-meta">${genre} | ${hero.region} | ${hero.year} | ${hero.duration}分钟</div>
            <div class="hero-rating">⭐ ${hero.rating.toFixed(1)}</div>
            <div class="hero-desc">${hero.description || ''}</div>
            <button class="btn btn-primary" onclick="event.stopPropagation();location.hash='#/movie/${hero.id}'">立即购票</button>
          </div>
        </div>
      </div>

      ${isLoggedIn && recommendData.length > 0 ? `
        <div class="section">
          <div class="section-header">
            <h2>💡 猜你喜欢</h2>
            <span class="more" style="color:#e94560; font-size:0.85rem;">根据你的观影偏好推荐</span>
          </div>
          <div class="movie-grid" id="recommend-list"></div>
        </div>
      ` : ''}

      <div class="section">
        <div class="section-header">
          <h2>🔥 热门推荐</h2>
        </div>
        <div class="movie-grid" id="hot-list"></div>
      </div>

      <div class="section">
        <div class="section-header">
          <h2>🎬 正在热映</h2>
        </div>
        <div class="movie-grid" id="now-playing"></div>
      </div>

      <div class="section">
        <div class="section-header">
          <h2>📅 即将上映</h2>
        </div>
        <div class="movie-grid" id="upcoming"></div>
      </div>
    `;

    if (isLoggedIn && recommendData.length > 0) {
      renderMovieList(document.getElementById('recommend-list'), recommendData.slice(0, 5));
    }
    renderMovieList(document.getElementById('hot-list'), hotMovies.slice(1, 6));
    renderMovieList(document.getElementById('now-playing'), nowPlaying.movies);
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
    const ratingHtml = movie.rating > 0
      ? `<span class="rating-badge">⭐ ${movie.rating.toFixed(1)}</span>`
      : '';
    return `
      <div class="movie-card" onclick="location.hash='#/movie/${movie.id}'">
        <div class="poster-wrap">
          ${ratingHtml}
          <img src="${movie.poster}" alt="${movie.title}" onerror="this.src='/posters/${movie.id}.svg'">
        </div>
        <div class="movie-info">
          <div class="movie-title">${movie.title}</div>
          <div class="movie-meta">${genre} | ${movie.region}</div>
        </div>
      </div>
    `;
  }).join('');
}
