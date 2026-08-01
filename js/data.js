/* ============================================================
   Whitmore Vance LLP — THE MODEL
   ------------------------------------------------------------
   One deterministic dataset, computed once, read by every page.
   Nothing on any page may compute a firm-level figure on its own —
   if a number appears twice in the portal it comes from here, so
   it ties cell-for-cell by construction.

   FICTIONAL. Every person, client, matter and dollar is invented.
   Vendor/system names are real; nothing else is.

   Deterministic: seeded PRNG only. No Date.now(), no Math.random().
   ============================================================ */

const AS_OF = '2026-07-31';           // every "today" in the portal
const AS_OF_LABEL = 'July 2026';
const TTM_MONTHS = 12;

/* ---- seeded PRNG (mulberry32) — same seed, same firm, every load ---- */
function _mk(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const _R = _mk(0x57484D56);            // "WHMV"
const rnd = () => _R();
const rr  = (lo, hi) => lo + (hi - lo) * rnd();
const ri  = (lo, hi) => Math.floor(rr(lo, hi + 1));
const pick = (a) => a[Math.floor(rnd() * a.length)];
/* right-skewed draw — matter sizes, client books, everything in a firm */
const lognorm = (mu, sigma) => Math.exp(mu + sigma * (Math.sqrt(-2 * Math.log(1 - rnd())) * Math.cos(2 * Math.PI * rnd())));

/* ============================================================
   1. Firm structure
   ============================================================ */
const OFFICES = [
  { id: 'NYC', name: 'New York',    w: 0.34, rateMx: 1.12, hq: true },
  { id: 'CHI', name: 'Chicago',     w: 0.17, rateMx: 1.00 },
  { id: 'SFO', name: 'San Francisco', w: 0.15, rateMx: 1.10 },
  { id: 'DAL', name: 'Dallas',      w: 0.14, rateMx: 0.92 },
  { id: 'LDN', name: 'London',      w: 0.11, rateMx: 1.06 },
  { id: 'MIA', name: 'Miami',       w: 0.09, rateMx: 0.90 },
];

/* realz = blended realization; lev = target non-partner:partner hours ratio */
const PRACTICES = [
  { id: 'CORP', name: 'Corporate/M&A',              w: 0.24, realz: 0.893, lev: 3.4, ebill: 0.38 },
  { id: 'LIT',  name: 'Litigation',                 w: 0.28, realz: 0.842, lev: 3.9, ebill: 0.81 },
  { id: 'RE',   name: 'Real Estate',                w: 0.11, realz: 0.881, lev: 2.8, ebill: 0.34 },
  { id: 'LE',   name: 'Labor & Employment',         w: 0.10, realz: 0.836, lev: 3.1, ebill: 0.88 },
  { id: 'IP',   name: 'Intellectual Property',      w: 0.12, realz: 0.905, lev: 4.1, ebill: 0.52 },
  { id: 'RX',   name: 'Restructuring',              w: 0.07, realz: 0.918, lev: 3.0, ebill: 0.21 },
  { id: 'REG',  name: 'Regulatory & Investigations',w: 0.08, realz: 0.861, lev: 3.3, ebill: 0.64 },
];
const PRACTICE_BY_ID = Object.fromEntries(PRACTICES.map(p => [p.id, p]));

/* headcount: 118 EP + 96 IP + 38 counsel + 214 assoc = 466 lawyers,
   + 44 paralegals = 510 timekeepers, + 130 business services = 640 */
const TK_CLASSES = [
  { id: 'EP',  label: 'Equity Partner',  n: 118, rate: [880, 1480], target: 1500, cost: [255, 340] },
  { id: 'IP',  label: 'Income Partner',  n: 96,  rate: [720, 980],  target: 1650, cost: [188, 244] },
  { id: 'CNS', label: 'Counsel',         n: 38,  rate: [690, 920],  target: 1600, cost: [176, 228] },
  { id: 'ASC', label: 'Associate',       n: 214, rate: [400, 760],  target: 1850, cost: [112, 186] },
  { id: 'PAR', label: 'Paralegal',       n: 44,  rate: [230, 360],  target: 1500, cost: [58, 88] },
];
const BUSINESS_SERVICES = 130;

const FIRST = ['Eleanor','Marcus','Priya','Daniel','Susannah','Theodore','Camille','Rosa','Jonah','Adaeze','Bertrand','Colette','Dmitri','Esperanza','Farrukh','Genevieve','Hollis','Imogen','Jasper','Katarina','Leopold','Mireille','Nikolai','Ottoline','Piotr','Quentin','Rosalind','Sébastien','Thandiwe','Ulysses','Verena','Wendell','Xiomara','Yusuf','Zephyrine','Anselm','Brigid','Casimir','Delphine','Emeric','Fionnuala','Gideon','Henrike','Ignatius','Josephine','Kwabena','Lucienne','Matthias','Nadezhda','Oisín','Perpetua','Rainer','Solveig','Tobias','Ursula','Valentin','Wilhelmina','Yannick','Zoraida','Aurelio','Beatrix','Cormac','Dagmar','Eamon','Freya','Gustavo','Helvi','Isolde','Joaquín','Kristiane','Lorcan','Malika','Norbert','Océane','Priyanka','Rafferty','Sunniva','Tarquin'];
const LAST  = ['Whitmore','Vance','Oyelaran','Raghunathan','Reyes','Nakashima','Brossard','Ferreira','Kwiatkowski','Achterberg','Bellweather','Castellanos','Drummond','Espenshade','Fairweather','Grimaldi','Hollingsworth','Ivanova','Jankowski','Kilbride','Lindqvist','Marchetti','Nnamdi','Okonkwo','Pemberton','Quintanilla','Rasmussen','Sørensen','Thackeray','Ubiña','Vasquez','Witherspoon','Yamamoto','Zabriskie','Ashworth','Blackwood','Cavanaugh','Delacroix','Eichenberg','Fontaine','Grunewald','Halvorsen','Ingersoll','Jaworski','Kastellanos','Lindenbaum','Montgomery','Nordstrom','Ottaviani','Pankhurst','Rothschild','Steinmetz','Tremblay','Vanderveen','Wolstenholme','Ziegler','Applegate','Braithwaite','Chamberlain','Dunmore','Fairbanks','Guarnieri','Hawthorne','Isenberg','Kenilworth','Lammermoor','Merriweather','Nightingale','Pilkington','Ravensworth','Stanhope','Thorncroft','Wexford'];

const CLIENT_PRE = ['Ardent','Northgate','Vireo','Calloway','Sterling','Beacon','Halcyon','Meridian','Kestrel','Ironwood','Silverline','Cascadia','Thornbury','Lattice','Copperfield','Vantage','Bluestem','Sandalwood','Perihelion','Marchmont','Quarry','Tessellate','Windrose','Alderman','Foxglove','Granary','Helix','Juniper','Larkspur','Mainsail','Nimbus','Overton','Palisade','Quillon','Redstone','Saltmarsh','Trestle','Umberland','Verdigris','Wainwright','Yarrow','Zephyr','Ambrose','Blackfriars','Chandler','Dovetail','Eastwind','Fairhaven','Glasswork','Harrowgate'];
const CLIENT_SUF = ['Holdings','Industries','Capital Partners','Group','Technologies','Health Systems','Energy','Logistics','Financial','Property Trust','Manufacturing','Pharmaceuticals','Media','Insurance Group','Resources','Laboratories','Foods','Aerospace','Materials','Bancorp','Ventures','Infrastructure','Semiconductor','Retail Group','Chemicals'];
const INDUSTRIES = ['Financial Services','Healthcare & Life Sciences','Technology','Energy & Infrastructure','Real Estate','Manufacturing','Consumer & Retail','Media & Telecom','Insurance','Transportation & Logistics'];

const FEE_TYPES = [
  { id: 'hourly',  label: 'Hourly',            w: 0.62 },
  { id: 'flat',    label: 'Fixed fee',         w: 0.14 },
  { id: 'capped',  label: 'Capped fee',        w: 0.08 },
  { id: 'blended', label: 'Blended rate',      w: 0.07 },
  { id: 'reta',    label: 'Retainer',          w: 0.05 },
  { id: 'cont',    label: 'Contingent/success',w: 0.04 },
];
const wpick = (arr) => { let x = rnd(), c = 0; for (const a of arr) { c += a.w; if (x <= c) return a; } return arr[arr.length - 1]; };

/* ---- normalization targets ----
   The generator produces realistic *relative* sizes; the normalize() pass
   below rescales the whole book so the firm's headline metrics equal what a
   firm of this shape would actually report — and what the ticker states.
   Declared here, above every consumer: these are read inside the matter
   generator, and a const declared after its first use is a TDZ error. */
const TARGET = {
  utilization:  0.821,     // billable hours ÷ target hours, firm-wide
  billingRealz: 0.897,     // billed ÷ standard value  (discounts + write-downs = 10.3%)
  collectRealz: 0.974,     // collected ÷ billed       → overall realization 87.4%
  wipDays:      55,        // unbilled work in progress
  arDays:       58,        // accounts receivable      → lockup 113 days
  marginPct:    0.383,     // contribution margin after allocated overhead
};
const OVERHEAD_K = 0.42;   // seed value; solved exactly in normalize()
let MODEL_OVERHEAD_K = OVERHEAD_K;

/* ============================================================
   2. Timekeepers
   ============================================================ */
const TIMEKEEPERS = (() => {
  const out = [];
  let n = 0;
  TK_CLASSES.forEach(cls => {
    for (let i = 0; i < cls.n; i++) {
      const off = wpick(OFFICES);
      const prac = wpick(PRACTICES);
      const classYear = cls.id === 'ASC' ? ri(2017, 2026) : cls.id === 'PAR' ? 0 : ri(1992, 2019);
      const base = rr(cls.rate[0], cls.rate[1]);
      const rate = Math.round(base * off.rateMx / 5) * 5;
      const costRate = Math.round(rr(cls.cost[0], cls.cost[1]) * (off.rateMx * 0.55 + 0.45));
      out.push({
        id: 'TK' + String(++n).padStart(4, '0'),
        name: pick(FIRST) + ' ' + pick(LAST),
        cls: cls.id, clsLabel: cls.label,
        office: off.id, practice: prac.name, practiceId: prac.id,
        classYear,
        rate,                       // standard hourly rate
        costRate,                   // fully-loaded cost per hour (comp + benefits + allocated overhead ÷ 1,900)
        target: cls.target,
        delinquentDays: Math.round(rr(0, 11) * (cls.id === 'EP' ? 1.5 : 1) * 10) / 10,
      });
    }
  });
  return out;
})();
const TK_BY_ID = Object.fromEntries(TIMEKEEPERS.map(t => [t.id, t]));
const PARTNERS = TIMEKEEPERS.filter(t => t.cls === 'EP');
const LAWYERS  = TIMEKEEPERS.filter(t => t.cls !== 'PAR');

/* blended standard and cost rates, weighted by class headcount×target hours */
const _rateStats = (() => {
  let sv = 0, cv = 0, h = 0;
  TIMEKEEPERS.forEach(t => { const hh = t.target * 0.83; sv += t.rate * hh; cv += t.costRate * hh; h += hh; });
  return { stdRate: sv / h, costRate: cv / h, hours: h };
})();

/* ============================================================
   3. Clients
   ============================================================ */
const CLIENTS = (() => {
  const out = [];
  const seen = {};
  for (let i = 0; i < 2100; i++) {
    let name, guard = 0;
    do { name = pick(CLIENT_PRE) + ' ' + pick(CLIENT_SUF); } while (seen[name] && ++guard < 40);
    seen[name] = 1;
    const prac = wpick(PRACTICES);
    out.push({
      id: 'C' + String(i + 1).padStart(4, '0'),
      name,
      industry: pick(INDUSTRIES),
      office: wpick(OFFICES).id,
      primaryPractice: prac.name,
      originator: pick(PARTNERS).id,
      relationship: pick(PARTNERS).id,
      since: ri(1979, 2026),
      ebillPortal: rnd() < 0.46 ? pick(['Serengeti','TyMetrix 360','CounselLink','Passport','Onit']) : null,
      ocgCount: rnd() < 0.46 ? ri(6, 34) : 0,
      // relationship strength from CRM + email metadata, 0-100
      strength: Math.round(clampN(rr(18, 96), 0, 100)),
      /* size tier — heavy-tailed. Drives both matter count and matter size,
         which is what produces realistic client concentration. */
      tier: lognorm(0, 1.30),
      _rev: 0, _revPrior: 0, _margin: 0, _wip: 0, _ar: 0, _matters: 0, _practices: {},
    });
  }
  return out;
})();
function clampN(n, lo, hi) { return Math.max(lo, Math.min(hi, n)); }
const CLIENT_BY_ID = Object.fromEntries(CLIENTS.map(c => [c.id, c]));

/* cumulative tier weights — pick a client in proportion to its size */
const _CLIENT_CUM = (() => {
  const cum = []; let s = 0;
  CLIENTS.forEach(c => { s += c.tier; cum.push(s); });
  return { cum, total: s };
})();
function pickClient() {
  const x = rnd() * _CLIENT_CUM.total, cum = _CLIENT_CUM.cum;
  let lo = 0, hi = cum.length - 1;
  while (lo < hi) { const mid = (lo + hi) >> 1; if (cum[mid] < x) lo = mid + 1; else hi = mid; }
  return CLIENTS[lo];
}

/* ============================================================
   4. Matters — the atomic unit. Everything rolls up from here.
   ============================================================ */
const MATTER_KINDS = {
  CORP: ['Acquisition of', 'Merger —', 'Series D financing —', 'Carve-out sale —', 'Joint venture —', 'Recapitalization —', 'Public offering —'],
  LIT:  ['v. Sandoval Holdings', 'v. Petrakis Group', '— class action defense', '— commercial dispute', '— breach of contract', '— appellate matter', '— arbitration'],
  RE:   ['— acquisition financing', '— ground lease', '— portfolio disposition', '— development JV', '— CMBS refinancing'],
  LE:   ['— wage & hour defense', '— executive separation', '— union negotiation', '— EEOC charge', '— restrictive covenant'],
  IP:   ['— patent prosecution', '— trademark portfolio', '— ANDA litigation', '— licensing program', '— trade secret matter'],
  RX:   ['— chapter 11', '— out-of-court restructuring', '— §363 sale', '— creditor committee'],
  REG:  ['— DOJ inquiry', '— SEC investigation', '— FCPA review', '— CFIUS filing', '— antitrust clearance'],
};

const MATTERS = (() => {
  const out = [];
  for (let i = 0; i < 4900; i++) {
    const prac = wpick(PRACTICES);
    const client = pickClient();          // weighted by client size tier → real concentration
    const off = rnd() < 0.72 ? client.office : wpick(OFFICES).id;
    const fee = wpick(FEE_TYPES);
    const partner = pick(PARTNERS);
    const openYear = ri(2019, 2026);
    const active = openYear >= 2025 ? rnd() < 0.88 : rnd() < 0.22;
    const officeObj = OFFICES.find(o => o.id === off) || OFFICES[0];

    /* size: right-skewed, scaled by client tier. These are RAW relative sizes —
       the normalization pass below rescales them so firm hours equal real capacity. */
    const hours = Math.max(4, lognorm(3.95, 1.02)
      * Math.pow(client.tier, 0.52)
      * (prac.id === 'RX' || prac.id === 'REG' ? 1.6 : 1));
    const leverage = prac.lev * rr(0.72, 1.32);
    const partnerHrs = hours / (1 + leverage);
    const otherHrs   = hours - partnerHrs;

    const blendedRate = ( PARTNER_RATE(officeObj) * partnerHrs + ASSOC_RATE(officeObj) * otherHrs ) / hours;
    const standardValue = hours * blendedRate;

    /* leak waterfall: standard → discount → write-down → billed → collected */
    const discountPct  = fee.id === 'flat' || fee.id === 'blended' ? rr(0.04, 0.19) : rr(0.00, 0.11);
    const writeDownPct = clampN((1 - prac.realz) - discountPct * 0.45 + rr(-0.03, 0.055), 0.005, 0.24);
    const billed  = standardValue * (1 - discountPct) * (1 - writeDownPct);
    /* collection realization — short-pays and negotiated reductions AFTER the bill.
       This is realization, NOT timing. Timing lives in WIP and AR below. */
    const collectPct = clampN(rr(0.962, 1.0) - (rnd() < 0.09 ? rr(0.03, 0.11) : 0), 0.82, 1);
    const collected = billed * collectPct;

    const costs = standardValue * rr(0.02, 0.085);      // hard + soft disbursements
    /* staffing efficiency — the same work costs different amounts depending on
       who did it and how cleanly it was run. This is what makes some matters
       genuinely loss-making rather than merely low-margin. */
    const staffMx = rnd() < 0.065 ? rr(1.72, 2.95) : rr(0.70, 1.48);   // tail = the matters that lose money
    const workCost = (partnerHrs * PARTNER_COST(officeObj) + otherHrs * ASSOC_COST(officeObj)) * staffMx;
    const overhead = workCost * OVERHEAD_K;              // allocated firm overhead

    /* WIP and AR are BALANCES, not revenue haircuts. Raw weights here; the
       normalization pass scales them to the firm's target lockup days. */
    const wipW = active ? billed * rr(0.04, 0.34) : 0;
    const arW  = active ? billed * rr(0.05, 0.30) : 0;
    const arAgeRoll = rnd();
    const arMix = arAgeRoll < 0.46 ? [1, 0, 0, 0, 0]
      : arAgeRoll < 0.70 ? [0.40, 0.60, 0, 0, 0]
      : arAgeRoll < 0.85 ? [0.20, 0.30, 0.50, 0, 0]
      : arAgeRoll < 0.94 ? [0, 0.20, 0.30, 0.50, 0]
      : [0, 0, 0.25, 0.35, 0.40];

    const budget = fee.id === 'hourly' ? (rnd() < 0.44 ? standardValue * rr(0.8, 1.25) : 0) : standardValue * rr(0.9, 1.1);

    const kinds = MATTER_KINDS[prac.id] || MATTER_KINDS.CORP;
    const kind = pick(kinds);
    const name = kind.startsWith('—') || kind.startsWith('v.')
      ? client.name.split(' ')[0] + ' ' + kind
      : kind + ' ' + pick(CLIENT_PRE) + ' ' + pick(CLIENT_SUF);

    out.push({
      id: 'WV-' + String(1000 + i),
      name, clientId: client.id, clientName: client.name,
      practice: prac.name, practiceId: prac.id, office: off,
      partner: partner.id, partnerName: TK_BY_ID[partner.id].name,
      fee: fee.id, feeLabel: fee.label,
      opened: `${openYear}-${String(ri(1, 12)).padStart(2, '0')}-${String(ri(1, 28)).padStart(2, '0')}`,
      active, status: active ? 'Open' : 'Closed',
      hours: Math.round(hours * 10) / 10,
      partnerHours: Math.round(partnerHrs * 10) / 10,
      standardValue, discount: standardValue * discountPct,
      writeDown: standardValue * (1 - discountPct) * writeDownPct,
      billed, collected, collectPct, staffMx, costs, workCost, overhead,
      margin: collected - workCost - overhead - costs * 0.35,
      wipW, arW, arMix,
      wip: 0, ar: { a0: 0, a30: 0, a60: 0, a90: 0, a120: 0 }, arTotal: 0,   // set by normalize()
      budget,
      overBudget: budget > 0 && standardValue > budget * 1.05,
      ebill: !!client.ebillPortal && rnd() < prac.ebill,
      walled: false,
    });
  }
  return out;
})();

function PARTNER_RATE(o) { return 1052 * o.rateMx; }
function ASSOC_RATE(o)   { return 521 * o.rateMx; }
function PARTNER_COST(o) { return 296 * (o.rateMx * 0.55 + 0.45); }
function ASSOC_COST(o)   { return 152 * (o.rateMx * 0.55 + 0.45); }

/* ============================================================
   4b. NORMALIZATION — anchor generated shapes to firm reality
   ------------------------------------------------------------
   The generator produces realistic *relative* sizes. This pass
   rescales them so the firm's headline metrics equal the values
   a real firm of this shape would report — and, critically, the
   values the ticker and landing copy state. Generation gives us
   distribution; normalization gives us truth.
   ============================================================ */
(function normalize() {
  /* --- 1. hours: scale the whole book to the firm's actual capacity --- */
  const capacity = TIMEKEEPERS.reduce((s, t) => s + t.target, 0);
  const targetHours = capacity * TARGET.utilization;
  const rawHours = MATTERS.reduce((s, m) => s + m.hours, 0);
  const hs = targetHours / rawHours;

  MATTERS.forEach(m => {
    m.hours = Math.round(m.hours * hs * 10) / 10;
    m.partnerHours = Math.round(m.partnerHours * hs * 10) / 10;
    ['standardValue', 'discount', 'writeDown', 'billed', 'collected',
     'costs', 'workCost', 'overhead', 'wipW', 'arW', 'budget'].forEach(k => { m[k] *= hs; });
    m.margin = m.collected - m.workCost - m.overhead - m.costs * 0.35;
  });

  /* --- 1b. realization: scale the leak so billed ÷ standard hits target ---
     Discounts and write-downs move together; their split is preserved. */
  const stdTotal  = MATTERS.reduce((s, m) => s + m.standardValue, 0);
  const leakNow   = MATTERS.reduce((s, m) => s + m.discount + m.writeDown, 0);
  const leakScale = (stdTotal * (1 - TARGET.billingRealz)) / leakNow;
  MATTERS.forEach(m => {
    m.discount *= leakScale; m.writeDown *= leakScale;
    m.billed = m.standardValue - m.discount - m.writeDown;
  });
  /* collection realization: shrink each matter's shortfall proportionally so
     the weighted mean hits target and no matter ever collects above 100%. */
  const billedTotal = MATTERS.reduce((s, m) => s + m.billed, 0);
  const collNow = MATTERS.reduce((s, m) => s + m.billed * m.collectPct, 0) / billedTotal;
  const shortScale = (1 - TARGET.collectRealz) / (1 - collNow);
  MATTERS.forEach(m => {
    m.collectPct = 1 - (1 - m.collectPct) * shortScale;
    m.collected = m.billed * m.collectPct;
  });

  /* --- 2. overhead: solve the multiplier that lands firm margin on target --- */
  const rev = MATTERS.reduce((s, m) => s + m.collected, 0);
  const work = MATTERS.reduce((s, m) => s + m.workCost, 0);
  const disb = MATTERS.reduce((s, m) => s + m.costs * 0.35, 0);
  // rev - work - k*work - disb = target*rev  →  k = (rev(1-target) - work - disb) / work
  const k = (rev * (1 - TARGET.marginPct) - work - disb) / work;
  MATTERS.forEach(m => {
    m.overhead = m.workCost * k;
    m.margin = m.collected - m.workCost - m.overhead - m.costs * 0.35;
    m.marginPct = m.collected ? m.margin / m.collected : 0;
  });
  MODEL_OVERHEAD_K = k;

  /* --- 3. WIP and AR: scale balances to the firm's target lockup days --- */
  const perDay = rev / 365;
  const wipScale = (perDay * TARGET.wipDays) / MATTERS.reduce((s, m) => s + m.wipW, 0);
  const arScale  = (perDay * TARGET.arDays)  / MATTERS.reduce((s, m) => s + m.arW, 0);
  MATTERS.forEach(m => {
    m.wip = m.wipW * wipScale;
    m.arTotal = m.arW * arScale;
    const x = m.arMix;
    m.ar = { a0: m.arTotal * x[0], a30: m.arTotal * x[1], a60: m.arTotal * x[2],
             a90: m.arTotal * x[3], a120: m.arTotal * x[4] };
    delete m.wipW; delete m.arW; delete m.arMix;
    m.overBudget = m.budget > 0 && m.standardValue > m.budget * 1.05;
  });
})();

/* ---- Ethical wall demo ----
   The screened matter must sit INSIDE the walled user's own practice group,
   otherwise practice scoping removes it first and the wall proves nothing.
   Pick the largest active Litigation matter so its absence is conspicuous. */
let WALLED_MATTERS = [];
(function markWall() {
  const lit = MATTERS.filter(m => m.practiceId === 'LIT' && m.active)
                     .sort((a, b) => b.collected - a.collected);
  const m = lit[0];
  if (!m) return;
  m.walled = true;
  m.wallNote = 'Screened 03-14-2026 — lateral hire conflict. Screen approved by the General Counsel; access attempts are logged.';
  WALLED_MATTERS = [m.id];
})();

const MATTER_BY_ID = Object.fromEntries(MATTERS.map(m => [m.id, m]));

/* ============================================================
   5. Roll-ups — computed ONCE. Every page reads these.
   ============================================================ */
function _blank() {
  return { standardValue: 0, discount: 0, writeDown: 0, billed: 0, collected: 0, costs: 0,
           workCost: 0, overhead: 0, margin: 0, wip: 0, arTotal: 0, hours: 0, partnerHours: 0,
           matters: 0, active: 0, a0: 0, a30: 0, a60: 0, a90: 0, a120: 0 };
}
function _add(acc, m) {
  acc.standardValue += m.standardValue; acc.discount += m.discount; acc.writeDown += m.writeDown;
  acc.billed += m.billed; acc.collected += m.collected; acc.costs += m.costs;
  acc.workCost += m.workCost; acc.overhead += m.overhead; acc.margin += m.margin;
  acc.wip += m.wip; acc.arTotal += m.arTotal; acc.hours += m.hours; acc.partnerHours += m.partnerHours;
  acc.matters++; if (m.active) acc.active++;
  acc.a0 += m.ar.a0; acc.a30 += m.ar.a30; acc.a60 += m.ar.a60; acc.a90 += m.ar.a90; acc.a120 += m.ar.a120;
  return acc;
}
function rollup(list) { return list.reduce(_add, _blank()); }

const FIRM = rollup(MATTERS);

/* realization: billing (billed ÷ standard) × collection (collected ÷ billed) */
FIRM.billingRealization    = FIRM.billed / FIRM.standardValue;
FIRM.collectionRealization = FIRM.collected / FIRM.billed;
FIRM.realization           = FIRM.collected / FIRM.standardValue;
FIRM.effectiveRate         = FIRM.collected / FIRM.hours;
FIRM.standardRate          = FIRM.standardValue / FIRM.hours;
FIRM.rateLeak              = FIRM.standardRate - FIRM.effectiveRate;
FIRM.leverage              = (FIRM.hours - FIRM.partnerHours) / FIRM.partnerHours;
FIRM.marginPct             = FIRM.margin / FIRM.collected;
FIRM.lawyers               = LAWYERS.length;
FIRM.timekeepers           = TIMEKEEPERS.length;
FIRM.headcount             = TIMEKEEPERS.length + BUSINESS_SERVICES;
FIRM.partners              = PARTNERS.length;
FIRM.clients               = CLIENTS.length;
FIRM.rpl                   = FIRM.collected / FIRM.lawyers;
FIRM.wipDays               = FIRM.wip / (FIRM.collected / 365);
FIRM.arDays                = FIRM.arTotal / (FIRM.collected / 365);
FIRM.lockupDays            = FIRM.wipDays + FIRM.arDays;
FIRM.utilization           = FIRM.hours / TIMEKEEPERS.reduce((s, t) => s + t.target, 0);

/* e-billing: only matters flagged as portal-submitted */
const EBILL = (() => {
  const sub = MATTERS.filter(m => m.ebill);
  const submitted = sub.reduce((s, m) => s + m.billed, 0);
  const rejRate = 0.042;
  const rejected = submitted * rejRate;
  const appealed = rejected * 0.31;
  const recovered = appealed * 0.66;
  return {
    matters: sub.length, submitted, rejRate, rejected, appealed, recovered,
    unrecovered: rejected - recovered,
    share: submitted / FIRM.billed,
    reasons: [
      { code: 'BLOCK_BILLING',    label: 'Block billing / insufficient narrative', pct: 0.243 },
      { code: 'STAFFING',         label: 'Timekeeper not approved for matter',     pct: 0.191 },
      { code: 'RATE',             label: 'Rate exceeds approved schedule',         pct: 0.164 },
      { code: 'TASK_CODE',        label: 'Missing or invalid UTBMS code',          pct: 0.121 },
      { code: 'ADMIN',            label: 'Non-billable administrative time',       pct: 0.098 },
      { code: 'TRAVEL',           label: 'Travel billed above policy',             pct: 0.079 },
      { code: 'DUPLICATE',        label: 'Duplicative attendance',                 pct: 0.063 },
      { code: 'OTHER',            label: 'Other / unspecified',                    pct: 0.041 },
    ],
  };
})();

/* by practice, office, partner, client */
function groupBy(list, keyFn) {
  const m = {};
  list.forEach(x => { const k = keyFn(x); (m[k] = m[k] || []).push(x); });
  return m;
}
function rollupMap(list, keyFn) {
  const g = groupBy(list, keyFn), out = {};
  for (const k in g) {
    const r = rollup(g[k]);
    r.realization = r.collected / r.standardValue;
    r.marginPct = r.collected ? r.margin / r.collected : 0;
    r.effectiveRate = r.hours ? r.collected / r.hours : 0;
    r.leverage = r.partnerHours ? (r.hours - r.partnerHours) / r.partnerHours : 0;
    r.lockupDays = r.collected ? (r.wip + r.arTotal) / (r.collected / 365) : 0;
    out[k] = r;
  }
  return out;
}

const BY_PRACTICE = rollupMap(MATTERS, m => m.practice);
const BY_OFFICE   = rollupMap(MATTERS, m => m.office);
const BY_PARTNER  = rollupMap(MATTERS, m => m.partner);
const BY_FEE      = rollupMap(MATTERS, m => m.feeLabel);
const BY_CLIENT   = rollupMap(MATTERS, m => m.clientId);

/* enrich clients with their rollup + a prior-year comparison (shrinking-client detection) */
CLIENTS.forEach(c => {
  const r = BY_CLIENT[c.id];
  if (!r) return;
  c._rev = r.collected; c._margin = r.margin; c._wip = r.wip; c._ar = r.arTotal;
  c._matters = r.matters; c._active = r.active; c._hours = r.hours;
  c._realization = r.realization; c._marginPct = r.marginPct;
  c._lockupDays = r.lockupDays;
  c._revPrior = r.collected * rr(0.62, 1.44);
  c._delta = c._revPrior ? (c._rev - c._revPrior) / c._revPrior : 0;
  c._practices = [...new Set(MATTERS.filter(m => m.clientId === c.id).map(m => m.practice))];
  c._crossSell = c._practices.length;
});

const CLIENTS_RANKED = [...CLIENTS].sort((a, b) => b._rev - a._rev);
const TOP10 = CLIENTS_RANKED.slice(0, 10);
const TOP25 = CLIENTS_RANKED.slice(0, 25);
FIRM.top10Share = TOP10.reduce((s, c) => s + c._rev, 0) / FIRM.collected;
FIRM.top25Share = TOP25.reduce((s, c) => s + c._rev, 0) / FIRM.collected;
FIRM.shrinkingTop25 = TOP25.filter(c => c._delta < -0.05);

/* ---- 24-month series for charts (deterministic seasonal shape) ---- */
const MONTHS = (() => {
  const out = [];
  let y = 2024, m = 8;
  for (let i = 0; i < 24; i++) {
    out.push({ key: `${y}-${String(m).padStart(2, '0')}`,
               label: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][m - 1] + " '" + String(y).slice(2) });
    m++; if (m > 12) { m = 1; y++; }
  }
  return out;
})();
const SERIES = (() => {
  /* monthly shape: August/December dips, June/March peaks; last 12 months sum to FIRM totals */
  const shape = [0.86, 0.99, 1.03, 1.05, 0.92, 1.10, 1.02, 0.88, 1.04, 1.07, 0.95, 1.09];
  const raw = MONTHS.map((mo, i) => shape[i % 12] * (1 + (i - 12) * 0.0042));
  const ttm = raw.slice(12);
  const ttmSum = ttm.reduce((a, b) => a + b, 0);
  const scale = FIRM.collected / ttmSum;
  return MONTHS.map((mo, i) => {
    const collected = raw[i] * scale;
    const billed = collected / FIRM.collectionRealization;
    const standard = billed / FIRM.billingRealization;
    return { ...mo, collected, billed, standard,
             hours: FIRM.hours * (raw[i] / ttmSum) , margin: collected * FIRM.marginPct };
  });
})();
const SERIES_TTM = SERIES.slice(12);

/* ---- needs-attention triage, joined across systems ---- */
const TRIAGE = (() => {
  const out = [];
  const wip90 = MATTERS.filter(m => m.active && m.wip > 60000).sort((a, b) => b.wip - a.wip).slice(0, 40);
  const wip90Total = wip90.reduce((s, m) => s + m.wip, 0);
  out.push({ sev: 'red', t: `${wip90.length} matters holding unbilled WIP over $60K`,
    d: `Oldest entries predate the current billing cycle. Elite 3E WIP × timekeeper delinquency from Intapp Time.`,
    a: fmtK_(wip90Total), href: '/law/lockup/' });

  const over = MATTERS.filter(m => m.active && m.overBudget);
  out.push({ sev: 'amber', t: `${over.length} active matters over budget`,
    d: `Standard value exceeds the agreed budget by more than 5%. Budget from 3E, burn computed in-portal.`,
    a: fmtK_(over.reduce((s, m) => s + (m.standardValue - m.budget), 0)), href: '/law/matters/' });

  out.push({ sev: 'red', t: `${FIRM.shrinkingTop25.length} of the top 25 clients are shrinking`,
    d: `Revenue below prior year. 3E collections × InterAction engagement recency.`,
    a: fmtK_(FIRM.shrinkingTop25.reduce((s, c) => s + (c._revPrior - c._rev), 0)), href: '/law/clients/' });

  out.push({ sev: 'amber', t: `E-billing rejections unrecovered this year`,
    d: `${(EBILL.rejRate * 100).toFixed(1)}% of submitted value rejected; ${(EBILL.appealed / EBILL.rejected * 100).toFixed(0)}% appealed. Portal APIs × parsed guidelines.`,
    a: fmtK_(EBILL.unrecovered), href: '/law/billing/' });

  const loss = MATTERS.filter(m => m.active && m.margin < 0);
  out.push({ sev: 'red', t: `${loss.length} active matters are loss-making`,
    d: `Collections below cost of the hours worked plus allocated overhead. 3E × ADP cost rates.`,
    a: fmtK_(loss.reduce((s, m) => s + m.margin, 0)), href: '/law/profitability/' });

  const delinq = TIMEKEEPERS.filter(t => t.delinquentDays > 7);
  out.push({ sev: 'amber', t: `${delinq.length} timekeepers more than 7 days delinquent on time`,
    d: `Reconstructed time is systematically lower than contemporaneous time. Intapp Time.`,
    a: delinq.length + ' people', href: '/law/people/' });

  return out;
})();
function fmtK_(n) {
  const a = Math.abs(n);
  if (a >= 1e6) return (n < 0 ? '-' : '') + '$' + (a / 1e6).toFixed(1) + 'M';
  if (a >= 1e3) return (n < 0 ? '-' : '') + '$' + Math.round(a / 1e3) + 'K';
  return (n < 0 ? '-' : '') + '$' + Math.round(a);
}

/* ============================================================
   6. P&L — constructed so net income ties to FIRM.margin exactly.
   Total expense is defined as revenue − margin, then split into
   categories by weight. The statement can never disagree with the
   dashboard because it is the same number, decomposed.
   ============================================================ */
const PY_REVENUE = SERIES.slice(0, 12).reduce((s, m) => s + m.collected, 0);

const PNL = (() => {
  const rev = FIRM.collected;
  const totalExp = rev - FIRM.margin;
  const direct = FIRM.workCost;
  const oh = FIRM.overhead;
  const disb = FIRM.costs * 0.35;

  const lines = [
    { g: 'Revenue', k: 'Fee revenue — collected',           v: rev, rev: true },
    { g: 'Direct cost', k: 'Partner compensation',          v: direct * 0.462 },
    { g: 'Direct cost', k: 'Associate & counsel compensation', v: direct * 0.401 },
    { g: 'Direct cost', k: 'Paralegal compensation',        v: direct * 0.137 },
    { g: 'Operating expense', k: 'Business services compensation', v: oh * 0.301 },
    { g: 'Operating expense', k: 'Occupancy',               v: oh * 0.178 },
    { g: 'Operating expense', k: 'Technology & systems',    v: oh * 0.152 },
    { g: 'Operating expense', k: 'Marketing & business development', v: oh * 0.071 },
    { g: 'Operating expense', k: 'Library & online research', v: oh * 0.062 },
    { g: 'Operating expense', k: 'Professional indemnity & insurance', v: oh * 0.058 },
    { g: 'Operating expense', k: 'Travel & entertainment',  v: oh * 0.049 },
    { g: 'Operating expense', k: 'Recruiting & professional development', v: oh * 0.041 },
    { g: 'Operating expense', k: 'Other operating',         v: oh * 0.088 },
    { g: 'Disbursements', k: 'Unrecovered client disbursements', v: disb },
  ];
  /* absorb float drift into the largest expense line so the statement foots */
  const expSum = lines.filter(l => !l.rev).reduce((s, l) => s + l.v, 0);
  const drift = totalExp - expSum;
  const biggest = lines.filter(l => !l.rev).sort((a, b) => b.v - a.v)[0];
  biggest.v += drift;

  lines.forEach(l => {
    l.pct = l.v / rev;
    l.py = l.v * (l.rev ? PY_REVENUE / rev : rr(0.90, 1.06) * PY_REVENUE / rev);
  });
  return {
    lines, revenue: rev, totalExpense: totalExp, netIncome: FIRM.margin,
    netMargin: FIRM.margin / rev, pyRevenue: PY_REVENUE,
    perEquityPartner: FIRM.margin / PARTNERS.length,
    groups: ['Revenue', 'Direct cost', 'Operating expense', 'Disbursements'],
  };
})();

/* ---- Budget: prior-year actual uplifted; variance vs actual ---- */
const BUDGET = (() => {
  const revBudget = PY_REVENUE * 1.072;
  const lines = PNL.lines.map(l => {
    const budget = l.rev ? revBudget : l.py * rr(1.015, 1.075);
    return { k: l.k, g: l.g, rev: !!l.rev, actual: l.v, budget,
             variance: l.rev ? l.v - budget : budget - l.v,   // favourable positive either way
             variancePct: (l.rev ? (l.v - budget) : (budget - l.v)) / budget };
  });
  return { lines, revBudget,
           revVariance: FIRM.collected - revBudget,
           expBudget: lines.filter(l => !l.rev).reduce((s, l) => s + l.budget, 0),
           expActual: PNL.totalExpense,
           niBudget: revBudget - lines.filter(l => !l.rev).reduce((s, l) => s + l.budget, 0) };
})();

/* ---- Rate card: class × office, from the actual timekeeper population ---- */
const RATE_CARD = (() => {
  const grid = {};
  TK_CLASSES.forEach(c => {
    grid[c.id] = { label: c.label, offices: {} };
    OFFICES.forEach(o => {
      const pool = TIMEKEEPERS.filter(t => t.cls === c.id && t.office === o.id);
      if (!pool.length) return;
      grid[c.id].offices[o.id] = {
        n: pool.length,
        rate: pool.reduce((s, t) => s + t.rate, 0) / pool.length,
        lo: Math.min(...pool.map(t => t.rate)),
        hi: Math.max(...pool.map(t => t.rate)),
        cost: pool.reduce((s, t) => s + t.costRate, 0) / pool.length,
      };
    });
  });
  /* rate exceptions — clients holding a discount off the standard card */
  const exceptions = CLIENTS.filter(c => c._rev > 0 && c.ocgCount > 0)
    .sort((a, b) => b._rev - a._rev).slice(0, 24)
    .map((c, i) => ({
      client: c.name, clientId: c.id, revenue: c._rev,
      discount: 0.04 + ((i * 7) % 19) / 100,
      expires: `202${6 + (i % 2)}-${String(((i * 5) % 12) + 1).padStart(2, '0')}-01`,
      approvedBy: PARTNERS[(i * 13) % PARTNERS.length].name,
      status: i % 7 === 0 ? 'Expiring' : i % 5 === 0 ? 'Pending review' : 'Active',
    }));
  return { grid, exceptions };
})();

/* ---- E-billing detail by client: the rejection taxonomy, per relationship ---- */
const EBILL_CLIENTS = (() => {
  const g = groupBy(MATTERS.filter(m => m.ebill), m => m.clientId);
  return Object.keys(g).map(cid => {
    const c = CLIENT_BY_ID[cid];
    const submitted = g[cid].reduce((s, m) => s + m.billed, 0);
    const rate = 0.018 + (parseInt(cid.slice(1), 10) % 63) / 1000;   // 1.8% – 8.0%, deterministic
    const rejected = submitted * rate;
    const appealed = rejected * (0.16 + (parseInt(cid.slice(1), 10) % 47) / 100);
    const recovered = appealed * 0.66;
    /* each client's rejection mix is its own — driven by its guidelines */
    const mix = EBILL.reasons.map((r, i) => ({
      code: r.code, label: r.label,
      amount: rejected * r.pct * (0.55 + ((parseInt(cid.slice(1), 10) + i * 17) % 90) / 100),
    }));
    const mixSum = mix.reduce((s, x) => s + x.amount, 0);
    mix.forEach(x => { x.amount = x.amount / mixSum * rejected; x.pct = x.amount / rejected; });
    return {
      clientId: cid, client: c.name, portal: c.ebillPortal, ocgCount: c.ocgCount,
      matters: g[cid].length, submitted, rate, rejected, appealed, recovered,
      unrecovered: rejected - recovered, mix,
      daysToPay: 34 + (parseInt(cid.slice(1), 10) % 78),
    };
  }).sort((a, b) => b.rejected - a.rejected);
})();
/* rescale so the per-client detail foots to the firm e-billing total */
(function tieEbill() {
  const s = EBILL_CLIENTS.reduce((a, x) => a + x.rejected, 0);
  const k = EBILL.rejected / s;
  EBILL_CLIENTS.forEach(x => {
    x.rejected *= k; x.appealed *= k; x.recovered *= k; x.unrecovered *= k;
    x.mix.forEach(m => { m.amount *= k; });
  });
  const a = EBILL_CLIENTS.reduce((t, x) => t + x.recovered, 0);
  EBILL.recovered = a;
  EBILL.appealed = EBILL_CLIENTS.reduce((t, x) => t + x.appealed, 0);
  EBILL.unrecovered = EBILL.rejected - a;
})();

/* ---- AR aging + collections work queue ---- */
const AGING = (() => {
  const buckets = ['a0', 'a30', 'a60', 'a90', 'a120'];
  const labels = { a0: 'Current', a30: '31–60 days', a60: '61–90 days', a90: '91–120 days', a120: '120+ days' };
  const byPractice = {};
  PRACTICES.forEach(p => {
    const r = BY_PRACTICE[p.name];
    if (r) byPractice[p.name] = { total: r.arTotal, wip: r.wip, ...Object.fromEntries(buckets.map(b => [b, r[b]])) };
  });
  const worst = MATTERS.filter(m => m.active && (m.ar.a90 + m.ar.a120) > 0)
    .sort((a, b) => (b.ar.a90 + b.ar.a120) - (a.ar.a90 + a.ar.a120)).slice(0, 40);
  const wipOld = MATTERS.filter(m => m.active && m.wip > 0)
    .sort((a, b) => b.wip - a.wip).slice(0, 40);
  return { buckets, labels, byPractice, worst, wipOld,
           firm: Object.fromEntries(buckets.map(b => [b, FIRM[b]])) };
})();

/* ============================================================
   7. Export — one object, read-only by convention
   ============================================================ */
const MODEL = {
  asOf: AS_OF, asOfLabel: AS_OF_LABEL,
  offices: OFFICES, practices: PRACTICES, tkClasses: TK_CLASSES,
  timekeepers: TIMEKEEPERS, tkById: TK_BY_ID, partners: PARTNERS, lawyers: LAWYERS,
  clients: CLIENTS, clientById: CLIENT_BY_ID, clientsRanked: CLIENTS_RANKED, top10: TOP10, top25: TOP25,
  matters: MATTERS, matterById: MATTER_BY_ID,
  walledMatters: WALLED_MATTERS,
  firm: FIRM, ebill: EBILL, ebillClients: EBILL_CLIENTS,
  pnl: PNL, budget: BUDGET, rateCard: RATE_CARD, aging: AGING,
  pyRevenue: PY_REVENUE, overheadK: MODEL_OVERHEAD_K,
  byPractice: BY_PRACTICE, byOffice: BY_OFFICE, byPartner: BY_PARTNER, byFee: BY_FEE, byClient: BY_CLIENT,
  months: MONTHS, series: SERIES, seriesTTM: SERIES_TTM,
  triage: TRIAGE,
  rollup, rollupMap, groupBy,
  rateStats: _rateStats,
};
window.MODEL = MODEL;
