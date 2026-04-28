(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const i of document.querySelectorAll('link[rel="modulepreload"]'))n(i);new MutationObserver(i=>{for(const s of i)if(s.type==="childList")for(const l of s.addedNodes)l.tagName==="LINK"&&l.rel==="modulepreload"&&n(l)}).observe(document,{childList:!0,subtree:!0});function a(i){const s={};return i.integrity&&(s.integrity=i.integrity),i.referrerPolicy&&(s.referrerPolicy=i.referrerPolicy),i.crossOrigin==="use-credentials"?s.credentials="include":i.crossOrigin==="anonymous"?s.credentials="omit":s.credentials="same-origin",s}function n(i){if(i.ep)return;i.ep=!0;const s=a(i);fetch(i.href,s)}})();const D="/api";let E=localStorage.getItem("accessToken"),k=localStorage.getItem("refreshToken");function q(e,t){E=e,k=t,localStorage.setItem("accessToken",e),localStorage.setItem("refreshToken",t)}function K(){E=null,k=null,localStorage.removeItem("accessToken"),localStorage.removeItem("refreshToken"),localStorage.removeItem("userEmail")}function _(){return!!E}async function v(e,t,a=null,n=!0){const i={method:e,headers:{"Content-Type":"application/json"}};E&&(i.headers.Authorization=`Bearer ${E}`),a&&(i.body=JSON.stringify(a));let s=await fetch(`${D}${t}`,i);if(s.status===401&&k&&n){const l=await fetch(`${D}/auth/refresh`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({refresh_token:k})});if(l.ok){const o=await l.json();q(o.access_token,o.refresh_token),i.headers.Authorization=`Bearer ${o.access_token}`,s=await fetch(`${D}${t}`,i)}else throw K(),window.location.hash="#/login",new Error("Session expired")}if(!s.ok){const l=await s.json().catch(()=>({detail:"Request failed"}));throw new Error(l.detail||`HTTP ${s.status}`)}return s.json()}const p={register:(e,t)=>v("POST","/auth/register",{email:e,password:t}),login:(e,t)=>v("POST","/auth/login",{email:e,password:t}),getPreferences:()=>v("GET","/preferences/me"),createPreferences:e=>v("POST","/preferences",e),updatePreferences:e=>v("PATCH","/preferences",e),getSources:()=>v("GET","/jobs/sources"),getExchangeRate:()=>v("GET","/jobs/exchange-rate"),scrape:(e={})=>v("POST","/jobs/scrape",e),getJobs:(e={})=>{const t=new URLSearchParams;return Object.entries(e).forEach(([a,n])=>{n!=null&&n!==""&&t.set(a,n)}),v("GET",`/jobs?${t.toString()}`)},updateJob:(e,t)=>v("PATCH",`/jobs/${e}`,t),getStats:()=>v("GET","/jobs/stats"),clearJobs:()=>v("DELETE","/jobs/all")};function se(e){e.innerHTML=`
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
  `,document.getElementById("login-form").addEventListener("submit",async t=>{t.preventDefault();const a=document.getElementById("login-btn"),n=document.getElementById("auth-error"),i=document.getElementById("login-email").value,s=document.getElementById("login-password").value;a.disabled=!0,a.textContent="Signing in...",n.classList.remove("visible");try{const l=await p.login(i,s);q(l.access_token,l.refresh_token),localStorage.setItem("userEmail",i),window.showToast("Welcome back","success"),window.location.hash="#/dashboard"}catch(l){n.textContent=l.message,n.classList.add("visible"),a.disabled=!1,a.textContent="Sign In"}})}function ie(e){e.innerHTML=`
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
  `,document.getElementById("register-form").addEventListener("submit",async t=>{t.preventDefault();const a=document.getElementById("reg-btn"),n=document.getElementById("auth-error"),i=document.getElementById("reg-email").value,s=document.getElementById("reg-password").value;a.disabled=!0,a.textContent="Creating...",n.classList.remove("visible");try{await p.register(i,s),window.showToast("Account created! Sign in now.","success"),window.location.hash="#/login"}catch(l){n.textContent=l.message,n.classList.add("visible"),a.disabled=!1,a.textContent="Create Account"}})}const Q="jobsnipe:usdInrRate",le=83.5,g=oe();let b={rate:(g==null?void 0:g.rate)||le,live:!!(g!=null&&g.live),asOf:(g==null?void 0:g.asOf)||null,updatedAt:(g==null?void 0:g.updatedAt)||null},h=null;const M=new Set;function oe(){try{const e=localStorage.getItem(Q);return e?JSON.parse(e):null}catch{return null}}function re(e){try{localStorage.setItem(Q,JSON.stringify(e))}catch{}}function ce(){M.forEach(e=>{try{e({...b})}catch{}})}function j(e){if(e==null||e==="")return null;const t=Number(String(e).replace(/,/g,"").trim());return Number.isFinite(t)?t:null}function V(){return b.rate}function z(e){return typeof e!="function"?()=>{}:(M.add(e),e({...b}),()=>M.delete(e))}async function $(e=!1){return h&&!e||(h=p.getExchangeRate().then(t=>{const a=Number(t==null?void 0:t.rate);if(!Number.isFinite(a)||a<=0)throw new Error("Invalid exchange rate");return b={rate:a,live:!!t.live,asOf:t.as_of||null,updatedAt:t.updated_at||null},re(b),ce(),b}).catch(()=>b).finally(()=>{h=null})),h}function S(e){const t=j(e);return t==null?null:Math.round(t*V())}function P(e){const t=j(e);return t==null?null:Math.round(t/V())}function L(e,t){if(!e||!t)return()=>{};let a=!1;const n=()=>{if(a)return;a=!0;const l=j(e.value);t.value=l==null?"":String(S(l)),a=!1},i=()=>{if(a)return;a=!0;const l=j(t.value);e.value=l==null?"":String(P(l)),a=!1};e.addEventListener("input",n),t.addEventListener("input",i);const s=z(()=>{if(document.activeElement===e||e.value&&!t.value){n();return}if(document.activeElement===t||t.value&&!e.value){i();return}e.value?n():t.value&&i()});return $(),e.value&&!t.value?n():t.value&&!e.value&&i(),s}function H(e){if(!e)return()=>{};const t=z(a=>{const n=Math.round(a.rate);if(a.live){e.textContent=a.asOf?`Live salary conversion uses 1 USD ~= ${n} INR (market date ${a.asOf}).`:`Live salary conversion uses 1 USD ~= ${n} INR.`;return}e.textContent=`Live exchange rate is unavailable right now, using fallback 1 USD ~= ${n} INR.`});return $(),t}function A(e,t){if(e==null||!Number.isFinite(e))return null;const a=t==="INR"?"en-IN":"en-US";return new Intl.NumberFormat(a,{style:"currency",currency:t,maximumFractionDigits:0}).format(e)}function de(e){if(!e)return null;const t=e.replace(/,/g,""),a=Array.from(t.matchAll(/(\d+(?:\.\d+)?)\s*(k)?/gi)).map(n=>{let i=Number(n[1]);return n[2]&&(i*=1e3),Math.round(i)}).filter(n=>Number.isFinite(n)&&n>0);return a.length===0?null:{min:Math.min(...a),max:Math.max(...a)}}function ue(e){return e?/₹|inr|rs\.?/i.test(e)?"INR":/\$|usd/i.test(e)?"USD":null:null}function I(e,t){return e?e.min===e.max?A(e.min,t):`${A(e.min,t)} - ${A(e.max,t)}`:null}function pe(e){if(!e)return{primary:"Salary not listed",secondary:null};const t=de(e),a=ue(e);return!t||!a?{primary:e,secondary:null}:a==="USD"?{primary:I(t,"USD")||e,secondary:`Approx. ${I({min:S(t.min),max:S(t.max)},"INR")}`}:{primary:I(t,"INR")||e,secondary:`Approx. ${I({min:P(t.min),max:P(t.max)},"USD")}`}}function x(e,t,a){const n=localStorage.getItem("userEmail")||"user",i=n.charAt(0).toUpperCase();e.innerHTML=`
    <div class="dashboard">
      <aside class="sidebar">
        <div class="sidebar-logo">
          <div class="icon">JS</div>
          <span>JobSnipe</span>
        </div>
        <nav class="sidebar-nav">
          <a href="#/dashboard" class="${t==="dashboard"?"active":""}">
            <i class="nav-icon">D</i><span>Dashboard</span>
          </a>
          <a href="#/jobs" class="${t==="jobs"?"active":""}">
            <i class="nav-icon">J</i><span>All Jobs</span>
            <span class="badge" id="unseen-badge" style="display:none">0</span>
          </a>
          <a href="#/saved" class="${t==="saved"?"active":""}">
            <i class="nav-icon">S</i><span>Saved</span>
          </a>
          <a href="#/outreach" class="${t==="outreach"?"active":""}">
            <i class="nav-icon">E</i><span>Emails</span>
          </a>
          <a href="#/preferences" class="${t==="preferences"?"active":""}">
            <i class="nav-icon">P</i><span>Settings</span>
          </a>
        </nav>
        <div class="sidebar-bottom">
          <div class="user-info">
            <div class="user-avatar">${i}</div>
            <div class="user-details">
              <div class="user-email">${n}</div>
            </div>
          </div>
          <button class="btn btn-secondary btn-sm" onclick="logout()" style="width:100%;justify-content:center">
            Sign Out
          </button>
        </div>
      </aside>
      <main class="main-content" id="page-content">
        ${a}
      </main>
    </div>
  `}const W=["Python","Django","FastAPI","Flask","Java","Spring","C","C++","JavaScript","TypeScript","React","Node.js","Go","Rust","AWS","Docker","Kubernetes","PostgreSQL"],F=[{label:"Software Engineer",role:"Software Engineer",skills:[]},{label:"Backend Developer",role:"Backend Developer",skills:[]},{label:"Python Developer",role:"Python Developer",skills:["Python"]},{label:"Django Developer",role:"Django Developer",skills:["Python","Django"]},{label:"FastAPI Developer",role:"FastAPI Developer",skills:["Python","FastAPI"]},{label:"Java Developer",role:"Java Developer",skills:["Java"]},{label:"Spring Boot Developer",role:"Spring Boot Developer",skills:["Java","Spring"]},{label:"Frontend Developer",role:"Frontend Developer",skills:["JavaScript","React"]},{label:"Full Stack Developer",role:"Full Stack Developer",skills:["JavaScript","React","Node.js"]},{label:"C Developer",role:"C Developer",skills:["C"]},{label:"C++ Developer",role:"C++ Developer",skills:["C++"]},{label:"Software Engineer Intern",role:"Software Engineer Intern",skills:[],jobType:"intern"},{label:"Custom Role",role:"",skills:[],custom:!0}],me=[{label:"Python / Django",role:"Django Developer",skills:["Python","Django"]},{label:"FastAPI",role:"FastAPI Developer",skills:["Python","FastAPI"]},{label:"Java / Spring",role:"Spring Boot Developer",skills:["Java","Spring"]},{label:"C / C++",role:"C++ Developer",skills:["C","C++"]},{label:"Frontend",role:"Frontend Developer",skills:["JavaScript","React"]},{label:"Internships",role:"Software Engineer Intern",skills:[],jobType:"intern"}],Y="jobsnipe:lastScrape";function ve(e){$(),x(e,"dashboard",`
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
            ${F.map(t=>`
              <option value="${t.label}">${t.label}</option>
            `).join("")}
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
          ${W.map(t=>`
            <button type="button" class="skill-toggle" data-skill="${t}">${t}</button>
          `).join("")}
        </div>
      </div>

      <div class="chip-row">
        ${me.map(t=>`
          <button type="button" class="chip preset-chip" data-role="${t.role}" data-skills="${t.skills.join(",")}" data-job-type="${t.jobType||""}">
            ${t.label}
          </button>
        `).join("")}
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
  `),ge(),ye()}function ge(){const e=document.getElementById("role-select"),t=document.getElementById("search-role"),a=document.getElementById("search-location"),n=document.getElementById("filter-salary-usd"),i=document.getElementById("filter-salary-inr");L(n,i),H(document.getElementById("dashboard-fx-note")),document.getElementById("search-btn").addEventListener("click",N),e.addEventListener("change",()=>{const s=F.find(l=>l.label===e.value);s&&(t.value=s.role||"",document.getElementById("filter-type").value=s.jobType||"",O(s.skills||[]),s.custom&&t.focus())}),t.addEventListener("keydown",s=>{s.key==="Enter"&&N()}),a.addEventListener("keydown",s=>{s.key==="Enter"&&N()}),document.querySelectorAll(".skill-toggle").forEach(s=>{s.addEventListener("click",()=>{s.classList.toggle("active")})}),document.querySelectorAll(".preset-chip").forEach(s=>{s.addEventListener("click",()=>{t.value=s.dataset.role||"",document.getElementById("filter-type").value=s.dataset.jobType||"",X(s.dataset.role||""),O((s.dataset.skills||"").split(",").filter(Boolean))})})}function ye(){const e=te();if(e){fe(e.query||{}),Z(e),ee(e.jobs||[],e.query);return}he()}function be(){return Array.from(document.querySelectorAll(".skill-toggle.active")).map(e=>e.dataset.skill)}function O(e){const t=new Set(e||[]);document.querySelectorAll(".skill-toggle").forEach(a=>{a.classList.toggle("active",t.has(a.dataset.skill))})}function X(e){const t=document.getElementById("role-select"),a=F.find(n=>n.role===e);t.value=a?a.label:"Custom Role"}function fe(e){document.getElementById("search-role").value=e.role||"",document.getElementById("search-location").value=e.location||"",document.getElementById("filter-type").value=e.jobType||"";const t=document.getElementById("filter-salary-usd");t.value=e.minSalary||"",X(e.role||""),O(e.skills||[]),t.value&&t.dispatchEvent(new Event("input"))}async function he(){const e=document.getElementById("results-list"),t=document.getElementById("scrape-summary");if(!(!e||!t)){t.innerHTML="";try{const a=await p.getJobs({limit:15});if(a.length===0){e.innerHTML='<div class="empty-state"><h3>No jobs yet</h3><p>Start a curated search above and we will show the exact openings scraped for that search.</p></div>';return}document.getElementById("results-title").textContent="Recent Curated Jobs",document.getElementById("results-subtitle").textContent="These are the latest jobs already stored for your account.",e.innerHTML=a.map((n,i)=>B(n,i)).join(""),C(e)}catch{e.innerHTML='<div class="empty-state"><h3>No jobs yet</h3><p>Run a search to start collecting openings.</p></div>'}}}async function N(){const e=document.getElementById("search-role"),t=document.getElementById("search-location"),a=document.getElementById("search-btn"),n=document.getElementById("scrape-progress"),i=document.getElementById("progress-bar"),s=document.getElementById("progress-text"),l=be(),o=document.getElementById("filter-type").value,r=document.getElementById("filter-salary-usd").value,u=e.value.trim(),c=t.value.trim(),m=r?parseInt(r,10):null;if(!u){window.showToast("Choose or type a role before scraping.","error"),e.focus();return}a.disabled=!0,a.textContent="Searching...",n.classList.add("active"),i.style.width="20%",s.textContent=`Scanning job boards for ${u}...`;try{i.style.width="55%",s.textContent="Filtering out weak listings and enriching job details...";const y=await p.scrape({roles:[u],locations:c?[c]:[],skills:l,min_salary:m,job_type:o||null}),f={...y,query:{role:u,location:c,skills:l,jobType:o,minSalary:m}};ae(f),Z(f),ee(y.jobs||[],f.query),i.style.width="100%",window.showToast(`Saved ${y.total_new} new jobs from ${y.total_found} curated openings.`,y.total_new>0?"success":"info")}catch(y){s.textContent=`Error: ${y.message}`,window.showToast(y.message,"error")}finally{a.disabled=!1,a.textContent="Search Curated Jobs",setTimeout(()=>n.classList.remove("active"),3500)}}function Z(e){const t=document.getElementById("scrape-summary");if(!t)return;const a=Object.entries(e.stats||{}),n=e.errors||[],i=e.query||{};t.innerHTML=`
    <section class="scrape-summary-card">
      <div class="scrape-summary-top">
        <div>
          <h3>Current scrape</h3>
          <p class="subtitle">Role: ${d(i.role||"Not set")} ${i.location?`| Location: ${d(i.location)}`:""}</p>
        </div>
        <div class="scrape-summary-metrics">
          <div><strong>${e.total_found}</strong><span>matched jobs</span></div>
          <div><strong>${e.total_new}</strong><span>newly saved</span></div>
        </div>
      </div>
      ${a.length?`
        <div class="scrape-source-grid">
          ${a.map(([s,l])=>`
            <div class="scrape-source-item">
              <span>${d(s)}</span>
              <strong>${typeof l=="number"?l:`${l.kept||0} kept`}</strong>
              <small>${typeof l=="number"?"raw scraped":`${l.raw||0} raw scraped`}</small>
            </div>
          `).join("")}
        </div>
      `:""}
      ${n.length?`
        <div class="scrape-error-box">
          <span class="job-detail-label">Source issues</span>
          <ul>
            ${n.map(s=>`<li>${d(s)}</li>`).join("")}
          </ul>
        </div>
      `:""}
    </section>
  `}function ee(e,t){const a=document.getElementById("results-list");if(a){if(document.getElementById("results-title").textContent=t!=null&&t.role?`Results for "${t.role}"`:"Latest Scrape",document.getElementById("results-subtitle").textContent=e.length?"These are the exact jobs returned for this scrape, including captured emails and source details.":"No curated job openings matched this scrape after cleanup.",!e.length){a.innerHTML='<div class="empty-state"><h3>No curated openings found</h3><p>Try a different role, add a location, or relax the salary filter.</p></div>';return}a.innerHTML=e.map((n,i)=>B(n,i)).join(""),C(a)}}function te(){try{const e=sessionStorage.getItem(Y);return e?JSON.parse(e):null}catch{return null}}function ae(e){sessionStorage.setItem(Y,JSON.stringify(e))}function we(e,t){var n;const a=te();(n=a==null?void 0:a.jobs)!=null&&n.length&&(a.jobs=a.jobs.map(i=>i.id===e?t(i):i),ae(a))}function B(e,t=0){const a=Array.isArray(e.emails)&&e.emails.length>0,n=e.description?d(e.description):"No description captured yet.",i=d(e.source.replace("reddit/r/","reddit: ").replace("hn_hiring","Hacker News")),s=pe(e.salary);return`
    <article class="job-card ${e.is_saved?"saved":""}" data-id="${e.id}" style="animation-delay:${t*.03}s;">
      <div class="job-header">
        <button class="job-summary" type="button" data-action="toggle-details" data-id="${e.id}" aria-expanded="false">
          <div class="job-title-row">
            <div>
              <div class="job-title">${d(e.title)}</div>
              <div class="job-meta">
                <span>${d(e.company||"Company not listed")}</span>
                <span>${d(e.location||"Location not listed")}</span>
                <span>${i}</span>
                <span>${Se(e.scraped_at)}</span>
              </div>
            </div>
            <span class="salary-pill ${e.salary?"":"muted"}">
              <span>${d(s.primary)}</span>
              ${s.secondary?`<small>${d(s.secondary)}</small>`:""}
            </span>
          </div>
          <div class="job-preview">${n}</div>
          <div class="job-summary-footer">
            <span class="job-expand-indicator">${a?`${e.emails.length} email contact${e.emails.length>1?"s":""} captured`:"Open full details"}</span>
          </div>
        </button>

        <div class="job-actions">
          <a class="btn btn-secondary btn-sm" href="${e.job_url}" target="_blank" rel="noopener">Open Job</a>
          <button class="job-action-btn ${e.is_saved?"active":""}" data-action="save" data-id="${e.id}" title="Save job">
            ${e.is_saved?"Saved":"Save"}
          </button>
        </div>
      </div>

      <div class="job-details">
        <div class="job-detail-grid">
          <div class="job-detail-item">
            <span class="job-detail-label">Role</span>
            <span>${d(e.title)}</span>
          </div>
          <div class="job-detail-item">
            <span class="job-detail-label">Company</span>
            <span>${d(e.company||"Not listed")}</span>
          </div>
          <div class="job-detail-item">
            <span class="job-detail-label">Location</span>
            <span>${d(e.location||"Not listed")}</span>
          </div>
          <div class="job-detail-item">
            <span class="job-detail-label">Salary</span>
            <span>${d(s.primary)}</span>
            ${s.secondary?`<small>${d(s.secondary)}</small>`:""}
          </div>
          <div class="job-detail-item">
            <span class="job-detail-label">Scraped From</span>
            <span>${i}</span>
          </div>
          <div class="job-detail-item">
            <span class="job-detail-label">Job Link</span>
            <a href="${e.job_url}" target="_blank" rel="noopener">Open original listing</a>
          </div>
        </div>

        <div class="job-detail-block">
          <span class="job-detail-label">Description</span>
          <p>${n}</p>
        </div>

        <div class="job-detail-block">
          <span class="job-detail-label">Captured Emails</span>
          ${a?`
            <div class="email-row">
              ${e.emails.map(l=>`
                <div class="email-chip">
                  <a href="mailto:${l}" class="job-email-link">${d(l)}</a>
                  <button type="button" data-action="copy-email" data-email="${Ee(l)}">Copy</button>
                </div>
              `).join("")}
            </div>
          `:"<p>No direct hiring email was found for this listing.</p>"}
        </div>
      </div>
    </article>
  `}function C(e){e.dataset.boundActions!=="true"&&(e.dataset.boundActions="true",e.addEventListener("click",async t=>{const a=t.target.closest("[data-action]");if(!a||!e.contains(a))return;const n=a.dataset.action,i=a.closest(".job-card");if(i){if(n==="toggle-details"){const s=i.classList.toggle("expanded");a.setAttribute("aria-expanded",s?"true":"false");return}if(n==="copy-email"){try{await navigator.clipboard.writeText(a.dataset.email||""),window.showToast("Email copied.","success")}catch{window.showToast("Could not copy email.","error")}return}if(n==="save"){const s=Number(a.dataset.id),l=a.classList.contains("active");try{await p.updateJob(s,{is_saved:!l}),a.classList.toggle("active"),a.textContent=l?"Save":"Saved",i.classList.toggle("saved",!l),we(s,o=>({...o,is_saved:!l})),window.showToast(l?"Removed from saved jobs.":"Saved job.","success")}catch(o){window.showToast(o.message,"error")}}}}))}function d(e){if(!e)return"";const t=document.createElement("div");return t.textContent=e,t.innerHTML}function Ee(e){return d(e).replace(/"/g,"&quot;")}function Se(e){const t=new Date(e),a=(Date.now()-t.getTime())/1e3;return a<60?"just now":a<3600?`${Math.floor(a/60)}m ago`:a<86400?`${Math.floor(a/3600)}h ago`:`${Math.floor(a/86400)}d ago`}const $e=["Software Engineer","Software Engineer Intern","Frontend Developer","Backend Engineer","Full Stack Developer","Data Scientist","ML Engineer","DevOps Engineer","Cloud Engineer","Mobile Developer","Product Manager","UI/UX Designer","Data Analyst","Data Analyst Intern","QA Engineer","Security Engineer","Java Spring Developer","Python Django Developer","FastAPI Backend Engineer","C++ Systems Engineer","Platform Engineer"],xe=["Python","JavaScript","TypeScript","React","Node.js","Go","Rust","Java","Spring","Spring Boot","C","C++","AWS","Docker","Kubernetes","PostgreSQL","MongoDB","Redis","GraphQL","Next.js","Vue.js","Django","FastAPI","Flask",".NET","Express","TensorFlow","PyTorch","Git","Linux","SQL","REST API"],Ie=["Remote","USA","UK","India","Germany","Canada","Singapore","San Francisco","New York","London","Berlin","Bangalore","Toronto"];function Te(e){$(),x(e,"preferences",`
    <div class="page-header"><h1>Settings</h1></div>
    <div id="pref-content"><div class="empty-state"><div class="loading-spinner"></div><p style="margin-top:10px">Loading...</p></div></div>
  `),ke()}async function ke(){const e=document.getElementById("pref-content");let t=null,a=!1;try{t=await p.getPreferences(),a=!0}catch{}e.innerHTML=`
    <div class="scrape-panel">
      <form id="pref-form" class="pref-form">
        <div class="input-group full-width">
          <label>Desired Roles</label>
          <div class="tag-input-wrapper" id="roles-wrapper">
            ${((t==null?void 0:t.desired_roles)||[]).map(n=>R(n)).join("")}
            <input type="text" id="roles-input" placeholder="Type and press Enter" />
          </div>
          <div class="chip-row">${$e.filter(n=>!((t==null?void 0:t.desired_roles)||[]).includes(n)).slice(0,10).map(n=>`<span class="chip" data-target="roles-wrapper" data-value="${n}">${n}</span>`).join("")}</div>
        </div>
        <div class="input-group full-width">
          <label>Target Locations</label>
          <div class="tag-input-wrapper" id="locations-wrapper">
            ${((t==null?void 0:t.preferred_locations)||[]).map(n=>R(n)).join("")}
            <input type="text" id="locations-input" placeholder="Type and press Enter" />
          </div>
          <div class="chip-row">${Ie.filter(n=>!((t==null?void 0:t.preferred_locations)||[]).includes(n)).slice(0,8).map(n=>`<span class="chip" data-target="locations-wrapper" data-value="${n}">${n}</span>`).join("")}</div>
        </div>
        <div style="display:flex;gap:12px;flex-wrap:wrap">
          <div class="input-group" style="flex:1;min-width:160px">
            <label>Work Mode</label>
            <select id="remote-pref">
              <option value="remote" ${(t==null?void 0:t.remote_preference)==="remote"?"selected":""}>Remote</option>
              <option value="hybrid" ${(t==null?void 0:t.remote_preference)==="hybrid"?"selected":""}>Hybrid</option>
              <option value="onsite" ${(t==null?void 0:t.remote_preference)==="onsite"?"selected":""}>Onsite</option>
            </select>
          </div>
          <div class="input-group" style="flex:1;min-width:160px">
            <label>Experience Level</label>
            <select id="exp-level">
              <option value="fresher" ${(t==null?void 0:t.experience_level)==="fresher"?"selected":""}>Intern / Entry</option>
              <option value="mid" ${(t==null?void 0:t.experience_level)==="mid"?"selected":""}>Mid-Level</option>
              <option value="senior" ${(t==null?void 0:t.experience_level)==="senior"?"selected":""}>Senior / Lead</option>
            </select>
          </div>
        </div>
        <div style="display:flex;gap:12px;flex-wrap:wrap">
          <div class="input-group" style="flex:1;min-width:160px">
            <label>Min Salary (USD)</label>
            <input class="input" type="number" id="min-salary-usd" placeholder="e.g. 50000" value="${(t==null?void 0:t.min_salary)||""}" />
          </div>
          <div class="input-group" style="flex:1;min-width:160px">
            <label>Min Salary (INR)</label>
            <input class="input" type="number" id="min-salary-inr" placeholder="e.g. 4175000" value="${t!=null&&t.min_salary?S(t.min_salary):""}" />
          </div>
        </div>
        <div style="display:flex;gap:12px;flex-wrap:wrap">
          <div class="input-group" style="flex:1;min-width:160px">
            <label>Max Salary (USD)</label>
            <input class="input" type="number" id="max-salary-usd" placeholder="e.g. 150000" value="${(t==null?void 0:t.max_salary)||""}" />
          </div>
          <div class="input-group" style="flex:1;min-width:160px">
            <label>Max Salary (INR)</label>
            <input class="input" type="number" id="max-salary-inr" placeholder="e.g. 12525000" value="${t!=null&&t.max_salary?S(t.max_salary):""}" />
          </div>
        </div>
        <p class="fx-note" id="preferences-fx-note">Loading live salary conversion...</p>
        <div class="input-group full-width">
          <label>Skills & Technologies</label>
          <div class="tag-input-wrapper" id="skills-wrapper">
            ${((t==null?void 0:t.skills)||[]).map(n=>R(n)).join("")}
            <input type="text" id="skills-input" placeholder="Type and press Enter" />
          </div>
          <div class="chip-row">${xe.filter(n=>!((t==null?void 0:t.skills)||[]).includes(n)).slice(0,14).map(n=>`<span class="chip" data-target="skills-wrapper" data-value="${n}">${n}</span>`).join("")}</div>
        </div>
        <div class="full-width" style="margin-top:8px;border-top:1px solid var(--border);padding-top:16px">
          <button type="submit" class="btn btn-primary btn-lg" id="pref-save-btn" style="width:100%">
            ${a?"Update Preferences":"Save & Start Searching"}
          </button>
        </div>
      </form>
    </div>
  `,J("roles-wrapper","roles-input"),J("locations-wrapper","locations-input"),J("skills-wrapper","skills-input"),L(document.getElementById("min-salary-usd"),document.getElementById("min-salary-inr")),L(document.getElementById("max-salary-usd"),document.getElementById("max-salary-inr")),H(document.getElementById("preferences-fx-note")),document.querySelectorAll(".chip[data-target]").forEach(n=>{n.addEventListener("click",()=>{const i=document.getElementById(n.dataset.target),s=i.querySelector("input");if(w(n.dataset.target).includes(n.dataset.value))return;const o=document.createElement("span");o.className="tag",o.dataset.value=n.dataset.value,o.innerHTML=`${n.dataset.value}<button type="button" onclick="this.parentElement.remove()">x</button>`,i.insertBefore(o,s),n.remove()})}),document.getElementById("pref-form").addEventListener("submit",async n=>{n.preventDefault();const i=document.getElementById("pref-save-btn");i.disabled=!0,i.textContent="Saving...";const s={desired_roles:w("roles-wrapper"),preferred_locations:w("locations-wrapper"),remote_preference:document.getElementById("remote-pref").value,experience_level:document.getElementById("exp-level").value,min_salary:parseInt(document.getElementById("min-salary-usd").value)||null,max_salary:parseInt(document.getElementById("max-salary-usd").value)||null,skills:w("skills-wrapper")};if(!s.desired_roles.length){window.showToast("Add at least one role","error"),i.disabled=!1,i.textContent="Save";return}if(!s.skills.length){window.showToast("Add at least one skill","error"),i.disabled=!1,i.textContent="Save";return}if(s.min_salary&&s.max_salary&&s.min_salary>s.max_salary){window.showToast("Min salary cannot be greater than max salary.","error"),i.disabled=!1,i.textContent=a?"Update Preferences":"Save & Start Searching";return}try{a?await p.updatePreferences(s):await p.createPreferences(s),window.showToast("Preferences saved","success"),i.textContent="Update Preferences",a=!0}catch(l){window.showToast(l.message,"error")}finally{i.disabled=!1}})}function R(e){return`<span class="tag" data-value="${e}">${e}<button type="button" onclick="this.parentElement.remove()">x</button></span>`}function J(e,t){const a=document.getElementById(t);a&&a.addEventListener("keydown",n=>{if(n.key==="Enter"){n.preventDefault();const i=a.value.trim();if(!i)return;const s=document.getElementById(e);if(w(e).includes(i))return;const l=document.createElement("span");l.className="tag",l.dataset.value=i,l.innerHTML=`${i}<button type="button" onclick="this.parentElement.remove()">x</button>`,s.insertBefore(l,a),a.value=""}})}function w(e){const t=document.getElementById(e);return t?Array.from(t.querySelectorAll(".tag")).map(a=>a.dataset.value):[]}function je(e){$(),x(e,"jobs",`
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
          ${W.map(r=>`<option value="${r}">${r}</option>`).join("")}
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
  `);let t=0;const a=25;n(),i(),s();function n(){L(document.getElementById("filter-min-salary-usd"),document.getElementById("filter-min-salary-inr")),H(document.getElementById("jobs-fx-note"));let r;document.getElementById("search-input").addEventListener("input",()=>{clearTimeout(r),r=setTimeout(()=>{t=0,s()},300)}),["filter-source","filter-skill","filter-status","filter-min-salary-usd","filter-min-salary-inr","filter-salary-only","filter-email-only"].forEach(u=>{document.getElementById(u).addEventListener("change",()=>{t=0,s()})}),document.getElementById("clear-jobs-btn").addEventListener("click",o)}async function i(){try{const r=await p.getSources(),u=document.getElementById("filter-source");u.innerHTML='<option value="">All Sources</option>'+Object.entries(r).map(([c,m])=>`<option value="${c}">${m.name}</option>`).join("")}catch{}}async function s(){const r=document.getElementById("jobs-list"),u=document.getElementById("result-count"),c={skip:t,limit:a,search:document.getElementById("search-input").value.trim(),source:document.getElementById("filter-source").value,skills:document.getElementById("filter-skill").value,min_salary:document.getElementById("filter-min-salary-usd").value||null,has_salary:document.getElementById("filter-salary-only").checked||null,has_emails:document.getElementById("filter-email-only").checked||null};document.getElementById("filter-status").value==="saved"&&(c.is_saved=!0);try{const m=await p.getJobs(c);u.textContent=m.length===0?"No jobs match these filters.":`Showing ${t+1}-${t+m.length} curated jobs.`,m.length===0&&t===0?r.innerHTML='<div class="empty-state"><h3>No jobs found</h3><p>Try a different role, skill, or salary filter.</p></div>':(r.innerHTML=m.map((y,f)=>B(y,f)).join(""),C(r)),l(m.length)}catch(m){u.textContent="Could not load jobs.",r.innerHTML=`<div class="empty-state"><h3>Error</h3><p>${m.message}</p></div>`}}function l(r){const u=document.getElementById("pagination");if(u.innerHTML="",t>0){const c=document.createElement("button");c.className="btn btn-secondary btn-sm",c.textContent="Previous",c.addEventListener("click",()=>{t=Math.max(0,t-a),s()}),u.appendChild(c)}if(r===a){const c=document.createElement("button");c.className="btn btn-secondary btn-sm",c.textContent="Next",c.addEventListener("click",()=>{t+=a,s()}),u.appendChild(c)}}async function o(){if(confirm("Delete all scraped jobs? This cannot be undone."))try{const r=await p.clearJobs();sessionStorage.removeItem("jobsnipe:lastScrape"),window.showToast(`Deleted ${r.deleted} jobs.`,"info"),t=0,s()}catch(r){window.showToast(r.message,"error")}}}function Le(e){x(e,"saved",`
    <div class="page-header">
      <div>
        <h1>Saved Jobs</h1>
        <p class="subtitle">Your curated list of roles to apply for.</p>
      </div>
    </div>
    <div id="jobs-list" class="jobs-list">
      <div class="empty-state"><div class="loading-spinner"></div><p style="margin-top:10px">Loading...</p></div>
    </div>
  `),t();async function t(){const a=document.getElementById("jobs-list");try{const n=await p.getJobs({is_saved:!0,limit:100});if(n.length===0){a.innerHTML='<div class="empty-state"><h3>No saved jobs</h3><p>Click the star on any job to save it here.</p><a href="#/jobs" class="btn btn-primary btn-sm" style="margin-top:14px">Browse Jobs</a></div>';return}a.innerHTML=n.map((i,s)=>B(i,s)).join(""),C(a)}catch(n){a.innerHTML=`<div class="empty-state"><h3>Error</h3><p>${n.message}</p></div>`}}}function Be(e){x(e,"outreach",`
    <div class="page-header">
      <div>
        <h1>Email Contacts</h1>
        <p class="subtitle">HR and recruiter emails found in job listings. Click to compose.</p>
      </div>
    </div>
    <div id="contacts-list" class="jobs-list">
      <div class="empty-state"><div class="loading-spinner"></div><p style="margin-top:10px">Loading contacts...</p></div>
    </div>
  `),t();async function t(){const a=document.getElementById("contacts-list");try{const i=(await p.getJobs({limit:200})).filter(s=>s.emails&&s.emails.length>0);if(i.length===0){a.innerHTML='<div class="empty-state"><h3>No contacts found yet</h3><p>Run scrapes to find HR and recruiter email addresses from job listings.</p></div>';return}a.innerHTML=`<p style="font-size:.82rem;color:var(--text-2);margin-bottom:12px">${i.length} jobs with email contacts found</p>`+i.map((s,l)=>`
        <div class="job-card" style="animation-delay:${l*.03}s">
          <div class="job-main">
            <div class="job-title"><a href="${s.job_url}" target="_blank" rel="noopener">${T(s.title)}</a></div>
            <div class="job-meta">
              ${s.company?`<span>${T(s.company)}</span>`:""}
              ${s.location?`<span>${T(s.location)}</span>`:""}
              <span>${T(s.source)}</span>
            </div>
            <div class="email-row">
              ${s.emails.map(o=>`
                <div class="email-chip">
                  <a href="mailto:${o}" title="Compose email to ${o}">${o}</a>
                  <button onclick="navigator.clipboard.writeText('${o}');window.showToast('Copied','success')" title="Copy">copy</button>
                </div>
              `).join("")}
            </div>
          </div>
        </div>
      `).join("")}catch(n){a.innerHTML=`<div class="empty-state"><h3>Error</h3><p>${n.message}</p></div>`}}}function T(e){if(!e)return"";const t=document.createElement("div");return t.textContent=e,t.innerHTML}const G=document.getElementById("app");function Ce(){let e=document.querySelector(".toast-container");return e||(e=document.createElement("div"),e.className="toast-container",document.body.appendChild(e)),e}function ne(e,t="info"){const a=Ce(),n={success:"✓",error:"✕",info:"ℹ"},i=document.createElement("div");i.className=`toast ${t}`,i.innerHTML=`<span>${n[t]||""}</span><span>${e}</span>`,a.appendChild(i),setTimeout(()=>{i.style.opacity="0",i.style.transform="translateX(100%)",setTimeout(()=>i.remove(),300)},3500)}window.showToast=ne;const De={"/login":se,"/register":ie,"/dashboard":ve,"/preferences":Te,"/jobs":je,"/saved":Le,"/outreach":Be};function U(){const e=window.location.hash.slice(1)||"/login";if(["/dashboard","/preferences","/jobs","/saved","/outreach"].includes(e)&&!_()){window.location.hash="#/login";return}if((e==="/login"||e==="/register")&&_()){window.location.hash="#/dashboard";return}const a=De[e];a?(G.innerHTML="",a(G)):window.location.hash=_()?"#/dashboard":"#/login"}window.addEventListener("hashchange",U);window.addEventListener("DOMContentLoaded",U);U();function _e(){K(),window.location.hash="#/login",ne("Logged out","info")}window.logout=_e;
