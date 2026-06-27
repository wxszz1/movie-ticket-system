import api from '../api.js';

export async function renderOrders(container) {
  // Check if user is logged in
  if (!window.__appState || !window.__appState.user) {
    container.innerHTML = `
      <div class="empty-state">
        <h2>请先登录</h2>
        <p>您需要登录后才能查看订单</p>
        <a href="#/login" class="btn btn-primary">去登录</a>
      </div>
    `;
    return;
  }

  container.innerHTML = '<div class="loading">加载中...</div>';

  try {
    const orders = await api.get('/orders');
    renderOrderList(container, orders);
  } catch (err) {
    container.innerHTML = `<div class="error">加载失败: ${err.message}</div>`;
  }
}

function renderOrderList(container, orders) {
  if (!orders || orders.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <h2>我的订单</h2>
        <p>暂无订单</p>
        <a href="#/" class="btn btn-primary">去看电影</a>
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <div class="card">
      <h2>我的订单</h2>
      <div class="order-list" id="order-list"></div>
    </div>
  `;

  const listEl = document.getElementById('order-list');
  listEl.innerHTML = orders.map(order => renderOrderItem(order)).join('');

  // Bind action buttons
  listEl.querySelectorAll('[data-action]').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const action = btn.dataset.action;
      const orderId = btn.dataset.orderId;
      await handleAction(action, orderId, container);
    });
  });
}

function renderOrderItem(order) {
  const seatLabels = (order.seat_info || []).map(s => s.label).join('、');
  const showTime = order.show_time || '';
  const statusMap = {
    pending: { text: '待支付', color: 'var(--color-warning)' },
    paid: { text: '已支付', color: 'var(--color-success)' },
    cancelled: { text: '已取消', color: 'var(--color-text-secondary)' },
    refunded: { text: '已退款', color: 'var(--color-danger)' },
  };
  const status = statusMap[order.status] || { text: order.status, color: 'var(--color-text-secondary)' };

  let actionsHtml = '';
  if (order.status === 'pending') {
    actionsHtml = `
      <button class="btn btn-primary btn-sm" data-action="pay" data-order-id="${order.id}">立即支付</button>
      <button class="btn btn-outline btn-sm" data-action="cancel" data-order-id="${order.id}">取消订单</button>
    `;
  } else if (order.status === 'paid') {
    actionsHtml = `
      <button class="btn btn-outline btn-sm" data-action="refund" data-order-id="${order.id}">申请退款</button>
    `;
  }

  let qrHtml = '';
  if (order.status === 'paid' && order.qr_code) {
    qrHtml = `
      <div class="order-qr">
        <div class="qr-placeholder" title="取票码: ${order.qr_code}">
          <span class="qr-code-label">取票码</span>
          <span class="qr-code-value">${order.qr_code}</span>
        </div>
      </div>
    `;
  }

  return `
    <div class="order-item">
      <div class="order-main">
        <img class="order-poster" src="${order.poster}" alt="${order.movie_title}"
             onerror="this.src='https://via.placeholder.com/80x120?text=电影'">
        <div class="order-info">
          <div class="order-header">
            <span class="order-title">${order.movie_title}</span>
            <span class="order-status" style="color:${status.color}">${status.text}</span>
          </div>
          <div class="order-meta">${order.cinema_name} | ${order.hall_name}</div>
          <div class="order-meta">${showTime}</div>
          <div class="order-meta">座位: ${seatLabels}</div>
          <div class="order-price">¥${order.total_price}</div>
        </div>
      </div>
      <div class="order-footer">
        <span class="order-no">${order.order_no}</span>
        <div class="order-actions">${actionsHtml}</div>
      </div>
      ${qrHtml}
    </div>
  `;
}

async function handleAction(action, orderId, container) {
  if (!confirm(`确定要${action === 'pay' ? '支付' : action === 'cancel' ? '取消' : '退款'}该订单吗？`)) {
    return;
  }

  try {
    await api.post(`/orders/${orderId}/${action}`);
    alert(
      action === 'pay' ? '支付成功！' :
      action === 'cancel' ? '订单已取消' :
      '退款申请已提交'
    );
    // Re-fetch and re-render
    const orders = await api.get('/orders');
    renderOrderList(container, orders);
  } catch (err) {
    alert(`操作失败: ${err.message}`);
  }
}
