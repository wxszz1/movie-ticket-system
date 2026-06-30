import api from '../api.js';

const SEAT_COLORS = {
  available: '#4CAF50',  // green
  selected:  '#FFC107',  // yellow
  sold:      '#9E9E9E',  // gray
  vip:       '#9C27B0',  // purple
  fault:     '#F44336',  // red
};

const SEAT_SIZE = 32;
const SEAT_GAP = 6;
const LABEL_OFFSET = 28;
const PADDING = 20;

let currentSchedule = null;
let seats = [];
let layout = {};
let selectedSeats = [];
let orderId = null;

export async function renderSeatPicker(container, params) {
  const scheduleId = params.scheduleId;
  container.innerHTML = '<div class="loading">加载座位信息...</div>';

  try {
    const data = await api.get(`/seats/schedule/${scheduleId}`);
    currentSchedule = data.schedule;
    seats = data.seats;
    layout = data.layout;
    selectedSeats = [];
    orderId = null;

    renderPage(container);
  } catch (err) {
    container.innerHTML = `<div class="error-message">${err.message}</div>`;
  }
}

function renderPage(container) {
  const { movie_title, show_time, hall_name, cinema_name, price, member_price } = currentSchedule;
  const user = window.__appState?.user;
  const unitPrice = (user && user.vip_level > 0) ? member_price : price;
  const isVip = user && user.vip_level > 0;

  const svgWidth = layout.cols * (SEAT_SIZE + SEAT_GAP) + SEAT_GAP + LABEL_OFFSET + PADDING * 2;
  const svgHeight = layout.rows * (SEAT_SIZE + SEAT_GAP) + SEAT_GAP + LABEL_OFFSET + PADDING + 40;

  container.innerHTML = `
    <div class="seat-picker">
      <div class="card" style="margin-bottom:16px;">
        <div class="card-body">
          <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px;">
            <div>
              <h2 style="font-size:1.3rem; margin-bottom:4px;">${movie_title}</h2>
              <p style="color:#666; font-size:0.9rem;">${cinema_name} | ${hall_name}</p>
              <p style="color:#999; font-size:0.85rem;">${formatShowTime(show_time)}</p>
            </div>
            <div style="text-align:right;">
              <div style="font-size:1.5rem; font-weight:700; color:#e94560;">¥${unitPrice}</div>
              ${isVip ? '<div style="font-size:0.8rem; color:#9C27B0;">会员价</div>' : ''}
            </div>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-body">
          <div class="seat-screen">银 幕</div>

          <div class="seat-legend" style="justify-content:center; margin-bottom:20px;">
            <span><span class="seat-icon" style="background:${SEAT_COLORS.available};"></span> 可选</span>
            <span><span class="seat-icon" style="background:${SEAT_COLORS.selected};"></span> 已选</span>
            <span><span class="seat-icon" style="background:${SEAT_COLORS.sold};"></span> 已售</span>
            <span><span class="seat-icon" style="background:${SEAT_COLORS.vip};"></span> VIP</span>
            <span><span class="seat-icon" style="background:${SEAT_COLORS.fault};"></span> 故障</span>
          </div>

          <div class="seat-svg-wrapper" style="overflow-x:auto; text-align:center;">
            <svg id="seat-svg" width="${svgWidth}" height="${svgHeight}" xmlns="http://www.w3.org/2000/svg">
              ${renderSeats()}
            </svg>
          </div>
        </div>
      </div>

      <div class="card" style="margin-top:16px;">
        <div class="card-body">
          <div id="selected-seats-info">
            <p style="color:#999; text-align:center;">请点击座位进行选择</p>
          </div>
        </div>
      </div>
    </div>
  `;

  bindSeatEvents();
  updateSelectedInfo();
}

function renderSeats() {
  const svgParts = [];

  // Row labels (on the left)
  for (let r = 1; r <= layout.rows; r++) {
    const y = PADDING + (r - 1) * (SEAT_SIZE + SEAT_GAP) + SEAT_SIZE / 2 + 4;
    svgParts.push(`<text x="${PADDING - 4}" y="${y}" text-anchor="end" font-size="12" fill="#999">${r}排</text>`);
  }

  // Column labels (on the bottom)
  for (let c = 1; c <= layout.cols; c++) {
    const x = PADDING + LABEL_OFFSET + (c - 1) * (SEAT_SIZE + SEAT_GAP) + SEAT_SIZE / 2;
    const y = PADDING + layout.rows * (SEAT_SIZE + SEAT_GAP) + SEAT_GAP + 20;
    svgParts.push(`<text x="${x}" y="${y}" text-anchor="middle" font-size="11" fill="#999">${c}</text>`);
  }

  // Seats
  for (const seat of seats) {
    const x = PADDING + LABEL_OFFSET + (seat.col - 1) * (SEAT_SIZE + SEAT_GAP);
    const y = PADDING + (seat.row - 1) * (SEAT_SIZE + SEAT_GAP);
    const fill = getSeatFill(seat);
    const canClick = seat.status === 'available' && seat.type !== 'disabled';
    const clickability = canClick
      ? 'cursor:pointer;' : 'cursor:not-allowed;opacity:0.6;';

    svgParts.push(`
      <rect
        data-seat-id="${seat.id}"
        class="seat-rect"
        x="${x}" y="${y}"
        width="${SEAT_SIZE}" height="${SEAT_SIZE}"
        rx="6" ry="6"
        fill="${fill}"
        style="${clickability}"
      />
      <text
        x="${x + SEAT_SIZE / 2}" y="${y + SEAT_SIZE / 2 + 4}"
        text-anchor="middle" font-size="10" fill="#fff"
        style="pointer-events:none;"
      >${seat.row}-${seat.col}</text>
    `);
  }

  return svgParts.join('\n');
}

function getSeatFill(seat) {
  if (seat.status === 'fault' || seat.type === 'disabled') return SEAT_COLORS.fault;
  if (seat.status === 'sold') return SEAT_COLORS.sold;
  if (selectedSeats.includes(seat.id)) return SEAT_COLORS.selected;
  if (seat.type === 'vip') return SEAT_COLORS.vip;
  return SEAT_COLORS.available;
}

function bindSeatEvents() {
  const svg = document.getElementById('seat-svg');
  if (!svg) return;

  svg.addEventListener('click', (e) => {
    const rect = e.target.closest('.seat-rect');
    if (!rect) return;

    const seatId = parseInt(rect.dataset.seatId, 10);
    const seat = seats.find(s => s.id === seatId);
    if (!seat || seat.status !== 'available' || seat.type === 'disabled') return;

    toggleSeat(seatId);
    updateSeatVisual(seatId);
    updateSelectedInfo();
  });
}

function toggleSeat(seatId) {
  const idx = selectedSeats.indexOf(seatId);
  if (idx === -1) {
    if (selectedSeats.length >= 5) {
      alert('最多选择5个座位');
      return;
    }
    selectedSeats.push(seatId);
  } else {
    selectedSeats.splice(idx, 1);
  }
}

function updateSeatVisual(seatId) {
  const svg = document.getElementById('seat-svg');
  if (!svg) return;

  const rect = svg.querySelector(`[data-seat-id="${seatId}"]`);
  if (!rect) return;

  const seat = seats.find(s => s.id === seatId);
  rect.setAttribute('fill', getSeatFill(seat));
}

function updateSelectedInfo() {
  const infoEl = document.getElementById('selected-seats-info');
  if (!infoEl) return;

  const user = window.__appState?.user;
  const { price, member_price } = currentSchedule;
  const unitPrice = (user && user.vip_level > 0) ? member_price : price;
  const total = unitPrice * selectedSeats.length;

  if (selectedSeats.length === 0) {
    infoEl.innerHTML = '<p style="color:#999; text-align:center;">请点击座位进行选择</p>';
    return;
  }

  const seatLabels = selectedSeats.map(id => {
    const s = seats.find(seat => seat.id === id);
    return s ? `${s.row}排${s.col}座` : '';
  }).filter(Boolean);

  infoEl.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px;">
      <div>
        <div style="font-size:0.9rem; color:#333; margin-bottom:4px;">
          已选: <strong>${seatLabels.join(', ')}</strong>
        </div>
        <div style="font-size:0.85rem; color:#666;">
          ${unitPrice}元 x ${selectedSeats.length}张
        </div>
      </div>
      <div style="display:flex; align-items:center; gap:16px;">
        <div style="font-size:1.4rem; font-weight:700; color:#e94560;">合计 ¥${total}</div>
        <button class="btn btn-primary btn-lg" id="confirm-btn" onclick="window.__confirmSeatSelection()">
          确认选座
        </button>
      </div>
    </div>
  `;
}

window.__confirmSeatSelection = async () => {
  if (selectedSeats.length === 0) {
    alert('请先选择座位');
    return;
  }

  const user = window.__appState?.user;
  if (!user) {
    alert('请先登录');
    window.location.hash = '#/login';
    return;
  }

  const btn = document.getElementById('confirm-btn');
  if (btn) {
    btn.disabled = true;
    btn.textContent = '锁定中...';
  }

  try {
    // Lock seats
    const lockResult = await api.post('/seats/lock', {
      schedule_id: currentSchedule.id,
      seat_ids: selectedSeats,
    });

    orderId = lockResult.order_id;

    // Show order summary
    showOrderSummary(lockResult);
  } catch (err) {
    alert(err.message);
    if (btn) {
      btn.disabled = false;
      btn.textContent = '确认选座';
    }
  }
};

let countdownTimer = null;
let countdownSeconds = 0;

function showOrderSummary(lockResult) {
  const { order_no, seats: orderSeats, total_price, unit_price, expires_in } = lockResult;

  const seatLabels = orderSeats.map(s => s.label).join(', ');
  countdownSeconds = expires_in || 15 * 60;

  // Create modal overlay
  const overlay = document.createElement('div');
  overlay.id = 'order-modal';
  overlay.style.cssText = `
    position:fixed; top:0; left:0; right:0; bottom:0;
    background:rgba(0,0,0,0.5); display:flex; align-items:center; justify-content:center;
    z-index:9999;
  `;

  overlay.innerHTML = `
    <div class="card" style="max-width:420px; width:90%; position:relative;">
      <div class="card-body">
        <h3 style="margin-bottom:16px; text-align:center;">订单确认</h3>
        <div style="background:#fff3cd; border-radius:8px; padding:10px; margin-bottom:12px; text-align:center;">
          <span style="color:#856404; font-size:14px;">请在 </span>
          <span id="countdown-display" style="color:#e94560; font-weight:bold; font-size:16px;">15:00</span>
          <span style="color:#856404; font-size:14px;"> 内完成支付，超时订单将自动取消</span>
        </div>
        <div style="margin-bottom:12px;">
          <p style="color:#666; margin-bottom:4px;">订单号: <strong>${order_no}</strong></p>
          <p style="color:#666; margin-bottom:4px;">座位: ${seatLabels}</p>
          <p style="color:#666; margin-bottom:4px;">单价: ¥${unit_price}</p>
          <p style="color:#666; margin-bottom:4px;">数量: ${orderSeats.length}张</p>
        </div>

        <div style="margin-bottom:12px; border:1px solid #eee; border-radius:8px; padding:12px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
            <span style="color:#666;">使用优惠券</span>
            <select id="coupon-select" style="padding:4px 8px; border:1px solid #ddd; border-radius:4px; max-width:200px;">
              <option value="">不使用</option>
            </select>
          </div>
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <span style="color:#666;">使用积分 (<span id="user-points-display">0</span>)</span>
            <div style="display:flex; align-items:center; gap:6px;">
              <input type="number" id="points-input" min="0" value="0" style="width:80px; padding:4px 8px; border:1px solid #ddd; border-radius:4px;">
              <span style="color:#999; font-size:12px;">100积分=1元</span>
            </div>
          </div>
        </div>

        <div style="text-align:center; padding:12px 0; border-top:1px solid #eee; margin-bottom:16px;">
          <span style="color:#999; font-size:13px;">应付 </span>
          <span id="final-price" style="font-size:1.4rem; font-weight:700; color:#e94560;">¥${total_price}</span>
        </div>
        <div style="display:flex; gap:12px;">
          <button class="btn btn-secondary" style="flex:1;" onclick="window.__cancelOrder()">取消</button>
          <button class="btn btn-primary" style="flex:1;" id="pay-btn" onclick="window.__payOrder()">确认支付</button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  // Store order info for payment
  window.__currentOrderId = orderId;
  window.__currentOrderSeats = selectedSeats;
  window.__currentOrderPrice = total_price;

  // Load user coupons and points
  loadCheckoutDiscounts(total_price);

  // Start countdown
  startCountdown();
}

async function loadCheckoutDiscounts(originalPrice) {
  try {
    const [coupons, pointsData] = await Promise.all([
      api.get('/coupons').catch(() => []),
      api.get('/users/points').catch(() => ({ total: 0 })),
    ]);

    // Populate coupon select
    const couponSelect = document.getElementById('coupon-select');
    if (couponSelect && coupons.length > 0) {
      coupons.filter(c => !c.used && new Date(c.expires_at) > new Date()).forEach(c => {
        const label = c.type === 'discount'
          ? `减${c.value}元 (满${c.min_amount || 0}可用)`
          : `${c.type} ¥${c.value}`;
        const option = document.createElement('option');
        option.value = c.id;
        option.textContent = label;
        option.dataset.value = c.value;
        option.dataset.minAmount = c.min_amount || 0;
        couponSelect.appendChild(option);
      });
    }

    // Show user points
    const pointsDisplay = document.getElementById('user-points-display');
    if (pointsDisplay) {
      pointsDisplay.textContent = pointsData.total || 0;
    }

    // Bind price update events
    const couponSel = document.getElementById('coupon-select');
    const pointsInput = document.getElementById('points-input');
    if (couponSel) couponSel.addEventListener('change', () => updateFinalPrice(originalPrice));
    if (pointsInput) pointsInput.addEventListener('input', () => updateFinalPrice(originalPrice));

  } catch (err) {
    console.warn('加载优惠信息失败:', err);
  }
}

function updateFinalPrice(originalPrice) {
  let price = originalPrice;

  // Apply coupon
  const couponSelect = document.getElementById('coupon-select');
  if (couponSelect && couponSelect.value) {
    const option = couponSelect.options[couponSelect.selectedIndex];
    const couponValue = parseFloat(option.dataset.value) || 0;
    const minAmount = parseFloat(option.dataset.minAmount) || 0;
    if (price >= minAmount) {
      price = Math.max(0, price - couponValue);
    }
  }

  // Apply points (100 points = 1 yuan)
  const pointsInput = document.getElementById('points-input');
  const userPoints = parseInt(document.getElementById('user-points-display')?.textContent || '0', 10);
  if (pointsInput) {
    let pointsToUse = parseInt(pointsInput.value, 10) || 0;
    pointsToUse = Math.min(pointsToUse, userPoints);
    pointsToUse = Math.min(pointsToUse, Math.floor(price * 100));
    pointsInput.value = pointsToUse;
    price = Math.max(0, price - pointsToUse / 100);
  }

  const finalPriceEl = document.getElementById('final-price');
  if (finalPriceEl) {
    finalPriceEl.textContent = `¥${price.toFixed(2)}`;
  }

  window.__discountedPrice = price;
}

function startCountdown() {
  if (countdownTimer) clearInterval(countdownTimer);

  const display = document.getElementById('countdown-display');
  if (!display) return;

  countdownTimer = setInterval(() => {
    countdownSeconds--;
    if (countdownSeconds <= 0) {
      clearInterval(countdownTimer);
      display.textContent = '00:00';
      display.style.color = '#cf1322';
      alert('支付超时，订单已自动取消');
      const modal = document.getElementById('order-modal');
      if (modal) modal.remove();
      window.location.reload();
      return;
    }

    const min = Math.floor(countdownSeconds / 60);
    const sec = countdownSeconds % 60;
    display.textContent = `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;

    if (countdownSeconds <= 60) {
      display.style.color = '#cf1322';
      display.parentElement.style.background = '#fff2f0';
    }
  }, 1000);
}

window.__cancelOrder = () => {
  const modal = document.getElementById('order-modal');
  if (modal) modal.remove();

  const btn = document.getElementById('confirm-btn');
  if (btn) {
    btn.disabled = false;
    btn.textContent = '确认选座';
  }
};

window.__payOrder = async () => {
  const payBtn = document.getElementById('pay-btn');
  if (payBtn) {
    payBtn.disabled = true;
    payBtn.textContent = '支付中...';
  }

  if (countdownTimer) clearInterval(countdownTimer);

  try {
    const couponId = document.getElementById('coupon-select')?.value || null;
    const pointsUsed = parseInt(document.getElementById('points-input')?.value, 10) || 0;

    const result = await api.post(`/orders/${window.__currentOrderId}/pay`, {
      coupon_id: couponId ? parseInt(couponId, 10) : null,
      points_used: pointsUsed,
    });

    // Remove modal
    const modal = document.getElementById('order-modal');
    if (modal) modal.remove();

    // Show success
    showPaymentSuccess(result);
  } catch (err) {
    alert(err.message);
    if (payBtn) {
      payBtn.disabled = false;
      payBtn.textContent = '确认支付';
    }
  }
};

function showPaymentSuccess(result) {
  const overlay = document.createElement('div');
  overlay.id = 'pay-success-modal';
  overlay.style.cssText = `
    position:fixed; top:0; left:0; right:0; bottom:0;
    background:rgba(0,0,0,0.5); display:flex; align-items:center; justify-content:center;
    z-index:9999;
  `;

  overlay.innerHTML = `
    <div class="card" style="max-width:380px; width:90%; text-align:center;">
      <div class="card-body" style="padding:32px;">
        <div style="font-size:48px; margin-bottom:16px;">&#10003;</div>
        <h3 style="margin-bottom:8px; color:#389e0d;">支付成功</h3>
        <p style="color:#666; margin-bottom:8px;">取票码: <strong style="font-size:1.2rem; color:#333;">${result.qr_code}</strong></p>
        <p style="color:#999; font-size:0.85rem; margin-bottom:24px;">获得 ${result.points_earned} 积分</p>
        <button class="btn btn-primary btn-block" onclick="window.__goToOrders()">查看订单</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);
}

window.__goToOrders = () => {
  const modal = document.getElementById('pay-success-modal');
  if (modal) modal.remove();
  window.location.hash = '#/orders';
};

function formatShowTime(showTime) {
  if (!showTime) return '';
  const d = new Date(showTime);
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
  const weekday = weekdays[d.getDay()];
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${month}月${day}日 周${weekday} ${hours}:${minutes}`;
}
