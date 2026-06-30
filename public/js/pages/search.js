import api from '../api.js';

export async function renderSearch(container) {
  const params = new URLSearchParams(window.location.hash.split('?')[1]);
  const query = params.get('q') || '';

  if (!query) {
    container.innerHTML = `
      <div class="empty-state">
        <h2>请输入搜索关键词</h2>
        <a href="#/" class="btn btn-primary">返回首页</a>
      </div>
    `;
    return;
  }

  container.innerHTML = '<div class="loading">搜索中...</div>';

  try {
    const result = await api.get(`/movies?search=${encodeURIComponent(query)}&limit=50`);
    const movies = result.movies || [];

    container.innerHTML = `
      <div class="card">
        <h2 style="margin-bottom:15px;">搜索结果: "${query}" (${movies.length}部)</h2>
        ${movies.length === 0
          ? '<div class="empty-state"><p>没有找到相关影片</p><a href="#/" class="btn btn-primary">返回首页</a></div>'
          : `<div class="movie-grid" id="search-results"></div>`
        }
      </div>
    `;

    if (movies.length > 0) {
      const grid = document.getElementById('search-results');
      grid.innerHTML = movies.map(movie => {
        const genre = (movie.genre || '').split(',').slice(0, 2).join(' / ');
        const ratingHtml = movie.rating > 0
          ? `<span class="rating-badge">⭐ ${movie.rating.toFixed(1)}</span>`
          : '';
        return `
          <div class="movie-card" onclick="location.hash='#/movie/${movie.id}'" style="cursor:pointer;">
            <div class="poster-wrap">
              ${ratingHtml}
              <img src="${movie.poster}" alt="${movie.title}" onerror="this.src='/posters/${movie.id}.svg'">
            </div>
            <div class="movie-info">
              <div class="movie-title">${movie.title}</div>
              <div class="movie-meta">${genre} | ${movie.region || ''} | ${movie.year || ''}</div>
              <div class="movie-meta" style="color:#999;">${movie.director || ''}</div>
            </div>
          </div>
        `;
      }).join('');
    }
  } catch (err) {
    container.innerHTML = `<div class="error">搜索失败: ${err.message}</div>`;
  }
}
