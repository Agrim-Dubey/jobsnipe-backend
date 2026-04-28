// ============================================
// JobSnipe — Main Entry & Router
// ============================================

import { isLoggedIn, clearTokens } from './api.js';
import { renderLogin, renderRegister } from './pages/auth.js';
import { renderDashboard } from './pages/dashboard.js';
import { renderPreferences } from './pages/preferences.js';
import { renderJobs } from './pages/jobs.js';
import { renderSavedJobs } from './pages/saved.js';
import { renderOutreach } from './pages/outreach.js';

const app = document.getElementById('app');

// Toast system
function createToastContainer() {
  let c = document.querySelector('.toast-container');
  if (!c) { c = document.createElement('div'); c.className = 'toast-container'; document.body.appendChild(c); }
  return c;
}

export function showToast(msg, type = 'info') {
  const container = createToastContainer();
  const icons = { success: '✓', error: '✕', info: 'ℹ' };
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span>${icons[type] || ''}</span><span>${msg}</span>`;
  container.appendChild(toast);
  setTimeout(() => { toast.style.opacity = '0'; toast.style.transform = 'translateX(100%)'; setTimeout(() => toast.remove(), 300); }, 3500);
}

window.showToast = showToast;

// Simple hash router
const routes = {
  '/login': renderLogin,
  '/register': renderRegister,
  '/dashboard': renderDashboard,
  '/preferences': renderPreferences,
  '/jobs': renderJobs,
  '/saved': renderSavedJobs,
  '/outreach': renderOutreach,
};

function navigate() {
  const hash = window.location.hash.slice(1) || '/login';
  const protectedRoutes = ['/dashboard', '/preferences', '/jobs', '/saved', '/outreach'];

  if (protectedRoutes.includes(hash) && !isLoggedIn()) {
    window.location.hash = '#/login';
    return;
  }
  if ((hash === '/login' || hash === '/register') && isLoggedIn()) {
    window.location.hash = '#/dashboard';
    return;
  }

  const render = routes[hash];
  if (render) {
    app.innerHTML = '';
    render(app);
  } else {
    window.location.hash = isLoggedIn() ? '#/dashboard' : '#/login';
  }
}

window.addEventListener('hashchange', navigate);
window.addEventListener('DOMContentLoaded', navigate);
navigate();

export function logout() {
  clearTokens();
  window.location.hash = '#/login';
  showToast('Logged out', 'info');
}

window.logout = logout;
