// Auth Pages — no emojis
import { api, setTokens } from '../api.js';

export function renderLogin(container) {
  container.innerHTML = `
    <div class="auth-container">
      <div class="auth-card">
        <div class="logo-area">
          <div class="logo-icon">JS</div>
          <div><strong style="font-size:1rem;color:var(--text-0)">JobSnipe</strong></div>
        </div>
        <h1>Welcome back</h1>
        <p class="subtitle">Sign in to your dashboard</p>
        <div id="auth-error" class="error-msg"></div>
        <form id="login-form">
          <div class="input-group">
            <label for="login-email">Email</label>
            <input class="input" type="email" id="login-email" placeholder="you@example.com" required />
          </div>
          <div class="input-group">
            <label for="login-password">Password</label>
            <input class="input" type="password" id="login-password" placeholder="Password" required />
          </div>
          <button type="submit" class="btn btn-primary" id="login-btn">Sign In</button>
        </form>
        <div class="auth-footer">
          Don't have an account? <a href="#/register">Create one</a>
        </div>
      </div>
    </div>
  `;
  document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('login-btn');
    const errEl = document.getElementById('auth-error');
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    btn.disabled = true; btn.textContent = 'Signing in...'; errEl.classList.remove('visible');
    try {
      const data = await api.login(email, password);
      setTokens(data.access_token, data.refresh_token);
      localStorage.setItem('userEmail', email);
      window.showToast('Welcome back', 'success');
      window.location.hash = '#/dashboard';
    } catch (err) {
      errEl.textContent = err.message; errEl.classList.add('visible');
      btn.disabled = false; btn.textContent = 'Sign In';
    }
  });
}

export function renderRegister(container) {
  container.innerHTML = `
    <div class="auth-container">
      <div class="auth-card">
        <div class="logo-area">
          <div class="logo-icon">JS</div>
          <div><strong style="font-size:1rem;color:var(--text-0)">JobSnipe</strong></div>
        </div>
        <h1>Create account</h1>
        <p class="subtitle">Start finding jobs across the web</p>
        <div id="auth-error" class="error-msg"></div>
        <form id="register-form">
          <div class="input-group">
            <label for="reg-email">Email</label>
            <input class="input" type="email" id="reg-email" placeholder="you@example.com" required />
          </div>
          <div class="input-group">
            <label for="reg-password">Password</label>
            <input class="input" type="password" id="reg-password" placeholder="Min 8 chars, upper+lower+digit+special" required />
          </div>
          <button type="submit" class="btn btn-primary" id="reg-btn">Create Account</button>
        </form>
        <div class="auth-footer">
          Already have an account? <a href="#/login">Sign in</a>
        </div>
      </div>
    </div>
  `;
  document.getElementById('register-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('reg-btn');
    const errEl = document.getElementById('auth-error');
    const email = document.getElementById('reg-email').value;
    const password = document.getElementById('reg-password').value;
    btn.disabled = true; btn.textContent = 'Creating...'; errEl.classList.remove('visible');
    try {
      await api.register(email, password);
      window.showToast('Account created! Sign in now.', 'success');
      window.location.hash = '#/login';
    } catch (err) {
      errEl.textContent = err.message; errEl.classList.add('visible');
      btn.disabled = false; btn.textContent = 'Create Account';
    }
  });
}
