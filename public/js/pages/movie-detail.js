import api from '../api.js';

let currentMovieId = null;

export async function renderMovieDetail(container, params) {
  currentMovieId = params.id;
  container.innerHTML = '<div class="loading">加载中...</div>';

  try {
    const [movie, schedules, reviews, similarMovies] = await Promise.all([
      api.get(`/movies/${params.id}`),
      api.get(`/schedules?movie_id=${params.id}`),
      api.get(`/reviews/movie/${params.id}`).catch(() => []),
      api.get(`/recommend/similar/${params.id}`).catch(() => []),
    ]);

    const genre = movie.genre || '';
    const actors = movie.actors || '';

    // Group schedules by cinema
    const grouped = {};
    schedules.forEach(s => {
      if (!grouped[s.cinema_name]) {
        grouped[s.cinema_name] = { address: s.address, shows: [] };
      }
      grouped[s.cinema_name].shows.push(s);
    });

    container.innerHTML = `
      <div class="card movie-detail-header" style="display:flex; gap:30px;">
        <img src="${movie.poster}" style="width:250px; border-radius:8px; flex-shrink:0;"
             onerror="this.src='/posters/${movie.id}.svg'">
        <div>
          <h1 style="margin-bottom:10px;">${movie.title}</h1>
          <p style="color:#666; margin-bottom:5px;">${genre} | ${movie.region} | ${movie.duration}分钟 | ${movie.year}</p>
          <p style="margin-bottom:5px;">导演: ${movie.director}</p>
          <p style="margin-bottom:5px;">演员: ${actors}</p>
          <p style="margin-bottom:15px; font-size:24px; color:#e63946;">⭐ ${movie.rating.toFixed(1)} <span style="font-size:14px; color:#999;">(${movie.review_count}条评价)</span></p>
          <p style="color:#666; margin-bottom:15px;">${movie.description}</p>
          <div style="display:flex; gap:10px;">
            <button class="btn btn-primary" onclick="markMovie(${movie.id}, 'want')">想看</button>
            <button class="btn btn-outline" onclick="markMovie(${movie.id}, 'saw')">看过</button>
          </div>
        </div>
      </div>

      <div class="card">
        <h2 style="margin-bottom:15px;">选择场次</h2>
        ${Object.keys(grouped).length === 0 ? '<p style="color:#999;">暂无排片</p>' : ''}
        ${Object.entries(grouped).map(([name, data]) => `
          <div style="margin-bottom:20px;">
            <h3>${name}</h3>
            <p style="font-size:13px; color:#999; margin-bottom:10px;">${data.address}</p>
            <div style="display:flex; gap:10px; flex-wrap:wrap;">
              ${data.shows.map(s => `
                <a href="#/book/${s.id}" class="btn btn-outline schedule-btn" style="text-decoration:none;">
                  ${s.show_time.split(' ')[1]} ${s.hall_name} ¥${s.price}
                </a>
              `).join('')}
            </div>
          </div>
        `).join('')}
      </div>

      <div class="card">
        <h2 style="margin-bottom:15px;">观众评价 (${reviews.length})</h2>
        <div id="reviews-list">
          ${reviews.length === 0 ? '<p style="color:#999; text-align:center; padding:20px;">暂无评价，快来发表第一条吧</p>' : ''}
          ${reviews.map(r => renderReviewItem(r)).join('')}
        </div>
      </div>

      <div class="card">
        <h2 style="margin-bottom:15px;">发表评价</h2>
        <div id="review-form-area">
          ${window.__appState?.user
            ? `<div id="review-form">
                <div style="margin-bottom:12px;">
                  <label style="display:block; margin-bottom:6px; color:#666;">评分</label>
                  <div id="rating-stars" style="display:flex; gap:4px; font-size:24px; cursor:pointer;">
                    ${[1,2,3,4,5,6,7,8,9,10].map(i => `<span class="star" data-rating="${i}" style="color:#ddd;">★</span>`).join('')}
                  </div>
                  <span id="rating-value" style="color:#999; font-size:13px;">请点击评分</span>
                </div>
                <div class="form-group">
                  <textarea id="review-content" rows="3" placeholder="写下你的短评..." style="width:100%; padding:10px; border:1px solid #ddd; border-radius:6px; resize:vertical;"></textarea>
                </div>
                <button class="btn btn-primary" id="submit-review-btn" onclick="submitReview()">发表评价</button>
              </div>`
            : '<p style="color:#999;"><a href="#/login" style="color:#e94560;">登录</a>后即可发表评价</p>'
          }
        </div>
      </div>

      ${similarMovies.length > 0 ? `
        <div class="card">
          <h2 style="margin-bottom:15px;">相似影片推荐</h2>
          <div class="movie-grid" id="similar-movies"></div>
        </div>
      ` : ''}
    `;

    // Render similar movies
    if (similarMovies.length > 0) {
      const similarEl = document.getElementById('similar-movies');
      if (similarEl) {
        similarEl.innerHTML = similarMovies.map(m => {
          const g = (m.genre || '').split(',').slice(0, 2).join(' / ');
          return `
            <div class="movie-card" onclick="location.hash='#/movie/${m.id}'" style="cursor:pointer;">
              <div class="poster-wrap">
                ${m.rating > 0 ? `<span class="rating-badge">⭐ ${m.rating.toFixed(1)}</span>` : ''}
                <img src="${m.poster}" alt="${m.title}" onerror="this.src='/posters/${m.id}.svg'">
              </div>
              <div class="movie-info">
                <div class="movie-title">${m.title}</div>
                <div class="movie-meta">${g} | ${m.region}</div>
              </div>
            </div>
          `;
        }).join('');
      }
    }

    // Bind star rating
    bindStarRating();

  } catch (err) {
    container.innerHTML = `<div class="error">加载失败: ${err.message}</div>`;
  }
}

function renderReviewItem(r) {
  const stars = '★'.repeat(Math.round(r.rating / 2)) + '☆'.repeat(10 - Math.round(r.rating));
  const time = r.created_at ? new Date(r.created_at).toLocaleDateString() : '';
  return `
    <div style="padding:15px 0; border-bottom:1px solid #f0f0f0;">
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <div style="display:flex; align-items:center; gap:8px;">
          <img src="${r.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(r.nickname || 'U')}&background=e94560&color=fff&size=32`}" style="width:32px; height:32px; border-radius:50%;">
          <div>
            <strong>${r.nickname || '匿名用户'}</strong>
            <span style="color:#e63946; margin-left:8px;">${r.rating.toFixed(1)}分</span>
          </div>
        </div>
        <span style="color:#999; font-size:12px;">${time}</span>
      </div>
      <p style="margin-top:8px; color:#555; line-height:1.6;">${r.content || ''}</p>
    </div>
  `;
}

function bindStarRating() {
  const starsContainer = document.getElementById('rating-stars');
  if (!starsContainer) return;

  let selectedRating = 0;

  starsContainer.addEventListener('click', (e) => {
    const star = e.target.closest('.star');
    if (!star) return;
    selectedRating = parseInt(star.dataset.rating, 10);
    updateStars(selectedRating);
    document.getElementById('rating-value').textContent = `评分: ${selectedRating}分`;
  });

  starsContainer.addEventListener('mouseover', (e) => {
    const star = e.target.closest('.star');
    if (!star) return;
    const hoverRating = parseInt(star.dataset.rating, 10);
    updateStars(hoverRating);
  });

  starsContainer.addEventListener('mouseout', () => {
    updateStars(selectedRating);
  });

  function updateStars(rating) {
    starsContainer.querySelectorAll('.star').forEach(s => {
      const r = parseInt(s.dataset.rating, 10);
      s.style.color = r <= rating ? '#e63946' : '#ddd';
    });
  }

  // Store rating getter globally
  window.__getReviewRating = () => selectedRating;
}

window.submitReview = async () => {
  if (!window.__appState?.user) {
    alert('请先登录');
    return;
  }

  const rating = window.__getReviewRating?.();
  if (!rating || rating < 1) {
    alert('请选择评分');
    return;
  }

  const content = document.getElementById('review-content')?.value?.trim() || '';
  const btn = document.getElementById('submit-review-btn');

  btn.disabled = true;
  btn.textContent = '提交中...';

  try {
    await api.post('/reviews', {
      movie_id: parseInt(currentMovieId, 10),
      rating,
      content,
      type: 'short',
    });
    alert('评价成功！获得5积分');
    // Reload the page to show new review
    renderMovieDetail(document.getElementById('app-content'), { id: currentMovieId });
  } catch (err) {
    alert(err.message || '评价失败');
    btn.disabled = false;
    btn.textContent = '发表评价';
  }
};

// Global function for want/saw marking
window.markMovie = async (movieId, status) => {
  if (!window.__appState.user) {
    alert('请先登录');
    return;
  }
  try {
    await api.post('/users/user-movies', { movie_id: movieId, status });
    alert(status === 'want' ? '已标记想看' : '已标记看过');
  } catch (err) {
    alert(err.message);
  }
};
