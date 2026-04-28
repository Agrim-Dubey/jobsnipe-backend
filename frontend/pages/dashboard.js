import { api } from '../api.js';
import {
  bindCurrencyInputs,
  bindExchangeRateNote,
  ensureExchangeRate,
  getSalaryDisplayParts,
} from '../utils/salary.js';
import { withLayout } from './layout.js';

export const SKILL_OPTIONS = [
  'Python',
  'Django',
  'FastAPI',
  'Flask',
  'Java',
  'Spring',
  'C',
  'C++',
  'JavaScript',
  'TypeScript',
  'React',
  'Node.js',
  'Go',
  'Rust',
  'AWS',
  'Docker',
  'Kubernetes',
  'PostgreSQL',
];

const ROLE_OPTIONS = [
  { label: 'Software Engineer', role: 'Software Engineer', skills: [] },
  { label: 'Backend Developer', role: 'Backend Developer', skills: [] },
  { label: 'Python Developer', role: 'Python Developer', skills: ['Python'] },
  { label: 'Django Developer', role: 'Django Developer', skills: ['Python', 'Django'] },
  { label: 'FastAPI Developer', role: 'FastAPI Developer', skills: ['Python', 'FastAPI'] },
  { label: 'Java Developer', role: 'Java Developer', skills: ['Java'] },
  { label: 'Spring Boot Developer', role: 'Spring Boot Developer', skills: ['Java', 'Spring'] },
  { label: 'Frontend Developer', role: 'Frontend Developer', skills: ['JavaScript', 'React'] },
  { label: 'Full Stack Developer', role: 'Full Stack Developer', skills: ['JavaScript', 'React', 'Node.js'] },
  { label: 'C Developer', role: 'C Developer', skills: ['C'] },
  { label: 'C++ Developer', role: 'C++ Developer', skills: ['C++'] },
  { label: 'Software Engineer Intern', role: 'Software Engineer Intern', skills: [], jobType: 'intern' },
  { label: 'Custom Role', role: '', skills: [], custom: true },
];

const SEARCH_PRESETS = [
  { label: 'Python / Django', role: 'Django Developer', skills: ['Python', 'Django'] },
  { label: 'FastAPI', role: 'FastAPI Developer', skills: ['Python', 'FastAPI'] },
  { label: 'Java / Spring', role: 'Spring Boot Developer', skills: ['Java', 'Spring'] },
  { label: 'C / C++', role: 'C++ Developer', skills: ['C', 'C++'] },
  { label: 'Frontend', role: 'Frontend Developer', skills: ['JavaScript', 'React'] },
  { label: 'Internships', role: 'Software Engineer Intern', skills: [], jobType: 'intern' },
];

const LAST_SCRAPE_KEY = 'jobsnipe:lastScrape';

export function renderDashboard(container) {
  ensureExchangeRate();
  withLayout(container, 'dashboard', `
    <div class="page-header">
      <h1>Dashboard</h1>
    </div>

    <div class="search-panel">
      <h2>Curated Job Search</h2>
      <div class="search-row">
        <div class="input-group">
          <label>Role Preset</label>
          <select id="role-select">
            <option value="">Choose a role</option>
            ${ROLE_OPTIONS.map((option) => `
              <option value="${option.label}">${option.label}</option>
            `).join('')}
          </select>
        </div>
        <div class="input-group" style="flex: 2;">
          <label>Role Query</label>
          <input class="input" id="search-role" placeholder="Python Developer, Backend Developer, Software Engineer Intern" />
        </div>
        <div class="input-group">
          <label>Location</label>
          <input class="input" id="search-location" placeholder="Remote, USA, Bangalore, London" />
        </div>
      </div>

      <div class="filter-row">
        <div class="input-group">
          <label>Job Type</label>
          <select id="filter-type">
            <option value="">All Types</option>
            <option value="intern">Internship</option>
            <option value="fulltime">Full-Time</option>
            <option value="contract">Contract</option>
          </select>
        </div>
        <div class="input-group">
          <label>Min Salary (USD)</label>
          <input type="number" class="input" id="filter-salary-usd" placeholder="80000" min="0" />
        </div>
        <div class="input-group">
          <label>Min Salary (INR)</label>
          <input type="number" class="input" id="filter-salary-inr" placeholder="6680000" min="0" />
        </div>
        <div class="input-group" style="display:flex;align-items:flex-end;">
          <button class="btn btn-primary btn-lg" id="search-btn" style="width:100%;">Search Curated Jobs</button>
        </div>
      </div>

      <p class="fx-note" id="dashboard-fx-note">Loading live salary conversion...</p>

      <div class="input-group skill-picker-group">
        <label>Skills / Stack</label>
        <div class="skill-picker" id="skill-picker">
          ${SKILL_OPTIONS.map((skill) => `
            <button type="button" class="skill-toggle" data-skill="${skill}">${skill}</button>
          `).join('')}
        </div>
      </div>

      <div class="chip-row">
        ${SEARCH_PRESETS.map((preset) => `
          <button type="button" class="chip preset-chip" data-role="${preset.role}" data-skills="${preset.skills.join(',')}" data-job-type="${preset.jobType || ''}">
            ${preset.label}
          </button>
        `).join('')}
      </div>

      <div class="scrape-progress" id="scrape-progress">
        <div class="progress-bar-wrap"><div class="progress-bar" id="progress-bar"></div></div>
        <div class="progress-text" id="progress-text">Searching curated openings...</div>
      </div>
    </div>

    <div class="page-header page-header-tight">
      <div>
        <h2 id="results-title">Latest Scrape</h2>
        <p class="subtitle" id="results-subtitle">Each new search will show the exact jobs scraped for that query.</p>
      </div>
      <a href="#/jobs" class="btn btn-secondary btn-sm">View all jobs</a>
    </div>

    <div id="scrape-summary"></div>
    <div id="results-list" class="jobs-list">
      <div class="empty-state"><div class="loading-spinner"></div><p style="margin-top:10px">Loading...</p></div>
    </div>
  `);

  bindDashboardInteractions();
  hydrateDashboard();
}

function bindDashboardInteractions() {
  const roleSelect = document.getElementById('role-select');
  const roleInput = document.getElementById('search-role');
  const locationInput = document.getElementById('search-location');
  const salaryUsdInput = document.getElementById('filter-salary-usd');
  const salaryInrInput = document.getElementById('filter-salary-inr');

  bindCurrencyInputs(salaryUsdInput, salaryInrInput);
  bindExchangeRateNote(document.getElementById('dashboard-fx-note'));

  document.getElementById('search-btn').addEventListener('click', runScrape);

  roleSelect.addEventListener('change', () => {
    const selected = ROLE_OPTIONS.find((option) => option.label === roleSelect.value);
    if (!selected) return;
    roleInput.value = selected.role || '';
    document.getElementById('filter-type').value = selected.jobType || '';
    setActiveSkills(selected.skills || []);
    if (selected.custom) roleInput.focus();
  });

  roleInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') runScrape();
  });
  locationInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') runScrape();
  });

  document.querySelectorAll('.skill-toggle').forEach((button) => {
    button.addEventListener('click', () => {
      button.classList.toggle('active');
    });
  });

  document.querySelectorAll('.preset-chip').forEach((button) => {
    button.addEventListener('click', () => {
      roleInput.value = button.dataset.role || '';
      document.getElementById('filter-type').value = button.dataset.jobType || '';
      syncRoleSelect(button.dataset.role || '');
      setActiveSkills((button.dataset.skills || '').split(',').filter(Boolean));
    });
  });
}

function hydrateDashboard() {
  const savedScrape = readLastScrape();
  if (savedScrape) {
    applySavedQuery(savedScrape.query || {});
    renderScrapeSummary(savedScrape);
    renderJobResults(savedScrape.jobs || [], savedScrape.query);
    return;
  }
  loadRecentJobs();
}

function getSelectedSkills() {
  return Array.from(document.querySelectorAll('.skill-toggle.active')).map((button) => button.dataset.skill);
}

function setActiveSkills(skills) {
  const selected = new Set(skills || []);
  document.querySelectorAll('.skill-toggle').forEach((button) => {
    button.classList.toggle('active', selected.has(button.dataset.skill));
  });
}

function syncRoleSelect(role) {
  const roleSelect = document.getElementById('role-select');
  const matched = ROLE_OPTIONS.find((option) => option.role === role);
  roleSelect.value = matched ? matched.label : 'Custom Role';
}

function applySavedQuery(query) {
  document.getElementById('search-role').value = query.role || '';
  document.getElementById('search-location').value = query.location || '';
  document.getElementById('filter-type').value = query.jobType || '';
  const salaryUsd = document.getElementById('filter-salary-usd');
  salaryUsd.value = query.minSalary || '';
  syncRoleSelect(query.role || '');
  setActiveSkills(query.skills || []);
  if (salaryUsd.value) {
    salaryUsd.dispatchEvent(new Event('input'));
  }
}

async function loadRecentJobs() {
  const el = document.getElementById('results-list');
  const summaryEl = document.getElementById('scrape-summary');
  if (!el || !summaryEl) return;

  summaryEl.innerHTML = '';
  try {
    const jobs = await api.getJobs({ limit: 15 });
    if (jobs.length === 0) {
      el.innerHTML = `<div class="empty-state"><h3>No jobs yet</h3><p>Start a curated search above and we will show the exact openings scraped for that search.</p></div>`;
      return;
    }
    document.getElementById('results-title').textContent = 'Recent Curated Jobs';
    document.getElementById('results-subtitle').textContent = 'These are the latest jobs already stored for your account.';
    el.innerHTML = jobs.map((job, index) => jobCardHTML(job, index)).join('');
    attachJobActions(el);
  } catch (error) {
    el.innerHTML = `<div class="empty-state"><h3>No jobs yet</h3><p>Run a search to start collecting openings.</p></div>`;
  }
}

async function runScrape() {
  const roleInput = document.getElementById('search-role');
  const locationInput = document.getElementById('search-location');
  const btn = document.getElementById('search-btn');
  const progress = document.getElementById('scrape-progress');
  const bar = document.getElementById('progress-bar');
  const text = document.getElementById('progress-text');
  const skills = getSelectedSkills();
  const jobType = document.getElementById('filter-type').value;
  const minSalaryValue = document.getElementById('filter-salary-usd').value;

  const role = roleInput.value.trim();
  const location = locationInput.value.trim();
  const minSalary = minSalaryValue ? parseInt(minSalaryValue, 10) : null;

  if (!role) {
    window.showToast('Choose or type a role before scraping.', 'error');
    roleInput.focus();
    return;
  }

  btn.disabled = true;
  btn.textContent = 'Searching...';
  progress.classList.add('active');
  bar.style.width = '20%';
  text.textContent = `Scanning job boards for ${role}...`;

  try {
    bar.style.width = '55%';
    text.textContent = 'Filtering out weak listings and enriching job details...';

    const result = await api.scrape({
      roles: [role],
      locations: location ? [location] : [],
      skills,
      min_salary: minSalary,
      job_type: jobType || null,
    });

    const scrapePayload = {
      ...result,
      query: {
        role,
        location,
        skills,
        jobType,
        minSalary,
      },
    };

    writeLastScrape(scrapePayload);
    renderScrapeSummary(scrapePayload);
    renderJobResults(result.jobs || [], scrapePayload.query);

    bar.style.width = '100%';
    window.showToast(`Saved ${result.total_new} new jobs from ${result.total_found} curated openings.`, result.total_new > 0 ? 'success' : 'info');
  } catch (error) {
    text.textContent = `Error: ${error.message}`;
    window.showToast(error.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Search Curated Jobs';
    setTimeout(() => progress.classList.remove('active'), 3500);
  }
}

function renderScrapeSummary(scrapePayload) {
  const summaryEl = document.getElementById('scrape-summary');
  if (!summaryEl) return;

  const stats = Object.entries(scrapePayload.stats || {});
  const errors = scrapePayload.errors || [];
  const query = scrapePayload.query || {};

  summaryEl.innerHTML = `
    <section class="scrape-summary-card">
      <div class="scrape-summary-top">
        <div>
          <h3>Current scrape</h3>
          <p class="subtitle">Role: ${escapeHtml(query.role || 'Not set')} ${query.location ? `| Location: ${escapeHtml(query.location)}` : ''}</p>
        </div>
        <div class="scrape-summary-metrics">
          <div><strong>${scrapePayload.total_found}</strong><span>matched jobs</span></div>
          <div><strong>${scrapePayload.total_new}</strong><span>newly saved</span></div>
        </div>
      </div>
      ${stats.length ? `
        <div class="scrape-source-grid">
          ${stats.map(([source, counts]) => `
            <div class="scrape-source-item">
              <span>${escapeHtml(source)}</span>
              <strong>${typeof counts === 'number' ? counts : `${counts.kept || 0} kept`}</strong>
              <small>${typeof counts === 'number' ? 'raw scraped' : `${counts.raw || 0} raw scraped`}</small>
            </div>
          `).join('')}
        </div>
      ` : ''}
      ${errors.length ? `
        <div class="scrape-error-box">
          <span class="job-detail-label">Source issues</span>
          <ul>
            ${errors.map((error) => `<li>${escapeHtml(error)}</li>`).join('')}
          </ul>
        </div>
      ` : ''}
    </section>
  `;
}

function renderJobResults(jobs, query) {
  const el = document.getElementById('results-list');
  if (!el) return;

  document.getElementById('results-title').textContent = query?.role ? `Results for "${query.role}"` : 'Latest Scrape';
  document.getElementById('results-subtitle').textContent = jobs.length
    ? 'These are the exact jobs returned for this scrape, including captured emails and source details.'
    : 'No curated job openings matched this scrape after cleanup.';

  if (!jobs.length) {
    el.innerHTML = `<div class="empty-state"><h3>No curated openings found</h3><p>Try a different role, add a location, or relax the salary filter.</p></div>`;
    return;
  }

  el.innerHTML = jobs.map((job, index) => jobCardHTML(job, index)).join('');
  attachJobActions(el);
}

function readLastScrape() {
  try {
    const raw = sessionStorage.getItem(LAST_SCRAPE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    return null;
  }
}

function writeLastScrape(payload) {
  sessionStorage.setItem(LAST_SCRAPE_KEY, JSON.stringify(payload));
}

function updateStoredJob(jobId, updater) {
  const current = readLastScrape();
  if (!current?.jobs?.length) return;
  current.jobs = current.jobs.map((job) => (job.id === jobId ? updater(job) : job));
  writeLastScrape(current);
}

export function jobCardHTML(job, index = 0) {
  const hasEmails = Array.isArray(job.emails) && job.emails.length > 0;
  const description = job.description ? escapeHtml(job.description) : 'No description captured yet.';
  const sourceLabel = escapeHtml(job.source.replace('reddit/r/', 'reddit: ').replace('hn_hiring', 'Hacker News'));
  const salary = getSalaryDisplayParts(job.salary);

  return `
    <article class="job-card ${job.is_saved ? 'saved' : ''}" data-id="${job.id}" style="animation-delay:${index * 0.03}s;">
      <div class="job-header">
        <button class="job-summary" type="button" data-action="toggle-details" data-id="${job.id}" aria-expanded="false">
          <div class="job-title-row">
            <div>
              <div class="job-title">${escapeHtml(job.title)}</div>
              <div class="job-meta">
                <span>${escapeHtml(job.company || 'Company not listed')}</span>
                <span>${escapeHtml(job.location || 'Location not listed')}</span>
                <span>${sourceLabel}</span>
                <span>${timeAgo(job.scraped_at)}</span>
              </div>
            </div>
            <span class="salary-pill ${job.salary ? '' : 'muted'}">
              <span>${escapeHtml(salary.primary)}</span>
              ${salary.secondary ? `<small>${escapeHtml(salary.secondary)}</small>` : ''}
            </span>
          </div>
          <div class="job-preview">${description}</div>
          <div class="job-summary-footer">
            <span class="job-expand-indicator">${hasEmails ? `${job.emails.length} email contact${job.emails.length > 1 ? 's' : ''} captured` : 'Open full details'}</span>
          </div>
        </button>

        <div class="job-actions">
          <a class="btn btn-secondary btn-sm" href="${job.job_url}" target="_blank" rel="noopener">Open Job</a>
          <button class="job-action-btn ${job.is_saved ? 'active' : ''}" data-action="save" data-id="${job.id}" title="Save job">
            ${job.is_saved ? 'Saved' : 'Save'}
          </button>
        </div>
      </div>

      <div class="job-details">
        <div class="job-detail-grid">
          <div class="job-detail-item">
            <span class="job-detail-label">Role</span>
            <span>${escapeHtml(job.title)}</span>
          </div>
          <div class="job-detail-item">
            <span class="job-detail-label">Company</span>
            <span>${escapeHtml(job.company || 'Not listed')}</span>
          </div>
          <div class="job-detail-item">
            <span class="job-detail-label">Location</span>
            <span>${escapeHtml(job.location || 'Not listed')}</span>
          </div>
          <div class="job-detail-item">
            <span class="job-detail-label">Salary</span>
            <span>${escapeHtml(salary.primary)}</span>
            ${salary.secondary ? `<small>${escapeHtml(salary.secondary)}</small>` : ''}
          </div>
          <div class="job-detail-item">
            <span class="job-detail-label">Scraped From</span>
            <span>${sourceLabel}</span>
          </div>
          <div class="job-detail-item">
            <span class="job-detail-label">Job Link</span>
            <a href="${job.job_url}" target="_blank" rel="noopener">Open original listing</a>
          </div>
        </div>

        <div class="job-detail-block">
          <span class="job-detail-label">Description</span>
          <p>${description}</p>
        </div>

        <div class="job-detail-block">
          <span class="job-detail-label">Captured Emails</span>
          ${hasEmails ? `
            <div class="email-row">
              ${job.emails.map((email) => `
                <div class="email-chip">
                  <a href="mailto:${email}" class="job-email-link">${escapeHtml(email)}</a>
                  <button type="button" data-action="copy-email" data-email="${escapeAttribute(email)}">Copy</button>
                </div>
              `).join('')}
            </div>
          ` : '<p>No direct hiring email was found for this listing.</p>'}
        </div>
      </div>
    </article>
  `;
}

export function attachJobActions(container) {
  if (container.dataset.boundActions === 'true') return;
  container.dataset.boundActions = 'true';

  container.addEventListener('click', async (event) => {
    const actionEl = event.target.closest('[data-action]');
    if (!actionEl || !container.contains(actionEl)) return;

    const action = actionEl.dataset.action;
    const card = actionEl.closest('.job-card');
    if (!card) return;

    if (action === 'toggle-details') {
      const expanded = card.classList.toggle('expanded');
      actionEl.setAttribute('aria-expanded', expanded ? 'true' : 'false');
      return;
    }

    if (action === 'copy-email') {
      try {
        await navigator.clipboard.writeText(actionEl.dataset.email || '');
        window.showToast('Email copied.', 'success');
      } catch (error) {
        window.showToast('Could not copy email.', 'error');
      }
      return;
    }

    if (action === 'save') {
      const id = Number(actionEl.dataset.id);
      const isSaved = actionEl.classList.contains('active');
      try {
        await api.updateJob(id, { is_saved: !isSaved });
        actionEl.classList.toggle('active');
        actionEl.textContent = isSaved ? 'Save' : 'Saved';
        card.classList.toggle('saved', !isSaved);
        updateStoredJob(id, (job) => ({ ...job, is_saved: !isSaved }));
        window.showToast(isSaved ? 'Removed from saved jobs.' : 'Saved job.', 'success');
      } catch (error) {
        window.showToast(error.message, 'error');
      }
    }
  });
}

function escapeHtml(value) {
  if (!value) return '';
  const div = document.createElement('div');
  div.textContent = value;
  return div.innerHTML;
}

function escapeAttribute(value) {
  return escapeHtml(value).replace(/"/g, '&quot;');
}

function timeAgo(dateStr) {
  const date = new Date(dateStr);
  const diff = (Date.now() - date.getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}
