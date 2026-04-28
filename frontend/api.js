// ============================================
// JobSnipe — API Client
// ============================================

const BASE = '/api';

let accessToken = localStorage.getItem('accessToken');
let refreshToken = localStorage.getItem('refreshToken');

export function setTokens(access, refresh) {
  accessToken = access;
  refreshToken = refresh;
  localStorage.setItem('accessToken', access);
  localStorage.setItem('refreshToken', refresh);
}

export function clearTokens() {
  accessToken = null;
  refreshToken = null;
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('userEmail');
}

export function isLoggedIn() {
  return !!accessToken;
}

async function request(method, path, body = null, retry = true) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (accessToken) opts.headers['Authorization'] = `Bearer ${accessToken}`;
  if (body) opts.body = JSON.stringify(body);

  let resp = await fetch(`${BASE}${path}`, opts);

  // Try refresh on 401
  if (resp.status === 401 && refreshToken && retry) {
    const refreshResp = await fetch(`${BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
    if (refreshResp.ok) {
      const data = await refreshResp.json();
      setTokens(data.access_token, data.refresh_token);
      // Retry original request
      opts.headers['Authorization'] = `Bearer ${data.access_token}`;
      resp = await fetch(`${BASE}${path}`, opts);
    } else {
      clearTokens();
      window.location.hash = '#/login';
      throw new Error('Session expired');
    }
  }

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ detail: 'Request failed' }));
    throw new Error(err.detail || `HTTP ${resp.status}`);
  }
  return resp.json();
}

export const api = {
  // Auth
  register: (email, password) => request('POST', '/auth/register', { email, password }),
  login: (email, password) => request('POST', '/auth/login', { email, password }),

  // Preferences
  getPreferences: () => request('GET', '/preferences/me'),
  createPreferences: (data) => request('POST', '/preferences', data),
  updatePreferences: (data) => request('PATCH', '/preferences', data),

  // Jobs
  getSources: () => request('GET', '/jobs/sources'),
  getExchangeRate: () => request('GET', '/jobs/exchange-rate'),
  scrape: (data = {}) => request('POST', '/jobs/scrape', data),
  getJobs: (params = {}) => {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => { if (v != null && v !== '') qs.set(k, v); });
    return request('GET', `/jobs?${qs.toString()}`);
  },
  updateJob: (id, data) => request('PATCH', `/jobs/${id}`, data),
  getStats: () => request('GET', '/jobs/stats'),
  clearJobs: () => request('DELETE', '/jobs/all'),
};
