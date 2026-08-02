# Whitmore Vance LLP — Firm Operating System

Law-firm instance of the Brain Powered Operating System. Third build on the **CFP Portal Design System v4.0 / Margins tokens**, after [cfp-portal](https://cfp-portal-endurance.pages.dev/demo/portfolio/) and [yates](https://endurance-ai-labs.github.io/yates/).

**Fictional firm, fictional data.** Vendor and system names are real; nothing else is. Every page carries the disclosure watermark.

---

## Access

**Live: https://endurancelabs.ai/law** · backed by https://endurance-ai-labs.github.io/law/

Public landing at **`/welcome/`**. Signed-out visitors hitting `/` are redirected there; the landing's "Enter the portal" links carry `?enter=1`, which shows the password gate instead.

**Password: `enduranceportal`** (SHA-256 hash in `js/util.js`; change it by replacing `GATE_HASH`). Then pick a role from the org chart.

---

## Status

| Phase | What | State |
|---|---|---|
| 0 | Framework lift + brand layer + chrome + role gate | ✅ |
| 1 | Shared `MODEL` in `js/data.js` | ✅ |
| 1 gate | Three pages tying out cell-for-cell | ✅ **passed** |
| 2 | `/financials/` `/lockup/` `/rates/` `/budget/` | ✅ |
| — | `/billing/` + `/profitability/` (demo beats 5a, 5b, pulled forward) | ✅ |
| 9 | `/welcome/` landing + password gate | ✅ |
| 3 | `/matters/` + `/afa/` | ✅ |
| — | `/explore/` exhibit builder + shared filter engine (`js/analytics.js`) | ✅ |
| — | Mobile: no horizontal page scroll at any width | ✅ |
| — | `404.html` catch-all so unbuilt modules explain themselves | ✅ |
| 4 | `/walls/` + `/trust/` | ✅ |
| 6 | `/people/` | ✅ |
| 7 | `/integrations/` connector map | ✅ |
| 8 | `/brain/` cross-system Q&A | ✅ |
| 3 | `/matter/` workspace (8 tabs) | ✅ |
| 4 | `/ocg/` | ✅ |
| 5 | `/litigation/` | ✅ |
| 6 | `/capacity/` + `/origination/` | ✅ |
| 7 | `/collections/` | ✅ |
| 2 | `/comp/` + `/scorecard/` | ✅ |
| 4 | `/intake/` + `/conflicts/` | ✅ |
| 5 | `/transactions/` + `/ediscovery/` | ✅ |
| 6 | `/pipeline/` + `/retention/` | ✅ |
| — | Remaining 5: `/board/` `/knowledge/` `/development/` `/marketing/` `/vendors/` `/it/` `/admin/` `/insurance/` | pending — see `build-spec/OUTLINE.md` §6 |

**Live pages (33):** `/` · `/welcome/` · `/revenue/` · `/clients/` · `/matters/` · `/afa/` · `/financials/` · `/lockup/` · `/rates/` · `/budget/` · `/billing/` · `/profitability/`

Every other nav route resolves to `404.html`, which names the module, what it will hold and which phase it lands in — nothing dead-ends.

### Gate result

`/`, `/revenue/` and `/clients/` all report **$411,122,563.70** — to the cent, from one computation. Practice, office, client and 24-month-series rollups each sum to the same figure with zero delta.

### Firm the model produces

| | |
|---|---|
| Revenue (TTM collected) | $411.1M |
| Headcount | 640 — 466 lawyers, 510 timekeepers, 118 equity partners |
| Clients | 2,100 on file · 1,267 active |
| Matters | 4,900 worked · 1,887 open |
| Realization | 87.4% (billing 89.7% × collection 97.4%) |
| Standard / effective rate | $668 / $584 — $84 leaked per billed hour |
| Utilization | 82.1% · leverage 3.45 |
| Contribution margin | 38.3% |
| Lockup | 113 days (WIP 55 + AR 58) |
| Top-10 concentration | 24.6% |
| Loss-making active matters | 109 (5.8%) |

---

## Run it

```bash
python -c "import http.server,functools,socketserver;H=functools.partial(http.server.SimpleHTTPRequestHandler,directory=r'C:/Users/RamzyAzar/lawfirm-portal');socketserver.ThreadingTCPServer(('127.0.0.1',5240),H).serve_forever()"
```

Or `preview_start` the `lawfirm-portal` config in `.claude/launch.json` (port 5240).

Reset demo state:

```bash
node -e "console.log(\"Object.keys(localStorage).filter(k=>k.startsWith('wv-')).forEach(k=>localStorage.removeItem(k))\")"
```

---

## Architecture

```
css/    theme.css → tokens · base · layout · components · utilities   (lifted, unmodified)
        endurance.css   gloss/metal layer                             (lifted)
        demo.css        demo-page vocabulary                          (lifted)
        lawfirm.css     BRAND LAYER — the only file that overrides tokens
js/     data.js         THE MODEL — one dataset, computed once
        util.js         formatters · role gate · walls · source chips · tie chips · tooltips · approvals
        nav.js          topbar · ticker · marquee · sub-nav · theme toggle
        grid-tools.js   collapse / print / XLSX export                (lifted)
vendor/ chart.umd.min.js · xlsx.full.min.js
docs/   BUILD-PROMPT.md · PROMPT.md · OUTLINE.md
```

**Rule: no page computes a firm-level figure.** If a number appears on two pages it comes from `MODEL`, so it ties by construction. Pages that filter show a "filtered view" note instead of a tie chip.

### The MODEL

Deterministic seeded PRNG — same firm every load, no `Date.now()`, no `Math.random()`. The generator produces realistic *relative* sizes; a `normalize()` pass then rescales the whole book so headline metrics equal what a firm of this shape actually reports:

1. **Hours** → scaled to real capacity (510 timekeepers × target × 82.1% utilization)
2. **Realization** → discounts and write-downs scaled to hit 89.7% billing realization; collection shortfalls scaled to 97.4%
3. **Overhead** → multiplier *solved* so firm margin lands on 38.3%
4. **WIP / AR** → scaled to 55 + 58 lockup days

Change a `TARGET` value and the whole firm moves coherently. This is why the ticker, the copy and the KPIs can never disagree.

### Role gating

Ten personas in `util.js`. Gating is at the data layer, not the view:

- `scopeMatters()` filters by practice group for non-firm-wide roles
- `screenMatters()` removes ethically walled matters entirely — they don't grey out, they cease to exist, and every downstream total recomputes
- Financial nav group, money columns, the triage panel and money ticker items all disappear for roles without `fin`
- Firm-wide comparatives (RPL, client concentration) are hidden from group-scoped roles

**Verified:** the Litigation PGL is walled off the largest active Litigation matter. Their revenue drops by exactly that matter's collections ($2,015,033) and their heat grid shows one practice, not seven.

---

## Gotchas already paid for

- **TDZ:** page filter state must be `var`, declared before the first `render()`. `data.js` constants read by the matter generator (`TARGET`, `OVERHEAD_K`) are declared above it for the same reason.
- **Cache:** editing any `css/*.css` **or `js/*.js`** requires bumping `?v=` in every page's `<link>` and `<script>` tags. A JS edit without the bump silently serves the old file — that is how a missing `addDays()` survived a full verification pass.
- **Globals:** classic scripts share scope — page-level names must not collide with `data.js` / `util.js` / `nav.js`.
- **Paths** are root-relative (`/css/…`). Deploying under a path prefix (`/law/`) needs a find-replace — Phase 9.
- Hidden browser pane pauses CSS animations; motion checks read 0 px/s falsely.

---

## Interactive pieces built so far

- **`/rates/` increase modeler** — three sliders (increase, realization drag, share of revenue behind a rate freeze). A 6% increase reads as $24.7M to the room; the model says $12.6M. That gap is the point of the screen.
- **`/lockup/` release calculator** — days removed → cash released → carrying value at the revolver rate. Defaults to 5 days because a number the CFO won't argue with is worth more than one that's merely true.
- **`/billing/` pre-submission compliance check** — a draft invoice checked live against that client's parsed guidelines. Four of six lines blocked before submission.
- **`/budget/` variance drivers** — every line prints its deterministic sub-item composition underneath, tying exactly to the line total, recomputing with the month selector.
- **`/profitability/` methodology panel** — the overhead allocation basis stated on the page, because that's the number firms argue about.

## Next

Phases 3–8: matters and the matter workspace, risk and compliance, practice modules, talent, growth, operations, the Brain. Order follows `docs/OUTLINE.md` §6, which is sequenced to deliver the demo run-of-show beats in order.

Not yet done: repo not created or pushed; deployment path prefix (`/law/`) not applied.
