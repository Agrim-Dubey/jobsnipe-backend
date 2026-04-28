// Shared Layout — Sidebar wrapper (no emojis)
export function withLayout(container, activePage, content) {
  const email = localStorage.getItem('userEmail') || 'user';
  const initial = email.charAt(0).toUpperCase();

  container.innerHTML = `
    <div class="dashboard">
      <aside class="sidebar">
        <div class="sidebar-logo">
          <div class="icon">JS</div>
          <span>JobSnipe</span>
        </div>
        <nav class="sidebar-nav">
          <a href="#/dashboard" class="${activePage === 'dashboard' ? 'active' : ''}">
            <i class="nav-icon">D</i><span>Dashboard</span>
          </a>
          <a href="#/jobs" class="${activePage === 'jobs' ? 'active' : ''}">
            <i class="nav-icon">J</i><span>All Jobs</span>
            <span class="badge" id="unseen-badge" style="display:none">0</span>
          </a>
          <a href="#/saved" class="${activePage === 'saved' ? 'active' : ''}">
            <i class="nav-icon">S</i><span>Saved</span>
          </a>
          <a href="#/outreach" class="${activePage === 'outreach' ? 'active' : ''}">
            <i class="nav-icon">E</i><span>Emails</span>
          </a>
          <a href="#/preferences" class="${activePage === 'preferences' ? 'active' : ''}">
            <i class="nav-icon">P</i><span>Settings</span>
          </a>
        </nav>
        <div class="sidebar-bottom">
          <div class="user-info">
            <div class="user-avatar">${initial}</div>
            <div class="user-details">
              <div class="user-email">${email}</div>
            </div>
          </div>
          <button class="btn btn-secondary btn-sm" onclick="logout()" style="width:100%;justify-content:center">
            Sign Out
          </button>
        </div>
      </aside>
      <main class="main-content" id="page-content">
        ${content}
      </main>
    </div>
  `;
}
