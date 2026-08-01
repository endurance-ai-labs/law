/* ============================================================
   Whitmore Vance LLP — shared analytics layer
   ------------------------------------------------------------
   One dimension registry, one metric registry, one filter engine.
   Every register and every exhibit in the portal reads from here,
   so a filter means the same thing on every page and a metric is
   computed exactly once.

   Filter state is mirrored into the URL query string, which makes
   any filtered view a shareable exhibit.

   Classic script, global scope — names must not collide with
   data.js / util.js / nav.js.
   ============================================================ */

/* ============================================================
   1. Dimensions — anything a matter can be grouped or sliced by
   ============================================================ */
var DIMS = {
  practice:  { label: 'Practice group',  get: function (m) { return m.practice; } },
  office:    { label: 'Office',          get: function (m) { var o = MODEL.offices.find(function (x) { return x.id === m.office; }); return o ? o.name : m.office; } },
  partner:   { label: 'Billing partner', get: function (m) { return m.partnerName; } },
  client:    { label: 'Client',          get: function (m) { return m.clientName; } },
  industry:  { label: 'Client industry', get: function (m) { var c = MODEL.clientById[m.clientId]; return c ? c.industry : '—'; } },
  fee:       { label: 'Fee arrangement', get: function (m) { return m.feeLabel; } },
  status:    { label: 'Status',          get: function (m) { return m.active ? 'Open' : 'Closed'; } },
  year:      { label: 'Year opened',     get: function (m) { return m.opened.slice(0, 4); } },
  portal:    { label: 'E-billing portal',get: function (m) { var c = MODEL.clientById[m.clientId]; return (c && c.ebillPortal) || 'None'; } },
  size:      { label: 'Matter size band',get: function (m) {
                 var v = m.collected;
                 return v >= 1e6 ? 'A · $1M+' : v >= 250e3 ? 'B · $250K–1M' : v >= 50e3 ? 'C · $50–250K' : v >= 10e3 ? 'D · $10–50K' : 'E · under $10K'; } },
  health:    { label: 'Matter health',   get: function (m) {
                 if (!m.active) return 'Closed';
                 if (m.margin < 0) return 'Loss-making';
                 if (m.overBudget) return 'Over budget';
                 if (m.wip > 60000) return 'WIP heavy';
                 return 'Healthy'; } },
  leverage:  { label: 'Leverage band',   get: function (m) {
                 var l = m.partnerHours > 0 ? (m.hours - m.partnerHours) / m.partnerHours : 0;
                 return l >= 5 ? 'Very high (5+)' : l >= 3.5 ? 'High (3.5–5)' : l >= 2 ? 'Moderate (2–3.5)' : 'Partner-heavy (<2)'; } },
};

/* ============================================================
   2. Metrics — every number the portal knows how to compute.
   Each takes a rollup (from MODEL.rollup) plus the raw list.
   `needs` gates a metric behind a permission.
   ============================================================ */
var METRICS = {
  collected:     { label: 'Revenue (collected)', group: 'Revenue', fmt: 'k',   needs: 'fin',    calc: function (r) { return r.collected; } },
  billed:        { label: 'Billed',              group: 'Revenue', fmt: 'k',   needs: 'fin',    calc: function (r) { return r.billed; } },
  standardValue: { label: 'Standard value',      group: 'Revenue', fmt: 'k',   needs: 'fin',    calc: function (r) { return r.standardValue; } },
  discount:      { label: 'Discounts',           group: 'Revenue', fmt: 'k',   needs: 'fin',    calc: function (r) { return r.discount; } },
  writeDown:     { label: 'Write-downs',         group: 'Revenue', fmt: 'k',   needs: 'fin',    calc: function (r) { return r.writeDown; } },
  leak:          { label: 'Total leak',          group: 'Revenue', fmt: 'k',   needs: 'fin',    calc: function (r) { return r.standardValue - r.collected; } },

  realization:   { label: 'Realization',         group: 'Rates',   fmt: 'pct', needs: 'fin',    calc: function (r) { return r.standardValue ? r.collected / r.standardValue : 0; } },
  billRealz:     { label: 'Billing realization', group: 'Rates',   fmt: 'pct', needs: 'fin',    calc: function (r) { return r.standardValue ? r.billed / r.standardValue : 0; } },
  collRealz:     { label: 'Collection realz.',   group: 'Rates',   fmt: 'pct', needs: 'fin',    calc: function (r) { return r.billed ? r.collected / r.billed : 0; } },
  effRate:       { label: 'Effective rate',      group: 'Rates',   fmt: '$',   needs: 'fin',    calc: function (r) { return r.hours ? r.collected / r.hours : 0; } },
  stdRate:       { label: 'Standard rate',       group: 'Rates',   fmt: '$',   needs: 'fin',    calc: function (r) { return r.hours ? r.standardValue / r.hours : 0; } },
  rateLeak:      { label: 'Rate leak / hour',    group: 'Rates',   fmt: '$',   needs: 'fin',    calc: function (r) { return r.hours ? (r.standardValue - r.collected) / r.hours : 0; } },

  margin:        { label: 'Contribution margin', group: 'Margin',  fmt: 'k',   needs: 'margin', calc: function (r) { return r.margin; } },
  marginPct:     { label: 'Margin %',            group: 'Margin',  fmt: 'pct', needs: 'margin', calc: function (r) { return r.collected ? r.margin / r.collected : 0; } },
  workCost:      { label: 'Direct work cost',    group: 'Margin',  fmt: 'k',   needs: 'margin', calc: function (r) { return r.workCost; } },
  overhead:      { label: 'Allocated overhead',  group: 'Margin',  fmt: 'k',   needs: 'margin', calc: function (r) { return r.overhead; } },
  costPerHour:   { label: 'Cost per hour',       group: 'Margin',  fmt: '$',   needs: 'margin', calc: function (r) { return r.hours ? r.workCost / r.hours : 0; } },
  marginPerHour: { label: 'Margin per hour',     group: 'Margin',  fmt: '$',   needs: 'margin', calc: function (r) { return r.hours ? r.margin / r.hours : 0; } },

  hours:         { label: 'Hours',               group: 'Effort',  fmt: 'n',   calc: function (r) { return r.hours; } },
  partnerHours:  { label: 'Partner hours',       group: 'Effort',  fmt: 'n',   calc: function (r) { return r.partnerHours; } },
  leverageR:     { label: 'Leverage',            group: 'Effort',  fmt: 'x',   calc: function (r) { return r.partnerHours ? (r.hours - r.partnerHours) / r.partnerHours : 0; } },
  hoursPerMatter:{ label: 'Hours per matter',    group: 'Effort',  fmt: 'n',   calc: function (r) { return r.matters ? r.hours / r.matters : 0; } },

  wip:           { label: 'Unbilled WIP',        group: 'Lockup',  fmt: 'k',   needs: 'fin',    calc: function (r) { return r.wip; } },
  ar:            { label: 'Receivables',         group: 'Lockup',  fmt: 'k',   needs: 'fin',    calc: function (r) { return r.arTotal; } },
  ar90:          { label: 'AR over 90 days',     group: 'Lockup',  fmt: 'k',   needs: 'fin',    calc: function (r) { return r.a90 + r.a120; } },
  lockupDays:    { label: 'Lockup days',         group: 'Lockup',  fmt: 'd',   needs: 'fin',    calc: function (r) { return r.collected ? (r.wip + r.arTotal) / (r.collected / 365) : 0; } },
  wipDays:       { label: 'WIP days',            group: 'Lockup',  fmt: 'd',   needs: 'fin',    calc: function (r) { return r.collected ? r.wip / (r.collected / 365) : 0; } },
  arDays:        { label: 'AR days',             group: 'Lockup',  fmt: 'd',   needs: 'fin',    calc: function (r) { return r.collected ? r.arTotal / (r.collected / 365) : 0; } },

  matters:       { label: 'Matters',             group: 'Volume',  fmt: 'n',   calc: function (r) { return r.matters; } },
  activeMatters: { label: 'Open matters',        group: 'Volume',  fmt: 'n',   calc: function (r) { return r.active; } },
  avgMatter:     { label: 'Avg matter size',     group: 'Volume',  fmt: 'k',   needs: 'fin',    calc: function (r) { return r.matters ? r.collected / r.matters : 0; } },
  clients:       { label: 'Distinct clients',    group: 'Volume',  fmt: 'n',   calc: function (r, list) { return new Set(list.map(function (m) { return m.clientId; })).size; } },
  partners:      { label: 'Distinct partners',   group: 'Volume',  fmt: 'n',   calc: function (r, list) { return new Set(list.map(function (m) { return m.partner; })).size; } },
  overBudget:    { label: 'Over-budget matters', group: 'Risk',    fmt: 'n',   calc: function (r, list) { return list.filter(function (m) { return m.active && m.overBudget; }).length; } },
  lossMatters:   { label: 'Loss-making matters', group: 'Risk',    fmt: 'n',   needs: 'margin', calc: function (r, list) { return list.filter(function (m) { return m.active && m.margin < 0; }).length; } },
  ebillShare:    { label: 'E-billed share',      group: 'Risk',    fmt: 'pct', needs: 'fin',    calc: function (r, list) { return list.length ? list.filter(function (m) { return m.ebill; }).length / list.length : 0; } },
};

function metricFmt(id, v) {
  var m = METRICS[id]; if (!m) return v;
  switch (m.fmt) {
    case 'k':   return fmtK(v);
    case '$':   return fmt$(v);
    case 'pct': return fmtPct(v * 100);
    case 'n':   return fmtN(v, 0);
    case 'd':   return fmtN(v, 0) + 'd';
    case 'x':   return (Number(v) || 0).toFixed(2);
    default:    return v;
  }
}
function metricAvailable(id) {
  var m = METRICS[id];
  return !!m && (!m.needs || can(m.needs));
}
function availableMetrics() { return Object.keys(METRICS).filter(metricAvailable); }

/* ============================================================
   3. Filter state — mirrored to the URL so any view is shareable
   ============================================================ */
var FILTER_DEFS = [
  { key: 'practice', label: 'Practice',  dim: 'practice' },
  { key: 'office',   label: 'Office',    dim: 'office' },
  { key: 'partner',  label: 'Partner',   dim: 'partner' },
  { key: 'industry', label: 'Industry',  dim: 'industry' },
  { key: 'fee',      label: 'Fee type',  dim: 'fee' },
  { key: 'status',   label: 'Status',    dim: 'status' },
  { key: 'year',     label: 'Opened',    dim: 'year' },
  { key: 'portal',   label: 'Portal',    dim: 'portal' },
  { key: 'size',     label: 'Size band', dim: 'size' },
  { key: 'health',   label: 'Health',    dim: 'health' },
  { key: 'leverage', label: 'Leverage',  dim: 'leverage' },
];

var FILTERS = {};

function filtersFromURL() {
  var p = new URLSearchParams(window.location.search);
  var f = {};
  FILTER_DEFS.forEach(function (d) { var v = p.get(d.key); if (v) f[d.key] = v; });
  if (p.get('q')) f.q = p.get('q');
  if (p.get('min')) f.min = p.get('min');
  return f;
}
function filtersToURL(extra) {
  var p = new URLSearchParams();
  Object.keys(FILTERS).forEach(function (k) { if (FILTERS[k]) p.set(k, FILTERS[k]); });
  if (extra) Object.keys(extra).forEach(function (k) { if (extra[k]) p.set(k, extra[k]); });
  var qs = p.toString();
  return window.location.pathname + (qs ? '?' + qs : '');
}
function setFilter(key, val) {
  if (!val || val === 'all') delete FILTERS[key]; else FILTERS[key] = val;
  syncURL();
  if (typeof render === 'function') render();
}
function clearFilters() {
  FILTERS = {};
  syncURL();
  if (typeof render === 'function') render();
}
function syncURL(extra) {
  try { history.replaceState({}, '', filtersToURL(extra)); } catch (e) {}
}
function activeFilterCount() { return Object.keys(FILTERS).filter(function (k) { return FILTERS[k]; }).length; }

/* apply the current filter set to any matter list */
function applyFilters(list) {
  var out = list;
  FILTER_DEFS.forEach(function (d) {
    var v = FILTERS[d.key];
    if (!v) return;
    var get = DIMS[d.dim].get;
    out = out.filter(function (m) { return String(get(m)) === v; });
  });
  if (FILTERS.q) {
    var q = FILTERS.q.toLowerCase();
    out = out.filter(function (m) {
      return (m.name + ' ' + m.clientName + ' ' + m.id + ' ' + m.partnerName + ' ' + m.practice).toLowerCase().indexOf(q) !== -1;
    });
  }
  if (FILTERS.min) {
    var min = parseFloat(FILTERS.min) * 1000;
    if (!isNaN(min)) out = out.filter(function (m) { return m.collected >= min; });
  }
  return out;
}

/* distinct values for a dimension, ordered by size */
function dimValues(dim, list) {
  var get = DIMS[dim].get;
  var counts = {};
  list.forEach(function (m) { var k = String(get(m)); counts[k] = (counts[k] || 0) + 1; });
  return Object.keys(counts).sort(function (a, b) { return counts[b] - counts[a]; });
}

/* ============================================================
   4. Filter bar — identical markup and behaviour on every page
   ============================================================ */
function renderFilterBar(baseList, opts) {
  opts = opts || {};
  var filtered = applyFilters(baseList);
  var n = activeFilterCount() + (FILTERS.q ? 1 : 0) + (FILTERS.min ? 1 : 0);

  var selects = FILTER_DEFS.filter(function (d) {
    return !opts.hide || opts.hide.indexOf(d.key) === -1;
  }).map(function (d) {
    /* options come from the list filtered by every OTHER filter, so a
       dropdown never offers a value that would return nothing */
    var others = {}; Object.keys(FILTERS).forEach(function (k) { if (k !== d.key) others[k] = FILTERS[k]; });
    var saved = FILTERS; FILTERS = others;
    var scope = applyFilters(baseList);
    FILTERS = saved;
    var vals = dimValues(d.dim, scope);
    var cur = FILTERS[d.key] || 'all';
    var on = cur !== 'all';
    return '<select class="flt' + (on ? ' on' : '') + '" onchange="setFilter(\'' + d.key + '\',this.value)" aria-label="' + esc(d.label) + '">' +
      '<option value="all">' + esc(d.label) + ' — all</option>' +
      vals.map(function (v) {
        return '<option value="' + esc(v) + '"' + (v === cur ? ' selected' : '') + '>' + esc(v) + '</option>';
      }).join('') + '</select>';
  }).join('');

  var chips = Object.keys(FILTERS).filter(function (k) { return FILTERS[k]; }).map(function (k) {
    var d = FILTER_DEFS.filter(function (x) { return x.key === k; })[0];
    var label = d ? d.label : (k === 'q' ? 'Search' : k === 'min' ? 'Min revenue' : k);
    var val = k === 'min' ? '$' + FILTERS[k] + 'K+' : FILTERS[k];
    return '<button class="fchip" onclick="setFilter(\'' + k + '\',\'\')">' +
      '<span>' + esc(label) + ':</span> ' + esc(val) + ' <b>×</b></button>';
  }).join('');

  return '<div class="filter-bar">' +
    '<div class="flt-row">' + selects +
      '<input type="search" class="flt-q" placeholder="Search matters, clients, partners…" value="' + esc(FILTERS.q || '') +
        '" oninput="setFilter(\'q\',this.value)">' +
      '<input type="number" class="flt-min" placeholder="Min $K" value="' + esc(FILTERS.min || '') +
        '" oninput="setFilter(\'min\',this.value)">' +
    '</div>' +
    (n ? '<div class="flt-chips">' + chips +
      '<button class="fchip clear" onclick="clearFilters()">Clear all ' + n + '</button>' +
      '<span class="flt-count">' + fmtN(filtered.length) + ' of ' + fmtN(baseList.length) + ' matters</span>' +
      '<button class="fchip link" onclick="copyExhibitLink(this)">Copy link to this view</button>' +
      '</div>'
      : '<div class="flt-chips"><span class="flt-count">' + fmtN(baseList.length) + ' matters · no filters applied</span>' +
        '<button class="fchip link" onclick="copyExhibitLink(this)">Copy link to this view</button></div>') +
  '</div>';
}

function copyExhibitLink(btn) {
  var url = window.location.origin + filtersToURL();
  try {
    navigator.clipboard.writeText(url);
    var old = btn.textContent; btn.textContent = '✓ Link copied';
    setTimeout(function () { btn.textContent = old; }, 1600);
  } catch (e) {
    window.prompt('Copy this link:', url);
  }
}

/* ============================================================
   5. Scenario space — how many distinct views this makes possible
   ============================================================ */
function scenarioCount(list) {
  var dimCombos = 1;
  FILTER_DEFS.forEach(function (d) { dimCombos *= (dimValues(d.dim, list).length + 1); });
  var mets = availableMetrics().length;
  var dims = Object.keys(DIMS).length;
  return {
    filters: dimCombos,
    metrics: mets,
    dims: dims,
    /* rows dim × optional split dim × any non-empty subset of metrics */
    pivots: dims * (dims + 1) * (Math.pow(2, Math.min(mets, 20)) - 1),
  };
}
function fmtBig(n) {
  if (n >= 1e12) return (n / 1e12).toFixed(1) + ' trillion';
  if (n >= 1e9)  return (n / 1e9).toFixed(1) + ' billion';
  if (n >= 1e6)  return (n / 1e6).toFixed(1) + ' million';
  if (n >= 1e3)  return fmtN(Math.round(n));
  return fmtN(Math.round(n));
}

/* ============================================================
   6. Pivot — rows = dimension, optional split, columns = metrics
   ============================================================ */
function buildPivot(list, rowDim, splitDim, metricIds, sortBy, sortDir) {
  var rget = DIMS[rowDim].get;
  var groups = {};
  list.forEach(function (m) { var k = String(rget(m)); (groups[k] = groups[k] || []).push(m); });

  var splitVals = splitDim ? dimValues(splitDim, list) : [null];
  var sget = splitDim ? DIMS[splitDim].get : null;

  var rows = Object.keys(groups).map(function (k) {
    var items = groups[k];
    var cells = [];
    splitVals.forEach(function (sv) {
      var sub = sv === null ? items : items.filter(function (m) { return String(sget(m)) === sv; });
      var r = MODEL.rollup(sub);
      metricIds.forEach(function (id) {
        cells.push({ metric: id, split: sv, value: METRICS[id].calc(r, sub), n: sub.length });
      });
    });
    return { key: k, items: items, rollup: MODEL.rollup(items), cells: cells };
  });

  /* sort by a chosen metric on the total (unsplit) rollup */
  var sortMetric = sortBy && METRICS[sortBy] ? sortBy : metricIds[0];
  rows.forEach(function (r) { r._sort = METRICS[sortMetric].calc(r.rollup, r.items); });
  rows.sort(function (a, b) { return sortDir === 'asc' ? a._sort - b._sort : b._sort - a._sort; });

  var totalRollup = MODEL.rollup(list);
  var totals = [];
  splitVals.forEach(function (sv) {
    var sub = sv === null ? list : list.filter(function (m) { return String(sget(m)) === sv; });
    var r = MODEL.rollup(sub);
    metricIds.forEach(function (id) { totals.push({ metric: id, split: sv, value: METRICS[id].calc(r, sub) }); });
  });

  return { rows: rows, splitVals: splitVals, metricIds: metricIds, totals: totals, totalRollup: totalRollup };
}
