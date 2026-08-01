/* ============================================================
   Whitmore Vance LLP — shared utilities
   Formatters · role gate & ethical walls · source chips ·
   tie chips · derivation tooltips · approval chains · Slack nudge
   NOTE: classic script, global scope. Page-level consts must not
   collide with anything declared here or in data.js / nav.js.
   ============================================================ */

const $  = (sel, el = document) => el.querySelector(sel);
const $$ = (sel, el = document) => [...el.querySelectorAll(sel)];

/* ---- formatters: penny-accurate, tabular, never rounded in display ---- */
const fmt$ = (n, dec = 0) =>
  (n < 0 ? '-' : '') + '$' + Math.abs(Number(n) || 0).toLocaleString('en-US',
    { minimumFractionDigits: dec, maximumFractionDigits: dec });
const fmt$2 = (n) => fmt$(n, 2);
const fmtK = (n) => {
  const a = Math.abs(Number(n) || 0);
  if (a >= 1e9) return (n < 0 ? '-' : '') + '$' + (a / 1e9).toFixed(2) + 'B';
  if (a >= 1e6) return (n < 0 ? '-' : '') + '$' + (a / 1e6).toFixed(1) + 'M';
  if (a >= 1e3) return (n < 0 ? '-' : '') + '$' + Math.round(a / 1e3) + 'K';
  return fmt$(n);
};
const fmtN   = (n, dec = 0) => (Number(n) || 0).toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec });
const fmtPct = (n, dec = 1) => (isFinite(n) ? Number(n).toFixed(dec) : '0.0') + '%';
const fmtHrs = (n) => fmtN(n, 1);
/* Portal-wide date format is MM-DD-YYYY */
const fmtDate = (iso) => { if (!iso) return '—'; const [y, m, d] = iso.split('-'); return `${m}-${d}-${y}`; };
const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
const qs  = (k) => new URLSearchParams(window.location.search).get(k);
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

/* ============================================================
   Roles — the real Whitmore Vance org.
   perms: fin (sees money) · margin (sees profitability/cost rates)
          firm (sees the whole firm vs own group) · risk (compliance modules)
          admin · external (client portal only)
   walls: matter ids this user is WALLED OFF FROM (screening).
   ============================================================ */
const PERSONAS = [
  { id: 'mp',    name: 'Eleanor Whitmore',  title: 'Managing Partner',                  perms: { fin: 1, margin: 1, firm: 1, risk: 1, admin: 1 } },
  { id: 'coo',   name: 'Daniel Reyes',      title: 'Chief Operating Officer',           perms: { fin: 1, margin: 1, firm: 1, risk: 1, admin: 1 } },
  { id: 'cfo',   name: 'Priya Raghunathan', title: 'Chief Financial Officer',           perms: { fin: 1, margin: 1, firm: 1, risk: 0, admin: 0 } },
  { id: 'gc',    name: 'Marcus Oyelaran',   title: 'General Counsel — Risk & Ethics',   perms: { fin: 0, margin: 0, firm: 1, risk: 1, admin: 0 } },
  { id: 'pgl',   name: 'Susannah Vance',    title: 'Practice Group Leader — Corporate', perms: { fin: 1, margin: 1, firm: 0, risk: 0, admin: 0 }, group: 'Corporate/M&A' },
  { id: 'pgl2',  name: 'Theodore Nakashima',title: 'Practice Group Leader — Litigation',perms: { fin: 1, margin: 1, firm: 0, risk: 0, admin: 0 }, group: 'Litigation', walled: true },
  { id: 'ops',   name: 'Camille Brossard',  title: 'Director of Legal Operations',      perms: { fin: 1, margin: 1, firm: 1, risk: 0, admin: 0 } },
  { id: 'bill',  name: 'Rosa Ferreira',     title: 'Billing Manager',                   perms: { fin: 1, margin: 0, firm: 1, risk: 0, admin: 0 } },
  { id: 'assoc', name: 'Jonah Kwiatkowski', title: 'Senior Associate — Litigation',     perms: { fin: 0, margin: 0, firm: 0, risk: 0, admin: 0 }, group: 'Litigation' },
  { id: 'client',name: 'Client Portal',     title: 'External — Client View',            perms: { fin: 0, margin: 0, firm: 0, risk: 0, admin: 0, external: 1 } },
];

const ROLE_KEY = 'wv-role';
function currentRole()    { try { return localStorage.getItem(ROLE_KEY) || ''; } catch (e) { return ''; } }
function currentPersona() { return PERSONAS.find(p => p.id === currentRole()) || null; }
function can(perm)        { const p = currentPersona(); return !!(p && p.perms[perm]); }
/* Signed in means BOTH gates cleared. The role lives in localStorage and
   persists across sessions; the password unlock lives in sessionStorage and
   does not — so this must test both, or a returning visitor in a new browser
   session walks straight past the password. */
function isSignedIn()     { return isUnlocked() && !!currentPersona(); }
function setRole(id)      { try { localStorage.setItem(ROLE_KEY, id); } catch (e) {} window.location.reload(); }
function signOutUser()    { try { localStorage.removeItem(ROLE_KEY); } catch (e) {} window.location.reload(); }

/* ---- Ethical walls, enforced at the data layer, not by convention ----
   Any list of matters passed through here loses walled matters entirely —
   they do not appear greyed out, they do not appear at all. Counts and
   totals downstream therefore also exclude them, which is the point. */
/* the screened matter ids come from the MODEL, so the wall always lands on a
   matter that is actually inside the walled user's scope */
function wallsFor() {
  const p = currentPersona();
  if (!p || !p.walled) return [];
  return (window.MODEL && window.MODEL.walledMatters) || [];
}
function isWalled(mid)   { return wallsFor().indexOf(mid) !== -1; }
function screenMatters(list) { const w = wallsFor(); return w.length ? list.filter(m => w.indexOf(m.id) === -1) : list; }
function wallNotice() {
  const w = wallsFor();
  if (!w.length) return '';
  return `<div class="wall-note"><span>⛔</span><div><b>Ethical wall in effect.</b>
    ${w.length} matter${w.length > 1 ? 's are' : ' is'} screened from your view and excluded from every figure on this page.
    Access attempts are logged. <a href="/law/walls/" style="color:var(--color-blue);font-weight:700">Wall register →</a></div></div>`;
}

/* ---- Practice-group scoping: non-firm-wide users see only their group ---- */
function scopeMatters(list) {
  const p = currentPersona();
  const l = screenMatters(list);
  if (!p || p.perms.firm) return l;
  if (p.group) return l.filter(m => m.practice === p.group);
  return l;
}

/* ============================================================
   Source chips — every panel says which system the data came from.
   This is the visual argument of the whole portal.
   ============================================================ */
const SRC = {
  e3e:    ['ELITE 3E',     '#4a6fb5', 'Practice management — clients, matters, time, rates, invoices, GL. Read-only replica, synced nightly.'],
  iman:   ['IMANAGE',      '#2f8f7f', 'Document management — matter workspaces, versions, authorship. REST API + webhooks.'],
  ebill:  ['E-BILLING',    '#b5744a', 'Client portals (Serengeti · TyMetrix · CounselLink) — submissions, line rejections, appeals. LEDES + portal API.'],
  adp:    ['ADP',          '#8a6fb5', 'Payroll & HR — headcount, class year, cost rates. REST API.'],
  graph:  ['M365 GRAPH',   '#5b8dc9', 'Outlook & Teams metadata only — meeting hours, relationship recency. No message content.'],
  docket: ['DOCKET ALARM', '#b55a72', 'Court dockets & rules-computed deadlines. REST API.'],
  intapp: ['INTAPP',       '#6f8f4a', 'Intake, conflicts and ethical walls.'],
  rel:    ['RELATIVITY',   '#4a8fb5', 'eDiscovery — review volumes, throughput, hosting spend by matter.'],
  crm:    ['INTERACTION',  '#b59a4a', 'CRM — relationships, pitches, origination.'],
  wv:     ['WV ENGINE',    '#2b4a8b', 'Whitmore Vance modeling layer — derived metrics computed in-portal. Firm-owned.'],
};
function srcChip(kind) {
  const m = SRC[kind]; if (!m) return '';
  return `<span class="src-chip" title="${esc(m[2])}" style="border:1px solid ${m[1]}44;color:${m[1]};background:${m[1]}14">
    <span class="dot" style="background:${m[1]}"></span>${m[0]}</span>`;
}
function srcRow(kinds) { return `<div class="src-row">${kinds.map(srcChip).join('')}</div>`; }

/* ---- Tie chip: this number equals a number on another page ---- */
function tie(href, label) { return `<a class="tie" href="${href}" title="This figure ties cell-for-cell to ${esc(label)}">${esc(label)}</a>`; }

/* ============================================================
   Derivation tooltips — hover any calculated cell to see the math.
   Usage: <span data-exp="Formula|input = value|input = value">$1,234</span>
   Single tooltip element, 250ms delay (framework standard).
   ============================================================ */
(function tooltips() {
  let tipEl = null, timer = null;
  function ensure() {
    if (!tipEl) { tipEl = document.createElement('div'); tipEl.id = 'wv-tip'; document.body.appendChild(tipEl); }
    return tipEl;
  }
  document.addEventListener('mouseover', (e) => {
    const t = e.target.closest && e.target.closest('[data-exp]');
    if (!t) return;
    clearTimeout(timer);
    timer = setTimeout(() => {
      const el = ensure();
      const parts = t.getAttribute('data-exp').split('|');
      el.innerHTML = `<b>${esc(parts[0])}</b>` + parts.slice(1).map(p => esc(p)).join('<br>');
      const r = t.getBoundingClientRect();
      el.style.left = Math.min(r.left, window.innerWidth - 360) + 'px';
      el.style.top  = (r.bottom + 8 > window.innerHeight - 120 ? r.top - el.offsetHeight - 8 : r.bottom + 8) + 'px';
      el.classList.add('on');
    }, 250);
  });
  document.addEventListener('mouseout', (e) => {
    if (!(e.target.closest && e.target.closest('[data-exp]'))) return;
    clearTimeout(timer);
    if (tipEl) tipEl.classList.remove('on');
  });
})();

/* ============================================================
   Password gate — same pattern as the BPOS and 1100 demos.
   Password: enduranceportal (case-sensitive). To change it, replace the
   hash below:  node -e "console.log(require('crypto').createHash('sha256').update('NEW').digest('hex'))"
   ============================================================ */
const GATE_HASH = 'ac90f728eed6e93794b7c08e9b4bdb92f43b1442d9dac792443c07983ca221de';
const GATE_KEY = 'wv_unlocked';
function isUnlocked() { try { return sessionStorage.getItem(GATE_KEY) === '1'; } catch (e) { return false; } }
async function _sha256(s) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
}
async function submitGate(ev) {
  if (ev) ev.preventDefault();
  const input = document.getElementById('gate-pw');
  const err = document.getElementById('gate-err');
  const h = await _sha256(input.value);
  if (h === GATE_HASH) {
    try { sessionStorage.setItem(GATE_KEY, '1'); } catch (e) {}
    window.location.reload();
  } else {
    err.textContent = 'That password is not recognised.';
    input.value = ''; input.focus();
  }
}
function renderGate() {
  const ov = document.createElement('div');
  ov.className = 'login-overlay';
  ov.innerHTML = `
    <div class="login-box" style="max-width:430px;margin-top:6vh">
      <div class="login-mark">WV</div>
      <div class="login-title">Whitmore Vance LLP</div>
      <div class="login-sub">Firm Operating System — private demonstration environment.</div>
      <form onsubmit="submitGate(event)" style="margin-top:26px">
        <label for="gate-pw" style="display:block;font-size:10px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:var(--color-slate-hint);margin-bottom:8px">Access password</label>
        <input id="gate-pw" type="password" autocomplete="off" autofocus
          style="width:100%;background:var(--color-bg-2);border:1px solid var(--color-border);border-radius:var(--radius-sm);color:var(--color-cloud-whisper);font:inherit;font-size:15px;padding:12px 14px;outline:none">
        <div id="gate-err" style="font-size:12px;color:var(--color-red);min-height:18px;margin-top:8px"></div>
        <button type="submit" class="nav-cta"
          style="width:100%;margin-top:6px;border:0;border-radius:var(--radius-sm);color:#fff;font:inherit;font-size:13px;font-weight:800;padding:12px;cursor:pointer">Enter →</button>
      </form>
      <div class="login-foot">
        Demo environment · fictional firm · fictional data · Endurance AI Labs<br>
        <a href="/law/welcome/" style="color:var(--color-blue);font-weight:700;text-decoration:none">What is this? Read about the platform →</a>
      </div>
    </div>`;
  document.body.appendChild(ov);
}

/* ============================================================
   Sign-in overlay — the org chart, not a login box.
   Runs only after the password gate is cleared.
   ============================================================ */
function renderSignIn() {
  /* root-first: an unauthenticated visitor landing on the portal is sent to
     the public page unless they arrived from it with ?enter=1 */
  if (!isUnlocked()) {
    const params = new URLSearchParams(window.location.search);
    const atRoot = window.location.pathname === '/law/' || window.location.pathname === '/law' || window.location.pathname === '/';
    if (!params.has('enter') && atRoot) {
      window.location.replace('/law/welcome/');
      return;
    }
    renderGate();
    return;
  }
  renderSignInRoles();
}

function renderSignInRoles() {
  const label = (p) => p.perms.external ? 'Client portal'
    : p.perms.admin ? 'Full access · admin'
    : p.perms.risk ? 'Risk & compliance'
    : p.perms.margin ? (p.perms.firm ? 'Full financial access' : 'Group economics only')
    : p.perms.fin ? 'Billing access · no margin'
    : 'Own matters & hours only';
  const cards = PERSONAS.map(p => `
    <button class="login-card" onclick="setRole('${p.id}')">
      <span class="avatar">${p.perms.external ? '◇' : p.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}</span>
      <span class="who"><b>${esc(p.name)}</b><i>${esc(p.title)}</i></span>
      <span class="perm">${label(p)}${p.walled ? ' · walled' : ''}</span>
    </button>`).join('');
  const ov = document.createElement('div');
  ov.className = 'login-overlay';
  ov.innerHTML = `
    <div class="login-box">
      <div class="login-mark">WV</div>
      <div class="login-title">Whitmore Vance LLP</div>
      <div class="login-sub">Firm Operating System — every system in the firm, one operating picture.</div>
      <div class="login-note">Select your user. Every module, dollar figure, approval right and ethical wall in this system is scoped to the person signing in.</div>
      <div class="login-grid">${cards}</div>
      <div class="login-foot">
        Demo environment · fictional firm, fictional data · concept build by Endurance AI Labs<br>
        <a href="/law/welcome/" style="color:var(--color-blue);font-weight:700;text-decoration:none">New here? Read about the platform →</a>
      </div>
    </div>`;
  document.body.appendChild(ov);
}

/* ============================================================
   Approval chains — sequential, role-gated, e-signed
   ============================================================ */
function apprState(key, n) {
  try {
    const raw = localStorage.getItem('wv-appr:' + key);
    const arr = raw ? JSON.parse(raw) : [];
    while (arr.length < n) arr.push(null);
    return arr;
  } catch (e) { return new Array(n).fill(null); }
}
function apprSave(key, arr) { try { localStorage.setItem('wv-appr:' + key, JSON.stringify(arr)); } catch (e) {} }
function apprComplete(key, n) { return apprState(key, n).every(Boolean); }
window.__apprDefs = window.__apprDefs || {};

function approvalChain(key, steps) {
  window.__apprDefs[key] = steps;
  const st = apprState(key, steps.length);
  const me = currentPersona();
  const rows = steps.map((s, i) => {
    const done = st[i];
    const unlocked = i === 0 || !!st[i - 1];
    const mine = me && s.role === me.id;
    const nudged = (() => { try { return localStorage.getItem(`wv-nudge:${key}:${i}`); } catch (e) { return null; } })();
    const who = PERSONAS.find(p => p.id === s.role);
    let right;
    if (done) {
      right = `<span style="color:var(--color-green);font-weight:800;font-size:11.5px">✓ ${esc(done.by)} · ${esc(done.at)}</span>`;
    } else if (!unlocked) {
      right = `<span style="color:var(--color-slate-hint);font-size:11.5px">awaiting prior step</span>`;
    } else if (mine) {
      right = `<button class="btn-sm" onclick="approveStep('${key}',${i})">Sign &amp; approve</button>`;
    } else {
      right = `<button class="btn-sm ghost" onclick="slackNudge('${key}',${i})">${SLACK_MARK} Message ${esc((who && who.name.split(' ')[0]) || 'owner')}</button>`;
    }
    return `<div class="tri${done ? ' green' : unlocked ? '' : ''}" style="grid-template-columns:4px 1fr auto">
      <span class="sev" style="background:${done ? 'var(--color-green)' : unlocked ? 'var(--color-amber)' : 'var(--color-border)'}"></span>
      <div><div class="t">${esc(s.label)}</div>
        <div class="d">${esc((who && who.name + ' — ' + who.title) || s.role)}${nudged ? ` · ⌲ Slack reminder sent ${esc(nudged)}` : ''}</div></div>
      <div class="a">${right}</div></div>`;
  }).join('');
  return `<div class="triage">${rows}</div>`;
}
function approveStep(key, idx) {
  const steps = window.__apprDefs[key] || [];
  const st = apprState(key, steps.length);
  const me = currentPersona(); if (!me) return;
  const d = new Date();
  st[idx] = { by: me.name, title: me.title, at: `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}-${d.getFullYear()}` };
  apprSave(key, st);
  window.location.reload();
}
function resetChain(key) { try { localStorage.removeItem('wv-appr:' + key); } catch (e) {} window.location.reload(); }

/* ---- Slack nudge (pure simulation — no real Slack) ---- */
const SLACK_MARK = `<svg viewBox="0 0 24 24" width="12" height="12" aria-hidden="true" style="vertical-align:-2px"><rect x="2.5" y="9" width="9" height="4" rx="2" fill="#36C5F0"/><rect x="9" y="2.5" width="4" height="9" rx="2" fill="#2EB67D"/><rect x="12.5" y="11" width="9" height="4" rx="2" fill="#ECB22E"/><rect x="11" y="12.5" width="4" height="9" rx="2" fill="#E01E5A"/></svg>`;
function slackNudge(key, idx) {
  const steps = window.__apprDefs[key] || [];
  const s = steps[idx] || {};
  const who = PERSONAS.find(p => p.id === s.role) || { name: 'Colleague', title: '' };
  const d = new Date();
  const stamp = `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}-${d.getFullYear()}`;
  const pop = document.createElement('div');
  pop.style.cssText = 'position:fixed;inset:0;z-index:9500;background:rgba(0,0,0,.55);display:flex;align-items:center;justify-content:center;padding:20px';
  pop.innerHTML = `<div style="width:100%;max-width:420px;background:var(--color-bg-2);border:1px solid var(--color-border);border-radius:var(--radius-lg);overflow:hidden;box-shadow:var(--shadow-lg)">
    <div style="background:#3F0E40;color:#fff;padding:11px 15px;font-size:12.5px;font-weight:800">Slack — direct message</div>
    <div style="padding:15px">
      <div style="font-size:13px;font-weight:800">${esc(who.name)}</div>
      <div style="font-size:11px;color:var(--color-text-muted);margin-bottom:12px">${esc(who.title)}</div>
      <div style="background:var(--color-bg-3);border:1px solid var(--color-border);border-radius:var(--radius-sm);padding:11px 13px;font-size:12.5px;line-height:1.6">
        <span style="font-size:8.5px;font-weight:800;letter-spacing:.1em;background:var(--color-blue-pale);color:var(--color-blue);padding:1px 5px;border-radius:3px">APP</span>
        Reminder: <b>${esc(s.label || 'an approval')}</b> is waiting on you.<br>
        <a href="${esc(location.pathname)}" style="color:var(--color-blue)">${esc(location.pathname)}</a>
      </div>
      <div id="slk-st" style="font-size:11.5px;color:var(--color-text-muted);margin-top:12px">Sending…</div>
    </div></div>`;
  document.body.appendChild(pop);
  setTimeout(() => { const e = document.getElementById('slk-st'); if (e) e.innerHTML = '<span style="color:var(--color-green);font-weight:700">✓ Delivered</span>'; }, 750);
  setTimeout(() => { const e = document.getElementById('slk-st'); if (e) e.innerHTML += ' · 👀'; }, 1900);
  setTimeout(() => {
    try { localStorage.setItem(`wv-nudge:${key}:${idx}`, stamp); } catch (e) {}
    pop.remove(); window.location.reload();
  }, 2600);
}

/* ---- small shared bits ---- */
function pill(text, tone) {
  const map = { green: 'var(--color-green)', amber: 'var(--color-amber)', red: 'var(--color-red)', blue: 'var(--color-blue)' };
  const bg  = { green: 'var(--color-green-bg)', amber: 'var(--color-amber-bg)', red: 'var(--color-red-bg)', blue: 'var(--color-blue-pale)' };
  const c = map[tone] || 'var(--color-text-muted)';
  return `<span style="display:inline-block;font-size:10px;font-weight:800;letter-spacing:.04em;padding:2px 8px;border-radius:99px;color:${c};background:${bg[tone] || 'var(--color-bg-3)'}">${esc(text)}</span>`;
}
function kpi(label, value, sub, tone, exp) {
  return `<div class="kpi${tone ? ' ' + tone : ''}">
    <div class="kpi-label">${esc(label)}</div>
    <div class="kpi-value"${exp ? ` data-exp="${esc(exp)}"` : ''}>${value}</div>
    ${sub ? `<div class="kpi-sub">${sub}</div>` : ''}</div>`;
}
function panel(title, meta, body, extra) {
  return `<div class="demo-panel"${extra || ''}>
    <div class="demo-panel-head"><h2>${esc(title)}</h2><span class="k">${meta || ''}</span></div>
    ${body}</div>`;
}
function hero(eyebrow, h1, sub, chips) {
  return `<div class="demo-hero">
    <div><span class="demo-eyebrow">${esc(eyebrow)}</span>
      <h1>${h1}</h1>
      <div class="sub">${sub}</div></div>
    <div class="demo-hero-right">
      <span class="demo-live"><span class="dot"></span>Live · synced 6 min ago</span>
      ${srcRow(chips || ['e3e', 'wv'])}
    </div></div>`;
}

/* ---- Brain FAB on every page ---- */
function mountBrainFab() {
  if (document.querySelector('.brain-fab')) return;
  const b = document.createElement('button');
  b.className = 'brain-fab';
  b.title = 'Ask the firm brain';
  b.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.7" stroke-linecap="round"><path d="M9 3a3 3 0 0 0-3 3 3 3 0 0 0-2 5.2A3 3 0 0 0 5 17a3 3 0 0 0 4 3.7V3z"/><path d="M15 3a3 3 0 0 1 3 3 3 3 0 0 1 2 5.2A3 3 0 0 1 19 17a3 3 0 0 1-4 3.7V3z"/></svg>`;
  b.onclick = () => { window.location.href = '/law/brain/'; };
  document.body.appendChild(b);
}
