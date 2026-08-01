/* ============================================================
   Whitmore Vance LLP — portal chrome
   Same framework as the CFP/Margins portal and the Y8S build:
   news marquee + market ticker + topbar with grouped nav +
   section subnav pop-out + theme toggle + role switcher.
   ============================================================ */

/* Deployment path prefix. The portal is served under /law on both GitHub
   Pages (endurance-ai-labs/law) and endurancelabs.ai, so every internal path
   carries it and every comparison happens in the same space. */
const BASE = '/law';

/* ---- Theme: every load starts light (Margins profile) ---- */
(function () {
  let saved = 'light';
  try { saved = localStorage.getItem('wv-theme') || 'light'; } catch (e) {}
  document.documentElement.setAttribute('data-theme', saved);
})();

const NAV_GROUPS = [
  { id: 'home', label: 'Firm', href: BASE + '/', items: [] },
  {
    id: 'fin', label: 'Financial', needs: 'fin', items: [
      { href: '/law/financials/', label: 'P&L & Balance Sheet' },
      { href: '/law/revenue/',    label: 'Revenue & Realization' },
      { href: '/law/lockup/',     label: 'Lockup — WIP & AR' },
      { href: '/law/rates/',      label: 'Rates & Exceptions' },
      { href: '/law/budget/',     label: 'Budget vs Actual' },
      { href: '/law/comp/',       label: 'Partner Compensation', needs: 'margin' },
    ],
  },
  {
    id: 'mat', label: 'Clients & Matters', items: [
      { href: '/law/clients/',       label: 'Client Book' },
      { href: '/law/matters/',       label: 'Matter Register' },
      { href: '/law/profitability/', label: 'Profitability', needs: 'margin' },
      { href: '/law/afa/',           label: 'Fee Arrangements' },
    ],
  },
  {
    id: 'prac', label: 'Practice', items: [
      { href: '/law/litigation/',   label: 'Docket & Deadlines' },
      { href: '/law/transactions/', label: 'Deal Room' },
      { href: '/law/ediscovery/',   label: 'eDiscovery' },
      { href: '/law/knowledge/',    label: 'Knowledge & Experience' },
    ],
  },
  {
    id: 'tal', label: 'Talent', items: [
      { href: '/law/people/',      label: 'Roster & Utilization' },
      { href: '/law/capacity/',    label: 'Capacity Planning' },
      { href: '/law/development/', label: 'Development & CLE' },
      { href: '/law/retention/',   label: 'Retention Risk', needs: 'firm' },
    ],
  },
  {
    id: 'grow', label: 'Growth', items: [
      { href: '/law/pipeline/',    label: 'Pitches & Pipeline' },
      { href: '/law/origination/', label: 'Origination & Cross-Sell' },
      { href: '/law/marketing/',   label: 'Marketing & Rankings' },
    ],
  },
  {
    id: 'risk', label: 'Risk', needs: 'risk', items: [
      { href: '/law/intake/',    label: 'New Business Intake' },
      { href: '/law/conflicts/', label: 'Conflicts' },
      { href: '/law/walls/',     label: 'Ethical Walls' },
      { href: '/law/trust/',     label: 'Trust & IOLTA' },
      { href: '/law/ocg/',       label: 'Outside Counsel Guidelines' },
    ],
  },
  {
    id: 'ops', label: 'Operations', needs: 'fin', items: [
      { href: '/law/billing/',     label: 'Billing & E-Billing' },
      { href: '/law/collections/', label: 'Collections' },
      { href: '/law/vendors/',     label: 'Vendors & Cost Recovery' },
      { href: '/law/it/',          label: 'Systems Health' },
    ],
  },
  { id: 'integ', label: 'Integrations', href: '/law/integrations/', items: [] },
  { id: 'brain', label: 'Brain', href: '/law/brain/', items: [], cta: true },
];

const _GROUP_OF = {
  '/law/financials/': 'fin', '/law/revenue/': 'fin', '/law/lockup/': 'fin', '/law/rates/': 'fin', '/law/budget/': 'fin', '/law/comp/': 'fin',
  '/law/clients/': 'mat', '/law/matters/': 'mat', '/law/matter/': 'mat', '/law/profitability/': 'mat', '/law/afa/': 'mat',
  '/law/litigation/': 'prac', '/law/transactions/': 'prac', '/law/ediscovery/': 'prac', '/law/knowledge/': 'prac',
  '/law/people/': 'tal', '/law/capacity/': 'tal', '/law/development/': 'tal', '/law/retention/': 'tal',
  '/law/pipeline/': 'grow', '/law/origination/': 'grow', '/law/marketing/': 'grow',
  '/law/intake/': 'risk', '/law/conflicts/': 'risk', '/law/walls/': 'risk', '/law/trust/': 'risk', '/law/ocg/': 'risk', '/law/insurance/': 'risk',
  '/law/billing/': 'ops', '/law/collections/': 'ops', '/law/vendors/': 'ops', '/law/it/': 'ops',
  '/law/integrations/': 'integ', '/law/brain/': 'brain',
};

function _normalizePath(p) {
  if (!p) return '/';
  p = p.replace(/\/index\.html$/, '/');
  if (!p.endsWith('/')) p += '/';
  return p || '/';
}
function _activeGroup(path) {
  path = _normalizePath(path);
  if (path === BASE + '/' || path === '/') return 'home';
  for (const k in _GROUP_OF) if (path.startsWith(k)) return _GROUP_OF[k];
  return 'home';
}

/* ---- Ticker: firm operating metrics + real macro inputs ---- */
/* 5th element 'fin' = only shown to roles with financial access */
const TICKER = [
  ['REALIZATION (MTD)',    '87.4%',   '+0.3 pt', 'up',   'fin'],
  ['LOCKUP',               '113 days', '-2 days', 'up',  'fin'],
  ['WIP UNBILLED',         '$69.8M',  '-1.8%',   'up',   'fin'],
  ['AR > 90 DAYS',         '$14.6M',  '+4.1%',   'down', 'fin'],
  ['UTILIZATION (FIRM)',   '81.6%',   '+0.9 pt', 'up'],
  ['TIME ENTRY DELINQUENCY', '3.1 days', '-0.4',  'up'],
  ['E-BILL REJECTION RATE', '4.2%',   '-0.3 pt', 'up',  'fin'],
  ['OPEN MATTERS',         '4,912',   '+38',     'up'],
  ['DEADLINES < 7 DAYS',   '61',      '+9',      'down'],
  ['3E SYNC',              'LIVE',    '6 min ago', 'up'],
  ['FED FUNDS',            '3.75–4.00%', 'hold',  'up'],
  ['PRIME RATE',           '6.75%',   'unch',    'up'],
  ['SOFR',                 '3.86%',   '+2 bps',  'up'],
  ['UST 2-YR',             '3.62%',   '-3 bps',  'down'],
  ['UST 10-YR',            '4.12%',   '+1 bp',   'up'],
  ['CPI (YOY)',            '2.6%',    '-0.1 pt', 'down'],
  ['LEGAL SERVICES PPI',   '+4.1% YoY', '+0.2 pt','up'],
  ['UNEMPLOYMENT',         '4.1%',    '+0.1 pt', 'up'],
];
const MARQUEE = [
  ['WHITMORE VANCE', 'Q3 partner retreat — practice group economics review moves to the portal this cycle'],
  ['RISK', 'Two new outside counsel guideline sets parsed this week — staffing restrictions now enforced pre-bill'],
  ['MARKET', 'Rate increases across the AmLaw 200 averaging mid-single digits; realization drag remains the constraint'],
  ['TALENT', 'Associate hours dispersion widening across Litigation — capacity module flagging four for rebalancing'],
  ['COLLECTIONS', 'Lockup down two days month-over-month; WIP over 90 days remains the largest single opportunity'],
  ['WHITMORE VANCE', 'Founded 1974 · six offices · seven practice groups · 640 people'],
];

function renderTopbar(opts = {}) {
  const target = document.getElementById('topbar');
  if (!target) return;
  if (typeof isSignedIn === 'function' && !isSignedIn()) { renderSignIn(); target.outerHTML = ''; return; }

  const subtitle = opts.subtitle || 'Firm Operating System';
  const path = _normalizePath(window.location.pathname);
  const activeGroupId = _activeGroup(path);
  const me = currentPersona();

  const allowed = (o) => !o.needs || can(o.needs);
  const groups = NAV_GROUPS.filter(allowed).map(g => ({ ...g, items: (g.items || []).filter(allowed) }))
                           .filter(g => g.items.length > 0 || g.href);
  const activeGroup = groups.find(g => g.id === activeGroupId);

  const buildLinks = () => groups.map(g => {
    const active = g.id === activeGroupId;
    const href = g.items.length === 0 ? g.href : g.items[0].href;
    if (g.items.length === 0) {
      if (g.cta) {
        return `<div class="nav-item"><a href="${href}" class="nav-cta${active ? ' active' : ''}" style="display:inline-flex;align-items:center;gap:5px;color:#fff;padding:6px 15px;border-radius:999px;font-weight:700">🧠 ${g.label}</a></div>`;
      }
      return `<div class="nav-item"><a href="${href}" data-group="${g.id}" class="${active ? 'active' : ''}">${g.label}</a></div>`;
    }
    const dd = g.items.map(it => {
      const ia = path === it.href || (it.href !== '/' && path.startsWith(it.href));
      return `<a href="${it.href}" class="nav-dropdown-item ${ia ? 'active' : ''}">${it.label}</a>`;
    }).join('');
    return `<div class="nav-item nav-item-with-dropdown">
      <a href="${href}" data-group="${g.id}" class="${active ? 'active' : ''}">${g.label} <span class="nav-caret">▾</span></a>
      <div class="nav-dropdown">${dd}</div></div>`;
  }).join('');

  const groupLinks = buildLinks();

  /* sub-nav pop-out: sibling tabs under the parent section heading */
  let subBar;
  if (activeGroup && activeGroup.items.length > 1) {
    const subItems = activeGroup.items.map(it => {
      const ia = path === it.href || (it.href !== '/' && path.startsWith(it.href));
      return `<a href="${it.href}" class="section-subnav-item ${ia ? 'active' : ''}">${it.label}</a>`;
    }).join('');
    subBar = `<nav class="section-subnav" id="section-subnav" aria-label="${activeGroup.label} sub-navigation">
      <div class="section-subnav-inner">
        <span class="section-subnav-label">${activeGroup.label}</span>
        <div class="section-subnav-items">${subItems}</div>
      </div></nav>`;
  } else {
    subBar = `<div class="section-subnav section-subnav--empty" id="section-subnav" aria-hidden="true">
      <div class="section-subnav-inner"><span class="section-subnav-label">&nbsp;</span>
      <div class="section-subnav-items"><span class="section-subnav-item">&nbsp;</span></div></div></div>`;
  }

  const tickerHtml = TICKER.filter(t => t[4] !== 'fin' || can('fin')).map(t =>
    `<span class="ticker-item"><span class="ticker-label">${t[0]}</span><span class="ticker-value">${t[1]}</span><span class="ticker-change ${t[3]}">${t[2]}</span></span>`
  ).join('<span class="ticker-sep">·</span>') + '<span class="ticker-sep">·</span>';
  const marqueeItems = MARQUEE.map(m =>
    `<span class="news-marquee-item"><span class="news-marquee-source">${m[0]}</span><span class="news-marquee-text">${m[1]}</span><span class="news-marquee-sep">—</span></span>`
  ).join('');

  const roleLabel = me.perms.external ? 'EXTERNAL — CLIENT VIEW'
    : me.perms.admin ? 'FULL ACCESS · ADMIN'
    : me.perms.risk ? 'RISK & COMPLIANCE'
    : me.perms.margin ? (me.perms.firm ? 'FULL FINANCIAL ACCESS' : 'GROUP ECONOMICS — ' + (me.group || '').toUpperCase())
    : me.perms.fin ? 'BILLING ACCESS · NO MARGIN'
    : 'OWN MATTERS & HOURS';

  target.outerHTML = `
    <div class="news-marquee" id="news-marquee"><div class="news-marquee-track">${marqueeItems}${marqueeItems}</div></div>
    <div class="market-ticker" id="market-ticker"><div class="ticker-track">${tickerHtml}${tickerHtml}</div></div>
    <div class="portal-topbar">
      <a class="brand" href="/law/">
        <span class="wv-mark">WV</span>
        <span><span class="wv-name">Whitmore Vance LLP</span><span class="wv-sub">${subtitle}</span></span>
      </a>
      <nav class="nav nav-desktop">${groupLinks}</nav>
      <div class="portal-topbar-right">
        <button class="nav-icon-btn theme-toggle" id="theme-toggle" title="Toggle light / dark mode" aria-label="Toggle theme">
          <svg class="theme-icon-moon" xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
          <svg class="theme-icon-sun" xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:none"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
        </button>
        <div class="nav-item nav-item-with-dropdown nav-user-btn" id="nav-user-btn" title="Account & role">
          <a href="#" class="nav-icon-btn nav-user-trigger" aria-label="Account" onclick="event.preventDefault()">
            <span class="nav-user-avatar">${me.perms.external ? '◇' : me.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}</span>
            <span class="nav-user-label">${me.name.split(' ')[0]}</span>
            <span class="nav-caret">▾</span>
          </a>
          <div class="nav-dropdown nav-dropdown-right">
            <div class="nav-user-card">
              <div class="nav-user-card-title">${me.name} <span class="nav-user-badge">DEMO</span></div>
              <div class="nav-user-card-sub">${me.title}</div>
              <div class="nav-user-card-meta">${roleLabel}${me.walled ? ' · WALLED' : ''}</div>
            </div>
            <div class="nav-user-card" style="padding-top:6px">
              <div class="nav-user-card-meta" style="margin-bottom:4px">SWITCH USER (DEMO)</div>
              ${PERSONAS.map(p => `<a href="#" class="nav-dropdown-item" style="padding:6px 0;${p.id === me.id ? 'color:var(--color-blue);font-weight:700' : ''}" onclick="event.preventDefault();setRole('${p.id}')">${p.id === me.id ? '● ' : '○ '}${p.name} — ${p.title}</a>`).join('')}
            </div>
            <div class="nav-dropdown-divider"></div>
            <a href="#" class="nav-dropdown-item" onclick="event.preventDefault();signOutUser()">Sign out</a>
          </div>
        </div>
      </div>
    </div>
    <button class="nav-toggle" id="nav-toggle" aria-label="Open menu" aria-expanded="false" aria-controls="nav-menu">
      <span class="nav-toggle-bar"></span><span class="nav-toggle-bar"></span><span class="nav-toggle-bar"></span>
    </button>
    <nav class="nav nav-mobile" id="nav-menu" aria-hidden="true">${groupLinks}</nav>
    <div class="nav-scrim" id="nav-scrim" hidden></div>
    ${subBar}`;

  document.body.classList.remove('has-sidenav', 'has-sidenav-collapsed');

  if (!document.querySelector('.demo-watermark')) {
    const wm = document.createElement('div');
    wm.className = 'demo-watermark';
    wm.textContent = 'Demo environment · fictional firm · fictional data';
    document.body.appendChild(wm);
  }

  _wireMobileNav();
  _wireThemeToggle();
  if (typeof mountBrainFab === 'function') mountBrainFab();

  /* match ticker scroll speed (px/s) to the marquee above it */
  (function syncTickerSpeed(tries) {
    const mt = document.querySelector('.news-marquee-track');
    const tt = document.querySelector('.ticker-track');
    if (!mt || !tt) return;
    if ((!mt.scrollWidth || !tt.scrollWidth) && tries < 40) return requestAnimationFrame(() => syncTickerSpeed(tries + 1));
    if (mt.scrollWidth && tt.scrollWidth) tt.style.animationDuration = (37 * tt.scrollWidth / mt.scrollWidth).toFixed(1) + 's';
  })(0);
}

function _wireMobileNav() {
  const toggle = document.getElementById('nav-toggle');
  const menu = document.getElementById('nav-menu');
  const scrim = document.getElementById('nav-scrim');
  if (!toggle || !menu) return;
  const close = () => { document.body.classList.remove('nav-open'); toggle.setAttribute('aria-expanded', 'false'); if (scrim) scrim.hidden = true; };
  const open  = () => { document.body.classList.add('nav-open'); toggle.setAttribute('aria-expanded', 'true'); if (scrim) scrim.hidden = false; };
  toggle.addEventListener('click', () => { document.body.classList.contains('nav-open') ? close() : open(); });
  if (scrim) scrim.addEventListener('click', close);
  menu.querySelectorAll('.nav-item-with-dropdown > a').forEach(a => {
    a.addEventListener('click', e => {
      if (window.matchMedia('(max-width: 900px)').matches) {
        const item = a.parentElement;
        if (!item.classList.contains('open')) {
          e.preventDefault();
          menu.querySelectorAll('.nav-item-with-dropdown.open').forEach(o => o.classList.remove('open'));
          item.classList.add('open');
        }
      }
    });
  });
  menu.querySelectorAll('.nav-dropdown-item, .nav-item:not(.nav-item-with-dropdown) > a').forEach(a => a.addEventListener('click', close));
  window.addEventListener('resize', () => { if (!window.matchMedia('(max-width: 900px)').matches) close(); });
}

function _wireThemeToggle() {
  const btn = document.getElementById('theme-toggle');
  if (!btn) return;
  function apply(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    try { localStorage.setItem('wv-theme', theme); } catch (e) {}
    const moon = btn.querySelector('.theme-icon-moon'), sun = btn.querySelector('.theme-icon-sun');
    if (theme === 'light') { if (moon) moon.style.display = 'none'; if (sun) sun.style.display = ''; }
    else { if (moon) moon.style.display = ''; if (sun) sun.style.display = 'none'; }
  }
  apply(document.documentElement.getAttribute('data-theme') || 'light');
  btn.addEventListener('click', () => {
    apply(document.documentElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light');
  });
}

/* sticky bottom horizontal scrollbar helper (same as CFP) */
(function loadStickyHscroll() {
  if (window.__wvStickyLoaded) return;
  window.__wvStickyLoaded = true;
  const s = document.createElement('script');
  s.src = '/law/js/sticky-hscroll.js';
  s.async = true;
  document.head.appendChild(s);
})();

window.WVNav = { renderTopbar };
