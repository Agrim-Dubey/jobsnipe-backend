// Preferences — no emojis, clickable suggestions
import { api } from '../api.js';
import { bindCurrencyInputs, bindExchangeRateNote, ensureExchangeRate, usdToInr } from '../utils/salary.js';
import { withLayout } from './layout.js';

const ROLE_SUGGESTIONS = [
  'Software Engineer', 'Software Engineer Intern', 'Frontend Developer',
  'Backend Engineer', 'Full Stack Developer', 'Data Scientist',
  'ML Engineer', 'DevOps Engineer', 'Cloud Engineer',
  'Mobile Developer', 'Product Manager', 'UI/UX Designer',
  'Data Analyst', 'Data Analyst Intern', 'QA Engineer', 'Security Engineer',
  'Java Spring Developer', 'Python Django Developer', 'FastAPI Backend Engineer',
  'C++ Systems Engineer', 'Platform Engineer',
];
const SKILL_SUGGESTIONS = [
  'Python', 'JavaScript', 'TypeScript', 'React', 'Node.js', 'Go', 'Rust',
  'Java', 'Spring', 'Spring Boot', 'C', 'C++', 'AWS', 'Docker', 'Kubernetes',
  'PostgreSQL', 'MongoDB', 'Redis', 'GraphQL', 'Next.js', 'Vue.js', 'Django',
  'FastAPI', 'Flask', '.NET', 'Express', 'TensorFlow', 'PyTorch', 'Git', 'Linux',
  'SQL', 'REST API',
];
const LOCATION_SUGGESTIONS = [
  'Remote', 'USA', 'UK', 'India', 'Germany', 'Canada', 'Singapore',
  'San Francisco', 'New York', 'London', 'Berlin', 'Bangalore', 'Toronto',
];

export function renderPreferences(container) {
  ensureExchangeRate();
  withLayout(container, 'preferences', `
    <div class="page-header"><h1>Settings</h1></div>
    <div id="pref-content"><div class="empty-state"><div class="loading-spinner"></div><p style="margin-top:10px">Loading...</p></div></div>
  `);
  loadPreferences();
}

async function loadPreferences() {
  const el = document.getElementById('pref-content');
  let prefs = null, isEdit = false;
  try { prefs = await api.getPreferences(); isEdit = true; } catch(e) {}

  el.innerHTML = `
    <div class="scrape-panel">
      <form id="pref-form" class="pref-form">
        <div class="input-group full-width">
          <label>Desired Roles</label>
          <div class="tag-input-wrapper" id="roles-wrapper">
            ${(prefs?.desired_roles||[]).map(r=>tagHTML(r)).join('')}
            <input type="text" id="roles-input" placeholder="Type and press Enter" />
          </div>
          <div class="chip-row">${ROLE_SUGGESTIONS.filter(r=>!(prefs?.desired_roles||[]).includes(r)).slice(0,10).map(r=>`<span class="chip" data-target="roles-wrapper" data-value="${r}">${r}</span>`).join('')}</div>
        </div>
        <div class="input-group full-width">
          <label>Target Locations</label>
          <div class="tag-input-wrapper" id="locations-wrapper">
            ${(prefs?.preferred_locations||[]).map(l=>tagHTML(l)).join('')}
            <input type="text" id="locations-input" placeholder="Type and press Enter" />
          </div>
          <div class="chip-row">${LOCATION_SUGGESTIONS.filter(l=>!(prefs?.preferred_locations||[]).includes(l)).slice(0,8).map(l=>`<span class="chip" data-target="locations-wrapper" data-value="${l}">${l}</span>`).join('')}</div>
        </div>
        <div style="display:flex;gap:12px;flex-wrap:wrap">
          <div class="input-group" style="flex:1;min-width:160px">
            <label>Work Mode</label>
            <select id="remote-pref">
              <option value="remote" ${prefs?.remote_preference==='remote'?'selected':''}>Remote</option>
              <option value="hybrid" ${prefs?.remote_preference==='hybrid'?'selected':''}>Hybrid</option>
              <option value="onsite" ${prefs?.remote_preference==='onsite'?'selected':''}>Onsite</option>
            </select>
          </div>
          <div class="input-group" style="flex:1;min-width:160px">
            <label>Experience Level</label>
            <select id="exp-level">
              <option value="fresher" ${prefs?.experience_level==='fresher'?'selected':''}>Intern / Entry</option>
              <option value="mid" ${prefs?.experience_level==='mid'?'selected':''}>Mid-Level</option>
              <option value="senior" ${prefs?.experience_level==='senior'?'selected':''}>Senior / Lead</option>
            </select>
          </div>
        </div>
        <div style="display:flex;gap:12px;flex-wrap:wrap">
          <div class="input-group" style="flex:1;min-width:160px">
            <label>Min Salary (USD)</label>
            <input class="input" type="number" id="min-salary-usd" placeholder="e.g. 50000" value="${prefs?.min_salary||''}" />
          </div>
          <div class="input-group" style="flex:1;min-width:160px">
            <label>Min Salary (INR)</label>
            <input class="input" type="number" id="min-salary-inr" placeholder="e.g. 4175000" value="${prefs?.min_salary ? usdToInr(prefs.min_salary) : ''}" />
          </div>
        </div>
        <div style="display:flex;gap:12px;flex-wrap:wrap">
          <div class="input-group" style="flex:1;min-width:160px">
            <label>Max Salary (USD)</label>
            <input class="input" type="number" id="max-salary-usd" placeholder="e.g. 150000" value="${prefs?.max_salary||''}" />
          </div>
          <div class="input-group" style="flex:1;min-width:160px">
            <label>Max Salary (INR)</label>
            <input class="input" type="number" id="max-salary-inr" placeholder="e.g. 12525000" value="${prefs?.max_salary ? usdToInr(prefs.max_salary) : ''}" />
          </div>
        </div>
        <p class="fx-note" id="preferences-fx-note">Loading live salary conversion...</p>
        <div class="input-group full-width">
          <label>Skills & Technologies</label>
          <div class="tag-input-wrapper" id="skills-wrapper">
            ${(prefs?.skills||[]).map(s=>tagHTML(s)).join('')}
            <input type="text" id="skills-input" placeholder="Type and press Enter" />
          </div>
          <div class="chip-row">${SKILL_SUGGESTIONS.filter(s=>!(prefs?.skills||[]).includes(s)).slice(0,14).map(s=>`<span class="chip" data-target="skills-wrapper" data-value="${s}">${s}</span>`).join('')}</div>
        </div>
        <div class="full-width" style="margin-top:8px;border-top:1px solid var(--border);padding-top:16px">
          <button type="submit" class="btn btn-primary btn-lg" id="pref-save-btn" style="width:100%">
            ${isEdit ? 'Update Preferences' : 'Save & Start Searching'}
          </button>
        </div>
      </form>
    </div>
  `;

  setupTagInput('roles-wrapper','roles-input');
  setupTagInput('locations-wrapper','locations-input');
  setupTagInput('skills-wrapper','skills-input');
  bindCurrencyInputs(document.getElementById('min-salary-usd'), document.getElementById('min-salary-inr'));
  bindCurrencyInputs(document.getElementById('max-salary-usd'), document.getElementById('max-salary-inr'));
  bindExchangeRateNote(document.getElementById('preferences-fx-note'));

  document.querySelectorAll('.chip[data-target]').forEach(chip => {
    chip.addEventListener('click', () => {
      const wrapper = document.getElementById(chip.dataset.target);
      const input = wrapper.querySelector('input');
      const existing = getTagValues(chip.dataset.target);
      if (existing.includes(chip.dataset.value)) return;
      const span = document.createElement('span');
      span.className = 'tag'; span.dataset.value = chip.dataset.value;
      span.innerHTML = `${chip.dataset.value}<button type="button" onclick="this.parentElement.remove()">x</button>`;
      wrapper.insertBefore(span, input);
      chip.remove();
    });
  });

  document.getElementById('pref-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('pref-save-btn');
    btn.disabled = true; btn.textContent = 'Saving...';
    const data = {
      desired_roles: getTagValues('roles-wrapper'),
      preferred_locations: getTagValues('locations-wrapper'),
      remote_preference: document.getElementById('remote-pref').value,
      experience_level: document.getElementById('exp-level').value,
      min_salary: parseInt(document.getElementById('min-salary-usd').value) || null,
      max_salary: parseInt(document.getElementById('max-salary-usd').value) || null,
      skills: getTagValues('skills-wrapper'),
    };
    if (!data.desired_roles.length) { window.showToast('Add at least one role','error'); btn.disabled=false; btn.textContent='Save'; return; }
    if (!data.skills.length) { window.showToast('Add at least one skill','error'); btn.disabled=false; btn.textContent='Save'; return; }
    if (data.min_salary && data.max_salary && data.min_salary > data.max_salary) {
      window.showToast('Min salary cannot be greater than max salary.','error');
      btn.disabled = false;
      btn.textContent = isEdit ? 'Update Preferences' : 'Save & Start Searching';
      return;
    }
    try {
      if (isEdit) await api.updatePreferences(data); else await api.createPreferences(data);
      window.showToast('Preferences saved','success');
      btn.textContent = 'Update Preferences'; isEdit = true;
    } catch(err) { window.showToast(err.message,'error'); }
    finally { btn.disabled = false; }
  });
}

function tagHTML(v) { return `<span class="tag" data-value="${v}">${v}<button type="button" onclick="this.parentElement.remove()">x</button></span>`; }
function setupTagInput(wId, iId) {
  const input = document.getElementById(iId);
  if (!input) return;
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const val = input.value.trim(); if (!val) return;
      const wrapper = document.getElementById(wId);
      if (getTagValues(wId).includes(val)) return;
      const span = document.createElement('span');
      span.className='tag'; span.dataset.value=val;
      span.innerHTML=`${val}<button type="button" onclick="this.parentElement.remove()">x</button>`;
      wrapper.insertBefore(span, input); input.value='';
    }
  });
}
function getTagValues(wId) {
  const w = document.getElementById(wId);
  return w ? Array.from(w.querySelectorAll('.tag')).map(t=>t.dataset.value) : [];
}
