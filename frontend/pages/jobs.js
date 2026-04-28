import { api } from '../api.js';
import { bindCurrencyInputs, bindExchangeRateNote, ensureExchangeRate } from '../utils/salary.js';
import { SKILL_OPTIONS, attachJobActions, jobCardHTML } from './dashboard.js';
import { withLayout } from './layout.js';

export function renderJobs(container) {
  ensureExchangeRate();
  withLayout(container, 'jobs', `
    <div class="page-header">
      <div>
        <h1>All Jobs</h1>
        <p class="subtitle">Filtered, cleaner job openings only.</p>
      </div>
      <div class="header-actions">
        <button class="btn btn-danger btn-sm" id="clear-jobs-btn">Clear All</button>
      </div>
    </div>

    <div class="filters-panel">
      <div class="filters-bar filters-grid">
        <div class="search-input">
          <span class="search-icon">Q</span>
          <input type="text" id="search-input" placeholder="Search title, company, description" />
        </div>
        <select id="filter-source">
          <option value="">All Sources</option>
        </select>
        <select id="filter-skill">
          <option value="">All Skills</option>
          ${SKILL_OPTIONS.map((skill) => `<option value="${skill}">${skill}</option>`).join('')}
        </select>
        <select id="filter-status">
          <option value="">All Jobs</option>
          <option value="saved">Saved Only</option>
        </select>
        <input class="input" type="number" id="filter-min-salary-usd" placeholder="Min salary USD" min="0" />
        <input class="input" type="number" id="filter-min-salary-inr" placeholder="Min salary INR" min="0" />
      </div>
      <div class="filter-toggle-row">
        <label class="filter-check"><input type="checkbox" id="filter-salary-only" /> Salary listed only</label>
        <label class="filter-check"><input type="checkbox" id="filter-email-only" /> Jobs with emails only</label>
      </div>
      <p class="fx-note" id="jobs-fx-note">Loading live salary conversion...</p>
    </div>

    <div class="result-count" id="result-count">Loading jobs...</div>
    <div id="jobs-list" class="jobs-list">
      <div class="empty-state"><div class="loading-spinner"></div><p style="margin-top:10px">Loading...</p></div>
    </div>
    <div class="pagination" id="pagination"></div>
  `);

  let currentSkip = 0;
  const LIMIT = 25;

  bindEvents();
  loadSourceOptions();
  loadJobs();

  function bindEvents() {
    bindCurrencyInputs(
      document.getElementById('filter-min-salary-usd'),
      document.getElementById('filter-min-salary-inr'),
    );
    bindExchangeRateNote(document.getElementById('jobs-fx-note'));

    let searchTimeout;
    document.getElementById('search-input').addEventListener('input', () => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        currentSkip = 0;
        loadJobs();
      }, 300);
    });

    ['filter-source', 'filter-skill', 'filter-status', 'filter-min-salary-usd', 'filter-min-salary-inr', 'filter-salary-only', 'filter-email-only']
      .forEach((id) => {
        document.getElementById(id).addEventListener('change', () => {
          currentSkip = 0;
          loadJobs();
        });
      });

    document.getElementById('clear-jobs-btn').addEventListener('click', clearAllJobs);
  }

  async function loadSourceOptions() {
    try {
      const sources = await api.getSources();
      const select = document.getElementById('filter-source');
      select.innerHTML = `<option value="">All Sources</option>` + Object.entries(sources)
        .map(([key, value]) => `<option value="${key}">${value.name}</option>`)
        .join('');
    } catch (error) {
      // Leave the default option in place if sources fail to load.
    }
  }

  async function loadJobs() {
    const listEl = document.getElementById('jobs-list');
    const resultCount = document.getElementById('result-count');
    const params = {
      skip: currentSkip,
      limit: LIMIT,
      search: document.getElementById('search-input').value.trim(),
      source: document.getElementById('filter-source').value,
      skills: document.getElementById('filter-skill').value,
      min_salary: document.getElementById('filter-min-salary-usd').value || null,
      has_salary: document.getElementById('filter-salary-only').checked || null,
      has_emails: document.getElementById('filter-email-only').checked || null,
    };

    if (document.getElementById('filter-status').value === 'saved') {
      params.is_saved = true;
    }

    try {
      const jobs = await api.getJobs(params);
      resultCount.textContent = jobs.length === 0
        ? 'No jobs match these filters.'
        : `Showing ${currentSkip + 1}-${currentSkip + jobs.length} curated jobs.`;

      if (jobs.length === 0 && currentSkip === 0) {
        listEl.innerHTML = `<div class="empty-state"><h3>No jobs found</h3><p>Try a different role, skill, or salary filter.</p></div>`;
      } else {
        listEl.innerHTML = jobs.map((job, index) => jobCardHTML(job, index)).join('');
        attachJobActions(listEl);
      }

      renderPagination(jobs.length);
    } catch (error) {
      resultCount.textContent = 'Could not load jobs.';
      listEl.innerHTML = `<div class="empty-state"><h3>Error</h3><p>${error.message}</p></div>`;
    }
  }

  function renderPagination(resultLength) {
    const pagination = document.getElementById('pagination');
    pagination.innerHTML = '';

    if (currentSkip > 0) {
      const previous = document.createElement('button');
      previous.className = 'btn btn-secondary btn-sm';
      previous.textContent = 'Previous';
      previous.addEventListener('click', () => {
        currentSkip = Math.max(0, currentSkip - LIMIT);
        loadJobs();
      });
      pagination.appendChild(previous);
    }

    if (resultLength === LIMIT) {
      const next = document.createElement('button');
      next.className = 'btn btn-secondary btn-sm';
      next.textContent = 'Next';
      next.addEventListener('click', () => {
        currentSkip += LIMIT;
        loadJobs();
      });
      pagination.appendChild(next);
    }
  }

  async function clearAllJobs() {
    if (!confirm('Delete all scraped jobs? This cannot be undone.')) return;
    try {
      const result = await api.clearJobs();
      sessionStorage.removeItem('jobsnipe:lastScrape');
      window.showToast(`Deleted ${result.deleted} jobs.`, 'info');
      currentSkip = 0;
      loadJobs();
    } catch (error) {
      window.showToast(error.message, 'error');
    }
  }
}
