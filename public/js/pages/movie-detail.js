import api from '../api.js';

export async function renderMovieDetail(container, params) {
  container.innerHTML = '<div class="loading">加载中...</div>';

  try {
    const movie = await api.get(`/movies/${params.id}`);
    const schedules = await api.get(`/schedules?movie_id=${params.id}`);

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
      <div class="card" style="display:flex; gap:30px;">
        <img src="${movie.poster}" style="width:250px; border-radius:8px;"
             onerror="this.src='https://via.placeholder.com/250x375?text=${encodeURIComponent(movie.title)}'">
        <div>
          <h1 style="margin-bottom:10px;">${movie.title}</h1>
          <p style="color:#666; margin-bottom:5px;">${genre} | ${movie.region} | ${movie.duration}分钟 | ${movie.year}</p>
          <p style="margin-bottom:5px;">导演: ${movie.director}</p>
          <p style="margin-bottom:5px;">演员: ${actors}</p>
          <p style="margin-bottom:15px; font-size:24px; color:#e63946;">⭐ ${movie.rating.toFixed(1)} <span style="font-size:14px; color:#999;">(${movie.review_count}条评价)</span></p>
          <p style="color:#666; margin-bottom:15px;">${movie.description}</p>
          <div>
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
                <a href="#/book/${s.id}" class="btn btn-outline" style="text-decoration:none;">
                  ${s.show_time.split(' ')[1]} ${s.hall_name} ¥${s.price}
                </a>
              `).join('')}
            </div>
          </div>
        `).join('')}
      </div>

      <div class="card">
        <h2 style="margin-bottom:15px;">观众评价</h2>
        <div id="reviews-list"></div>
      </div>
    `;

    // Mock reviews display
    document.getElementById('reviews-list').innerHTML = [
      { nickname: '影迷小王', rating: 9.5, content: '非常好看，强烈推荐！' },
      { nickname: '电影达人', rating: 8.0, content: '剧情紧凑，特效震撼' },
      { nickname: '路人甲', rating: 7.5, content: '还不错，值得一看' },
    ].map(r => `
      <div style="padding:15px 0; border-bottom:1px solid #eee;">
        <div style="display:flex; justify-content:space-between;">
          <span><strong>${r.nickname}</strong> ⭐ ${r.rating}</span>
        </div>
        <p style="margin-top:5px; color:#666;">${r.content}</p>
      </div>
    `).join('');

  } catch (err) {
    container.innerHTML = `<div class="error">加载失败: ${err.message}</div>`;
  }
}

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
