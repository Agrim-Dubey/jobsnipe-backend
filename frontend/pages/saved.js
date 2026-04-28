// Saved Jobs — no emojis
import { api } from '../api.js';
import { withLayout } from './layout.js';
import { jobCardHTML, attachJobActions } from './dashboard.js';

export function renderSavedJobs(container) {
  withLayout(container, 'saved', `
    <div class="page-header">
      <div>
        <h1>Saved Jobs</h1>
        <p class="subtitle">Your curated list of roles to apply for.</p>
      </div>
    </div>
    <div id="jobs-list" class="jobs-list">
      <div class="empty-state"><div class="loading-spinner"></div><p style="margin-top:10px">Loading...</p></div>
    </div>
  `);
  loadSavedJobs();

  async function loadSavedJobs() {
    const el = document.getElementById('jobs-list');
    try {
      const jobs = await api.getJobs({ is_saved: true, limit: 100 });
      if (jobs.length === 0) {
        el.innerHTML = `<div class="empty-state"><h3>No saved jobs</h3><p>Click the star on any job to save it here.</p><a href="#/jobs" class="btn btn-primary btn-sm" style="margin-top:14px">Browse Jobs</a></div>`;
        return;
      }
      el.innerHTML = jobs.map((j, i) => jobCardHTML(j, i)).join('');
      attachJobActions(el);
    } catch (e) {
      el.innerHTML = `<div class="empty-state"><h3>Error</h3><p>${e.message}</p></div>`;
    }
  }
}
