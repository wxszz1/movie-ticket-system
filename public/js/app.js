import api from './api.js';

/* ============================================================
   Global State
   ============================================================ */
const state = {
  user: null,
};

/* ============================================================
   Router
   ============================================================ */
class Router {
  constructor() {
    this.routes = [];
    window.addEventListener('hashchange', () => this.resolve());
  }

  /**
   * Register a route.
   * @param {string} pattern - e.g. '/movie/:id'
   * @param {Function} handler - receives (container, params)
   */
  on(pattern, handler) {
    // Convert :param placeholders into regex capture groups
    const paramNames = [];
    const regexStr = pattern.replace(/:([^/]+)/g, (_, name) => {
      paramNames.push(name);
      return '([^/]+)';
    });
    this.routes.push({
      pattern,
      regex: new RegExp(`^${regexStr}$`),
      paramNames,
      handler,
    });
  }

  /**
   * Match the current hash against registered routes and call the handler.
   */
  resolve() {
    const hash = window.location.hash.slice(1) || '/';
    const container = document.getElementById('app-content');

    for (const route of this.routes) {
      const match = hash.match(route.regex);
      if (match) {
        const params = {};
        route.paramNames.forEach((name, i) => {
          params[name] = match[i + 1];
        });
        route.handler(container, params);
        return;
      }
    }

    // 404 fallback
    container.innerHTML = `
      <div class="empty-state">
        <h2>404</h2>
        <p>页面不存在</p>
      </div>
    `;
  }

  /**
   * Navigate to a hash path.
   */
  navigate(path) {
    window.location.hash = path;
  }
}

/* ============================================================
   Auth Helpers
   ============================================================ */

/**
 * Restore login state from localStorage on page load.
 */
function checkAuth() {
  const token = localStorage.getItem('token');
  const userStr = localStorage.getItem('user');
  if (token && userStr) {
    try {
      state.user = JSON.parse(userStr);
      api.setToken(token);
      updateNav(true);
    } catch {
      logout();
    }
  }
}

/**
 * Toggle navbar elements based on login state.
 */
function updateNav(loggedIn) {
  const navAuth = document.getElementById('nav-auth');
  const navUser = document.getElementById('nav-user');
  const navUsername = document.getElementById('nav-username');
  const navAdmin = document.getElementById('nav-admin');

  if (loggedIn && state.user) {
    navAuth.style.display = 'none';
    navUser.style.display = 'inline';
    navUsername.textContent = state.user.nickname || state.user.email || state.user.phone || '用户';
    if (state.user.role === 'admin') {
      navAdmin.style.display = 'inline';
    } else {
      navAdmin.style.display = 'none';
    }
  } else {
    navAuth.style.display = 'inline';
    navUser.style.display = 'none';
    navAdmin.style.display = 'none';
  }
}

/**
 * Save user and token to state and localStorage, update nav.
 */
function setUser(user, token) {
  state.user = user;
  localStorage.setItem('user', JSON.stringify(user));
  localStorage.setItem('token', token);
  api.setToken(token);
  updateNav(true);
}

/**
 * Clear user state and localStorage, update nav, redirect to home.
 */
function logout() {
  state.user = null;
  localStorage.removeItem('user');
  localStorage.removeItem('token');
  api.clearToken();
  updateNav(false);
  window.location.hash = '#/';
}

/* ============================================================
   Initialization
   ============================================================ */
document.addEventListener('DOMContentLoaded', () => {
  const router = new Router();

  // Expose globally for other modules
  window.__router = router;
  window.__appState = state;
  window.__setUser = setUser;
  window.__logout = logout;

  // Restore auth state
  checkAuth();

  // Logout button
  document.getElementById('nav-logout').addEventListener('click', (e) => {
    e.preventDefault();
    logout();
  });

  // ---------- Route Registration ----------

  // Auth pages
  router.on('/login', async (container) => {
    const { renderLogin } = await import('./pages/auth.js');
    renderLogin(container);
  });

  router.on('/register', async (container) => {
    const { renderRegister } = await import('./pages/auth.js');
    renderRegister(container);
  });

  // Placeholder routes for future pages
  router.on('/', (container) => {
    container.innerHTML = `
      <div class="empty-state">
        <h2>欢迎使用电影票务系统</h2>
        <p>请浏览电影列表或登录后查看更多功能</p>
      </div>
    `;
  });

  router.on('/orders', (container) => {
    container.innerHTML = `
      <div class="empty-state">
        <h2>我的订单</h2>
        <p>功能开发中...</p>
      </div>
    `;
  });

  router.on('/profile', (container) => {
    container.innerHTML = `
      <div class="empty-state">
        <h2>个人中心</h2>
        <p>功能开发中...</p>
      </div>
    `;
  });

  router.on('/admin', (container) => {
    container.innerHTML = `
      <div class="empty-state">
        <h2>后台管理</h2>
        <p>功能开发中...</p>
      </div>
    `;
  });

  // Resolve initial route
  router.resolve();
});

export { state, setUser, logout, checkAuth, updateNav };
