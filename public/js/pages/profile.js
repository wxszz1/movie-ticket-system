import api from '../api.js';

const VIP_LABELS = ['普通会员', 'VIP会员', '超级VIP'];
const VIP_COLORS = ['#999', '#e94560', '#ff6b35'];

/**
 * Render the user profile page.
 */
export async function renderProfile(container) {
  // Check login
  if (!window.__appState || !window.__appState.user) {
    container.innerHTML = `
      <div class="empty-state">
        <h2>请先登录</h2>
        <p>您需要登录后才能查看个人中心</p>
        <a href="#/login" class="btn btn-primary">去登录</a>
      </div>
    `;
    return;
  }

  container.innerHTML = '<div class="loading">加载中...</div>';

  try {
    const [profile, wantMovies] = await Promise.all([
      api.get('/users/profile'),
      api.get('/users/movies?status=want').catch(() => []),
    ]);

    // Try fetching coupons (API may not exist yet)
    let coupons = [];
    try {
      coupons = await api.get('/coupons');
    } catch {
      coupons = [];
    }

    renderProfilePage(container, profile, coupons, wantMovies);
  } catch (err) {
    container.innerHTML = `<div class="error-message">加载失败: ${err.message}</div>`;
  }
}

function renderProfilePage(container, profile, coupons, wantMovies) {
  const vipLevel = profile.vip_level || 0;
  const vipLabel = VIP_LABELS[vipLevel] || '普通会员';
  const vipColor = VIP_COLORS[vipLevel] || '#999';
  const avatarUrl = profile.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.nickname || profile.email || 'U')}&background=e94560&color=fff&size=120`;

  container.innerHTML = `
    <div class="profile-page">
      <!-- User Info Card -->
      <div class="card profile-header">
        <div class="profile-info">
          <img class="profile-avatar" src="${avatarUrl}" alt="头像"
               onerror="this.src='https://ui-avatars.com/api/?name=U&background=e94560&color=fff&size=120'">
          <div class="profile-details">
            <h2 class="profile-name">${profile.nickname || profile.email || '未设置昵称'}</h2>
            <div class="profile-meta">
              <span class="badge" style="background:${vipColor}20;color:${vipColor}">${vipLabel}</span>
              <span class="profile-points">积分: ${profile.points || 0}</span>
            </div>
            <div class="profile-meta">
              ${profile.phone ? `<span>手机: ${maskPhone(profile.phone)}</span>` : ''}
              ${profile.email ? `<span>邮箱: ${profile.email}</span>` : ''}
            </div>
          </div>
        </div>
      </div>

      <!-- Check-in -->
      <div class="card profile-section">
        <div class="profile-section-header">
          <h3>每日签到</h3>
          <button class="btn btn-primary btn-sm" id="checkin-btn">签到 +2积分</button>
        </div>
        <div id="checkin-message"></div>
      </div>

      <!-- Coupons -->
      <div class="card profile-section">
        <h3>我的优惠券</h3>
        <div id="coupons-list">
          ${coupons.length === 0
            ? '<p class="empty-hint">暂无优惠券</p>'
            : coupons.map(renderCoupon).join('')
          }
        </div>
      </div>

      <!-- Want-to-see Movies -->
      <div class="card profile-section">
        <h3>想看的电影</h3>
        <div id="want-movies-list">
          ${wantMovies.length === 0
            ? '<p class="empty-hint">暂无想看的电影</p>'
            : `<div class="movie-grid">${wantMovies.map(renderWantMovie).join('')}</div>`
          }
        </div>
      </div>

      <!-- Profile Edit Form -->
      <div class="card profile-section">
        <h3>编辑资料</h3>
        <div id="profile-edit-message"></div>
        <form id="profile-edit-form">
          <div class="form-group">
            <label for="edit-nickname">昵称</label>
            <input type="text" id="edit-nickname" value="${escapeAttr(profile.nickname || '')}" placeholder="请输入昵称">
          </div>
          <div class="form-group">
            <label for="edit-email">邮箱</label>
            <input type="email" id="edit-email" value="${escapeAttr(profile.email || '')}" placeholder="请输入邮箱">
          </div>
          <button type="submit" class="btn btn-primary" id="save-profile-btn">保存修改</button>
        </form>
      </div>
    </div>
  `;

  // Bind check-in
  document.getElementById('checkin-btn').addEventListener('click', handleCheckin);

  // Bind profile edit
  document.getElementById('profile-edit-form').addEventListener('submit', (e) => {
    e.preventDefault();
    handleProfileEdit(profile);
  });
}

async function handleCheckin() {
  const btn = document.getElementById('checkin-btn');
  const msgDiv = document.getElementById('checkin-message');
  btn.disabled = true;
  btn.textContent = '签到中...';

  try {
    const data = await api.post('/users/checkin');
    msgDiv.innerHTML = `<div class="success-message">${data.message}</div>`;
    btn.textContent = '已签到';
    btn.disabled = true;

    // Update points display in header
    const pointsEl = document.querySelector('.profile-points');
    if (pointsEl && data.points != null) {
      pointsEl.textContent = `积分: ${data.points}`;
    }

    // Update local user state
    if (window.__appState && window.__appState.user) {
      window.__appState.user.points = data.points;
      localStorage.setItem('user', JSON.stringify(window.__appState.user));
    }
  } catch (err) {
    msgDiv.innerHTML = `<div class="error-message">${err.message || '签到失败'}</div>`;
    btn.disabled = false;
    btn.textContent = '签到 +2积分';
  }
}

async function handleProfileEdit(originalProfile) {
  const nickname = document.getElementById('edit-nickname').value.trim();
  const email = document.getElementById('edit-email').value.trim();
  const msgDiv = document.getElementById('profile-edit-message');
  const btn = document.getElementById('save-profile-btn');

  btn.disabled = true;
  btn.textContent = '保存中...';

  try {
    const body = {};
    if (nickname !== (originalProfile.nickname || '')) body.nickname = nickname;
    if (email !== (originalProfile.email || '')) body.email = email;

    if (Object.keys(body).length === 0) {
      msgDiv.innerHTML = '<div class="success-message">没有修改内容</div>';
      btn.disabled = false;
      btn.textContent = '保存修改';
      return;
    }

    const updated = await api.put('/users/profile', body);
    msgDiv.innerHTML = '<div class="success-message">资料已更新</div>';

    // Update local state
    if (window.__appState && window.__appState.user) {
      Object.assign(window.__appState.user, updated);
      localStorage.setItem('user', JSON.stringify(window.__appState.user));
      // Update navbar display
      if (window.__appState.user.nickname) {
        const navUsername = document.getElementById('nav-username');
        if (navUsername) navUsername.textContent = window.__appState.user.nickname;
      }
    }
  } catch (err) {
    msgDiv.innerHTML = `<div class="error-message">${err.message || '更新失败'}</div>`;
  } finally {
    btn.disabled = false;
    btn.textContent = '保存修改';
  }
}

function renderCoupon(coupon) {
  const expireText = coupon.expire_at
    ? `有效期至 ${new Date(coupon.expire_at).toLocaleDateString()}`
    : '无期限';
  return `
    <div class="coupon-item">
      <div class="coupon-value">${coupon.value || coupon.discount || '--'}</div>
      <div class="coupon-info">
        <span class="coupon-type">${coupon.type || '优惠券'}</span>
        <span class="coupon-expire">${expireText}</span>
      </div>
    </div>
  `;
}

function renderWantMovie(movie) {
  const genre = (movie.genre || '').split(',').slice(0, 2).join(' / ');
  return `
    <div class="movie-card" onclick="location.hash='#/movie/${movie.id}'">
      <img class="movie-poster" src="${movie.poster}" alt="${movie.title}"
           onerror="this.src='https://via.placeholder.com/300x450?text=${encodeURIComponent(movie.title)}'">
      <div class="movie-info">
        <div class="movie-title">${movie.title}</div>
        <div class="movie-meta">${genre} | ${movie.region || ''}</div>
        ${movie.rating ? `<div class="movie-rating">⭐ ${Number(movie.rating).toFixed(1)}</div>` : ''}
      </div>
    </div>
  `;
}

function maskPhone(phone) {
  if (!phone || phone.length < 7) return phone;
  return phone.slice(0, 3) + '****' + phone.slice(-4);
}

function escapeAttr(str) {
  return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
