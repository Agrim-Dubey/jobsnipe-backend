// Outreach — Email contacts, no emojis
import { api } from '../api.js';
import { withLayout } from './layout.js';

export function renderOutreach(container) {
  withLayout(container, 'outreach', `
    <div class="page-header">
      <div>
        <h1>Email Contacts</h1>
        <p class="subtitle">HR and recruiter emails found in job listings. Click to compose.</p>
      </div>
    </div>
    <div id="contacts-list" class="jobs-list">
      <div class="empty-state"><div class="loading-spinner"></div><p style="margin-top:10px">Loading contacts...</p></div>
    </div>
  `);
  loadOutreach();

  async function loadOutreach() {
    const el = document.getElementById('contacts-list');
    try {
      const jobs = await api.getJobs({ limit: 200 });
      const contactJobs = jobs.filter(j => j.emails && j.emails.length > 0);
      if (contactJobs.length === 0) {
        el.innerHTML = `<div class="empty-state"><h3>No contacts found yet</h3><p>Run scrapes to find HR and recruiter email addresses from job listings.</p></div>`;
        return;
      }
      el.innerHTML = `<p style="font-size:.82rem;color:var(--text-2);margin-bottom:12px">${contactJobs.length} jobs with email contacts found</p>` +
        contactJobs.map((j, i) => `
        <div class="job-card" style="animation-delay:${i * 0.03}s">
          <div class="job-main">
            <div class="job-title"><a href="${j.job_url}" target="_blank" rel="noopener">${esc(j.title)}</a></div>
            <div class="job-meta">
              ${j.company ? `<span>${esc(j.company)}</span>` : ''}
              ${j.location ? `<span>${esc(j.location)}</span>` : ''}
              <span>${esc(j.source)}</span>
            </div>
            <div class="email-row">
              ${j.emails.map(email => `
                <div class="email-chip">
                  <a href="mailto:${email}" title="Compose email to ${email}">${email}</a>
                  <button onclick="navigator.clipboard.writeText('${email}');window.showToast('Copied','success')" title="Copy">copy</button>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      `).join('');
    } catch (e) {
      el.innerHTML = `<div class="empty-state"><h3>Error</h3><p>${e.message}</p></div>`;
    }
  }
}

function esc(str) { if (!str) return ''; const d = document.createElement('div'); d.textContent = str; return d.innerHTML; }
