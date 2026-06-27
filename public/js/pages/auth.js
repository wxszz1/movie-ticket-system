import api from '../api.js';

/**
 * Render the login page into the given container.
 */
export function renderLogin(container) {
  container.innerHTML = `
    <div class="auth-container">
      <h2>登录</h2>
      <div id="auth-error"></div>
      <form id="login-form">
        <div class="form-group">
          <label for="account">手机号 / 邮箱</label>
          <input type="text" id="account" name="account" placeholder="请输入手机号或邮箱" required>
        </div>
        <div class="form-group">
          <label for="password">密码</label>
          <input type="password" id="password" name="password" placeholder="请输入密码" required>
        </div>
        <button type="submit" class="btn btn-primary btn-block" id="login-btn">登录</button>
      </form>
      <div class="auth-footer">
        还没有账号？<a href="#/register">去注册</a>
      </div>
    </div>
  `;

  const form = document.getElementById('login-form');
  const errorDiv = document.getElementById('auth-error');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorDiv.innerHTML = '';

    const account = document.getElementById('account').value.trim();
    const password = document.getElementById('password').value;

    if (!account || !password) {
      errorDiv.innerHTML = '<div class="error-message">请填写完整信息</div>';
      return;
    }

    const btn = document.getElementById('login-btn');
    btn.disabled = true;
    btn.textContent = '登录中...';

    try {
      const data = await api.post('/auth/login', { account, password });
      window.__setUser(data.user, data.token);
      window.location.hash = '#/';
    } catch (err) {
      errorDiv.innerHTML = `<div class="error-message">${err.message || '登录失败'}</div>`;
    } finally {
      btn.disabled = false;
      btn.textContent = '登录';
    }
  });
}

/**
 * Render the register page into the given container.
 */
export function renderRegister(container) {
  container.innerHTML = `
    <div class="auth-container">
      <h2>注册</h2>
      <div id="auth-error"></div>
      <form id="register-form">
        <div class="form-group">
          <label for="phone">手机号</label>
          <input type="tel" id="phone" name="phone" placeholder="请输入手机号">
        </div>
        <div class="form-group">
          <label for="email">邮箱</label>
          <input type="email" id="email" name="email" placeholder="请输入邮箱">
        </div>
        <div class="form-group">
          <label for="nickname">昵称</label>
          <input type="text" id="nickname" name="nickname" placeholder="请输入昵称（选填）">
        </div>
        <div class="form-group">
          <label for="password">密码</label>
          <input type="password" id="password" name="password" placeholder="请输入密码" required>
        </div>
        <div class="form-group">
          <label for="password2">确认密码</label>
          <input type="password" id="password2" name="password2" placeholder="请再次输入密码" required>
        </div>
        <button type="submit" class="btn btn-primary btn-block" id="register-btn">注册</button>
      </form>
      <div class="auth-footer">
        已有账号？<a href="#/login">去登录</a>
      </div>
    </div>
  `;

  const form = document.getElementById('register-form');
  const errorDiv = document.getElementById('auth-error');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorDiv.innerHTML = '';

    const phone = document.getElementById('phone').value.trim();
    const email = document.getElementById('email').value.trim();
    const nickname = document.getElementById('nickname').value.trim();
    const password = document.getElementById('password').value;
    const password2 = document.getElementById('password2').value;

    // Validation
    if (!phone && !email) {
      errorDiv.innerHTML = '<div class="error-message">请填写手机号或邮箱</div>';
      return;
    }
    if (!password) {
      errorDiv.innerHTML = '<div class="error-message">请填写密码</div>';
      return;
    }
    if (password !== password2) {
      errorDiv.innerHTML = '<div class="error-message">两次输入的密码不一致</div>';
      return;
    }

    const btn = document.getElementById('register-btn');
    btn.disabled = true;
    btn.textContent = '注册中...';

    try {
      const data = await api.post('/auth/register', {
        phone: phone || undefined,
        email: email || undefined,
        nickname: nickname || undefined,
        password,
      });
      window.__setUser(data.user, data.token);
      window.location.hash = '#/';
    } catch (err) {
      errorDiv.innerHTML = `<div class="error-message">${err.message || '注册失败'}</div>`;
    } finally {
      btn.disabled = false;
      btn.textContent = '注册';
    }
  });
}
