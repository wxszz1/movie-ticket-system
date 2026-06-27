/**
 * API wrapper class for communicating with the backend.
 * Handles token management, request headers, and JSON parsing.
 */
class Api {
  constructor() {
    this.baseUrl = '/api';
  }

  /**
   * Get the stored auth token from localStorage.
   */
  getToken() {
    return localStorage.getItem('token');
  }

  /**
   * Save the auth token to localStorage.
   */
  setToken(token) {
    localStorage.setItem('token', token);
  }

  /**
   * Remove the auth token from localStorage.
   */
  clearToken() {
    localStorage.removeItem('token');
  }

  /**
   * Build request headers with optional Authorization.
   */
  _headers(extra = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...extra,
    };
    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }

  /**
   * Core request method. Sends a fetch and parses JSON response.
   */
  async _request(method, url, body = null) {
    const options = {
      method,
      headers: this._headers(),
    };
    if (body !== null) {
      options.body = JSON.stringify(body);
    }

    const fullUrl = url.startsWith('http') ? url : `${this.baseUrl}${url}`;
    const res = await fetch(fullUrl, options);
    const data = await res.json();

    if (!res.ok) {
      const err = new Error(data.error || data.message || '请求失败');
      err.status = res.status;
      err.data = data;
      throw err;
    }

    return data;
  }

  /**
   * GET request.
   */
  async get(url) {
    return this._request('GET', url);
  }

  /**
   * POST request.
   */
  async post(url, body) {
    return this._request('POST', url, body);
  }

  /**
   * PUT request.
   */
  async put(url, body) {
    return this._request('PUT', url, body);
  }

  /**
   * DELETE request.
   */
  async delete(url) {
    return this._request('DELETE', url);
  }
}

// Singleton export
const api = new Api();
export default api;
