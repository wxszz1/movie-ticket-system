import api from '../api.js';

/**
 * Render the admin management page.
 */
export async function renderAdmin(container) {
  // Check login
  if (!window.__appState || !window.__appState.user) {
    container.innerHTML = `
      <div class="empty-state">
        <h2>请先登录</h2>
        <p>您需要登录后才能访问后台管理</p>
        <a href="#/login" class="btn btn-primary">去登录</a>
      </div>
    `;
    return;
  }

  if (window.__appState.user.role !== 'admin') {
    container.innerHTML = `
      <div class="empty-state">
        <h2>无权限</h2>
        <p>您没有管理员权限</p>
        <a href="#/" class="btn btn-primary">返回首页</a>
      </div>
    `;
    return;
  }

  const tabs = [
    { key: 'dashboard', label: '数据看板' },
    { key: 'movies', label: '影片管理' },
    { key: 'schedules', label: '排片管理' },
    { key: 'orders', label: '订单管理' },
    { key: 'users', label: '用户管理' },
  ];

  container.innerHTML = `
    <div class="admin-layout">
      <div class="admin-sidebar">
        <div class="admin-sidebar-title">后台管理</div>
        ${tabs.map((t, i) => `
          <a href="javascript:void(0)" class="admin-tab ${i === 0 ? 'active' : ''}" data-tab="${t.key}">${t.label}</a>
        `).join('')}
      </div>
      <div class="admin-content" id="admin-content">
        <div class="loading">加载中...</div>
      </div>
    </div>
  `;

  // Bind sidebar tabs
  container.querySelectorAll('.admin-tab').forEach(tab => {
    tab.addEventListener('click', (e) => {
      e.preventDefault();
      container.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      loadTab(tab.dataset.tab);
    });
  });

  // Load dashboard by default
  loadTab('dashboard');
}

async function loadTab(tab) {
  const contentEl = document.getElementById('admin-content');
  if (!contentEl) return;

  contentEl.innerHTML = '<div class="loading">加载中...</div>';

  try {
    switch (tab) {
      case 'dashboard':
        await loadDashboard(contentEl);
        break;
      case 'movies':
        await loadMovies(contentEl);
        break;
      case 'schedules':
        await loadSchedules(contentEl);
        break;
      case 'orders':
        await loadOrders(contentEl);
        break;
      case 'users':
        await loadUsers(contentEl);
        break;
    }
  } catch (err) {
    contentEl.innerHTML = `<div class="error-message">加载失败: ${err.message}</div>`;
  }
}

/* ============================================================
   Dashboard Tab
   ============================================================ */
async function loadDashboard(el) {
  const data = await api.get('/admin/dashboard');

  el.innerHTML = `
    <h2 style="margin-bottom:24px">数据看板</h2>
    <div class="stat-cards" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:16px;margin-bottom:32px">
      <div class="stat-card card" style="text-align:center;padding:20px">
        <div style="font-size:28px;font-weight:bold;color:#e94560">${data.totalUsers}</div>
        <div style="color:#888;margin-top:8px">总用户数</div>
      </div>
      <div class="stat-card card" style="text-align:center;padding:20px">
        <div style="font-size:28px;font-weight:bold;color:#389e0d">${data.totalMovies}</div>
        <div style="color:#888;margin-top:8px">总影片数</div>
      </div>
      <div class="stat-card card" style="text-align:center;padding:20px">
        <div style="font-size:28px;font-weight:bold;color:#1677ff">${data.totalOrders}</div>
        <div style="color:#888;margin-top:8px">总订单数</div>
      </div>
      <div class="stat-card card" style="text-align:center;padding:20px">
        <div style="font-size:28px;font-weight:bold;color:#d48806">¥${(data.totalRevenue || 0).toFixed(2)}</div>
        <div style="color:#888;margin-top:8px">总收入</div>
      </div>
      <div class="stat-card card" style="text-align:center;padding:20px">
        <div style="font-size:28px;font-weight:bold;color:#722ed1">${data.todayOrders}</div>
        <div style="color:#888;margin-top:8px">今日订单</div>
      </div>
      <div class="stat-card card" style="text-align:center;padding:20px">
        <div style="font-size:28px;font-weight:bold;color:#eb2f96">¥${(data.todayRevenue || 0).toFixed(2)}</div>
        <div style="color:#888;margin-top:8px">今日收入</div>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:24px">
      <div class="card" style="padding:20px">
        <h3 style="margin-bottom:16px">用户增长趋势</h3>
        <div class="chart-container">
          <canvas id="user-growth-chart"></canvas>
        </div>
      </div>
      <div class="card" style="padding:20px">
        <h3 style="margin-bottom:16px">票房统计</h3>
        <div class="chart-container">
          <canvas id="revenue-chart"></canvas>
        </div>
      </div>
    </div>

    <div class="card" style="padding:20px">
      <h3 style="margin-bottom:16px">热度排行 Top 5</h3>
      ${data.hotMovies && data.hotMovies.length > 0 ? `
        <table style="width:100%;border-collapse:collapse">
          <thead>
            <tr style="border-bottom:2px solid #eee;text-align:left">
              <th style="padding:8px">排名</th>
              <th style="padding:8px">影片</th>
              <th style="padding:8px">订单数</th>
              <th style="padding:8px">营收</th>
            </tr>
          </thead>
          <tbody>
            ${data.hotMovies.map((m, i) => `
              <tr style="border-bottom:1px solid #f0f0f0">
                <td style="padding:8px;font-weight:bold">${i + 1}</td>
                <td style="padding:8px">${m.title}</td>
                <td style="padding:8px">${m.order_count}</td>
                <td style="padding:8px">¥${(m.revenue || 0).toFixed(2)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      ` : '<p style="color:#888">暂无数据</p>'}
    </div>
  `;

  // Render charts after DOM is ready
  setTimeout(() => renderDashboardCharts(data), 100);
}

function renderDashboardCharts(data) {
  // User Growth Chart
  const growthCtx = document.getElementById('user-growth-chart');
  if (growthCtx && typeof Chart !== 'undefined') {
    const growthData = data.userGrowth || [];
    const labels = growthData.map(d => d.date ? d.date.slice(5) : '');
    const counts = growthData.map(d => d.count || 0);

    // Fill missing dates for last 7 days
    if (labels.length === 0) {
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        labels.push(`${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`);
        counts.push(0);
      }
    }

    new Chart(growthCtx, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: '新增用户',
          data: counts,
          borderColor: '#e94560',
          backgroundColor: 'rgba(233,69,96,0.1)',
          fill: true,
          tension: 0.4,
          pointRadius: 4,
          pointBackgroundColor: '#e94560',
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: { beginAtZero: true, ticks: { stepSize: 1 } },
          x: { grid: { display: false } }
        }
      }
    });
  }

  // Revenue Chart (by movie)
  const revenueCtx = document.getElementById('revenue-chart');
  if (revenueCtx && typeof Chart !== 'undefined') {
    const hotMovies = data.hotMovies || [];
    const labels = hotMovies.map(m => m.title.length > 6 ? m.title.slice(0, 6) + '...' : m.title);
    const revenues = hotMovies.map(m => m.revenue || 0);
    const orders = hotMovies.map(m => m.order_count || 0);

    new Chart(revenueCtx, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: '营收(元)',
            data: revenues,
            backgroundColor: 'rgba(233,69,96,0.7)',
            borderRadius: 4,
            yAxisID: 'y',
          },
          {
            label: '订单数',
            data: orders,
            backgroundColor: 'rgba(22,119,255,0.7)',
            borderRadius: 4,
            yAxisID: 'y1',
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'top' }
        },
        scales: {
          y: {
            type: 'linear',
            position: 'left',
            beginAtZero: true,
            title: { display: true, text: '营收(元)' }
          },
          y1: {
            type: 'linear',
            position: 'right',
            beginAtZero: true,
            grid: { drawOnChartArea: false },
            title: { display: true, text: '订单数' }
          },
          x: { grid: { display: false } }
        }
      }
    });
  }
}

/* ============================================================
   Movies Tab
   ============================================================ */
async function loadMovies(el) {
  const movies = await api.get('/admin/movies');

  el.innerHTML = `
    <h2 style="margin-bottom:24px">影片管理</h2>
    <div class="card" style="padding:20px;overflow-x:auto">
      <table style="width:100%;border-collapse:collapse">
        <thead>
          <tr style="border-bottom:2px solid #eee;text-align:left">
            <th style="padding:8px">ID</th>
            <th style="padding:8px">海报</th>
            <th style="padding:8px">片名</th>
            <th style="padding:8px">导演</th>
            <th style="padding:8px">类型</th>
            <th style="padding:8px">地区</th>
            <th style="padding:8px">评分</th>
            <th style="padding:8px">状态</th>
          </tr>
        </thead>
        <tbody>
          ${movies.map(m => `
            <tr style="border-bottom:1px solid #f0f0f0">
              <td style="padding:8px">${m.id}</td>
              <td style="padding:8px">
                <img src="${m.poster || ''}" alt="${m.title}" style="width:40px;height:60px;object-fit:cover;border-radius:4px"
                     onerror="this.src='https://via.placeholder.com/40x60?text=电影'">
              </td>
              <td style="padding:8px">${m.title}</td>
              <td style="padding:8px">${m.director || '-'}</td>
              <td style="padding:8px">${m.genre || '-'}</td>
              <td style="padding:8px">${m.region || '-'}</td>
              <td style="padding:8px">${m.rating ? Number(m.rating).toFixed(1) : '-'}</td>
              <td style="padding:8px">
                <select class="admin-status-select" data-id="${m.id}" style="padding:4px 8px;border-radius:4px;border:1px solid #ddd">
                  <option value="upcoming" ${m.status === 'upcoming' ? 'selected' : ''}>待上映</option>
                  <option value="playing" ${m.status === 'playing' ? 'selected' : ''}>热映中</option>
                  <option value="offline" ${m.status === 'offline' ? 'selected' : ''}>已下线</option>
                </select>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      ${movies.length === 0 ? '<p style="color:#888;text-align:center;padding:20px">暂无影片</p>' : ''}
    </div>
  `;

  // Bind status change
  el.querySelectorAll('.admin-status-select').forEach(sel => {
    sel.addEventListener('change', async () => {
      const movieId = sel.dataset.id;
      const status = sel.value;
      try {
        await api.put(`/admin/movies/${movieId}`, { status });
        alert('状态已更新');
      } catch (err) {
        alert(`更新失败: ${err.message}`);
      }
    });
  });
}

/* ============================================================
   Schedules Tab
   ============================================================ */
async function loadSchedules(el) {
  const schedules = await api.get('/admin/schedules');

  el.innerHTML = `
    <h2 style="margin-bottom:24px">排片管理</h2>
    <div class="card" style="padding:20px;overflow-x:auto">
      <table style="width:100%;border-collapse:collapse">
        <thead>
          <tr style="border-bottom:2px solid #eee;text-align:left">
            <th style="padding:8px">ID</th>
            <th style="padding:8px">影片</th>
            <th style="padding:8px">影院</th>
            <th style="padding:8px">影厅</th>
            <th style="padding:8px">放映时间</th>
            <th style="padding:8px">票价</th>
          </tr>
        </thead>
        <tbody>
          ${schedules.map(s => `
            <tr style="border-bottom:1px solid #f0f0f0">
              <td style="padding:8px">${s.id}</td>
              <td style="padding:8px">${s.movie_title}</td>
              <td style="padding:8px">${s.cinema_name}</td>
              <td style="padding:8px">${s.hall_name}</td>
              <td style="padding:8px">${s.show_time}</td>
              <td style="padding:8px">¥${s.price}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      ${schedules.length === 0 ? '<p style="color:#888;text-align:center;padding:20px">暂无排片</p>' : ''}
    </div>
  `;
}

/* ============================================================
   Orders Tab
   ============================================================ */
async function loadOrders(el) {
  const orders = await api.get('/admin/orders');

  const statusMap = {
    pending: { text: '待支付', color: '#d48806' },
    paid: { text: '已支付', color: '#389e0d' },
    cancelled: { text: '已取消', color: '#999' },
    refunded: { text: '已退款', color: '#cf1322' },
  };

  el.innerHTML = `
    <h2 style="margin-bottom:24px">订单管理</h2>
    <div class="card" style="padding:20px;overflow-x:auto">
      <table style="width:100%;border-collapse:collapse">
        <thead>
          <tr style="border-bottom:2px solid #eee;text-align:left">
            <th style="padding:8px">订单号</th>
            <th style="padding:8px">用户</th>
            <th style="padding:8px">影片</th>
            <th style="padding:8px">金额</th>
            <th style="padding:8px">状态</th>
            <th style="padding:8px">操作</th>
          </tr>
        </thead>
        <tbody>
          ${orders.map(o => {
            const st = statusMap[o.status] || { text: o.status, color: '#999' };
            const canRefund = o.status === 'paid';
            return `
              <tr style="border-bottom:1px solid #f0f0f0">
                <td style="padding:8px;font-size:12px">${o.order_no || o.id}</td>
                <td style="padding:8px">${o.user_name || '-'}</td>
                <td style="padding:8px">${o.movie_title}</td>
                <td style="padding:8px">¥${o.total_price}</td>
                <td style="padding:8px"><span style="color:${st.color}">${st.text}</span></td>
                <td style="padding:8px">
                  ${canRefund
                    ? `<button class="btn btn-outline btn-sm refund-btn" data-id="${o.id}">退款</button>`
                    : '-'}
                </td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
      ${orders.length === 0 ? '<p style="color:#888;text-align:center;padding:20px">暂无订单</p>' : ''}
    </div>
  `;

  // Bind refund buttons
  el.querySelectorAll('.refund-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('确定要为该订单退款吗？')) return;
      try {
        await api.post(`/admin/orders/${btn.dataset.id}/refund`);
        alert('退款成功');
        await loadOrders(el);
      } catch (err) {
        alert(`退款失败: ${err.message}`);
      }
    });
  });
}

/* ============================================================
   Users Tab
   ============================================================ */
async function loadUsers(el) {
  const users = await api.get('/admin/users');

  el.innerHTML = `
    <h2 style="margin-bottom:24px">用户管理</h2>
    <div class="card" style="padding:20px;overflow-x:auto">
      <table style="width:100%;border-collapse:collapse">
        <thead>
          <tr style="border-bottom:2px solid #eee;text-align:left">
            <th style="padding:8px">ID</th>
            <th style="padding:8px">昵称</th>
            <th style="padding:8px">手机</th>
            <th style="padding:8px">VIP等级</th>
            <th style="padding:8px">积分</th>
            <th style="padding:8px">角色</th>
          </tr>
        </thead>
        <tbody>
          ${users.map(u => `
            <tr style="border-bottom:1px solid #f0f0f0">
              <td style="padding:8px">${u.id}</td>
              <td style="padding:8px">${u.nickname || '-'}</td>
              <td style="padding:8px">${u.phone || '-'}</td>
              <td style="padding:8px">${['普通', 'VIP', '超级VIP'][u.vip_level] || '普通'}</td>
              <td style="padding:8px">${u.points || 0}</td>
              <td style="padding:8px">
                <select class="admin-role-select" data-id="${u.id}" style="padding:4px 8px;border-radius:4px;border:1px solid #ddd">
                  <option value="user" ${u.role === 'user' ? 'selected' : ''}>普通用户</option>
                  <option value="admin" ${u.role === 'admin' ? 'selected' : ''}>管理员</option>
                </select>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      ${users.length === 0 ? '<p style="color:#888;text-align:center;padding:20px">暂无用户</p>' : ''}
    </div>
  `;

  // Bind role change
  el.querySelectorAll('.admin-role-select').forEach(sel => {
    sel.addEventListener('change', async () => {
      const userId = sel.dataset.id;
      const role = sel.value;
      try {
        await api.put(`/admin/users/${userId}/role`, { role });
        alert('角色已更新');
      } catch (err) {
        alert(`更新失败: ${err.message}`);
      }
    });
  });
}
