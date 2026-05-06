# CLAUDE.md — Meridian Platform

## What this is

Meridian is a browser-native strategy analytics platform built by Archishman Bandyopadhyay.
No server. No licence. No data leaves the user's machine. All computation runs in-browser:
vanilla JS, Web Workers, and Pyodide (WebAssembly Python for ML inference).

The platform is a suite of analytical modules, each purpose-built for a specific strategy
consulting engagement archetype, unified by a single data ingestion and ETL core (Meridian Bridge).


## Repo structure

```
meridian/
├── CLAUDE.md                  ← you are here
├── index.html                 ← platform home, module router, pipeline library
├── bridge/
│   └── index.html             ← Meridian Bridge (ETL core, extended DataBridge)
├── price/
│   └── index.html             ← Meridian Price (Pricing Analyser)
├── pulse/
│   └── index.html             ← Meridian Pulse (Consumer Analytics)
├── ledger/
│   └── index.html             ← Meridian Ledger (Finance & Commercial Diagnostics)
├── org/
│   └── index.html             ← Meridian Org (HR & Operating Model)
├── field/
│   └── index.html             ← Meridian Field (Market & Competitive Intelligence)
├── flow/
│   └── index.html             ← Meridian Flow (Supply Chain & Operations)
├── shared/
│   ├── handoff.js             ← AppHandoff protocol + shared constants
│   ├── canvas.js              ← Canvas engine, node registry, edge renderer
│   └── pipelines.js           ← Pipeline save/load/replay engine
└── demos/
    └── renova/                ← Renova Home demo datasets (6 CSV files)
```


## Module registry

| Module           | Folder    | Compute         | Phase  | Status      |
|------------------|-----------|-----------------|--------|-------------|
| Meridian Bridge  | bridge/   | JS + Workers    | 0      | ✓ Live      |
| Meridian Price   | price/    | JS + Workers    | 1      | ✓ Live      |
| Meridian Pulse   | pulse/    | JS (ML Phase 2.1 → Pyodide) | 2 | ✓ Live |
| Meridian Ledger  | ledger/   | JS              | 3      | ✓ Live      |
| Meridian Org     | org/      | JS              | 3      | ✓ Live      |
| Meridian Field   | field/    | JS + Pyodide    | 4      | Planned     |
| Meridian Flow    | flow/     | JS + Pyodide    | 4      | Planned     |


## AppHandoff schema — IMMUTABLE

This is the interface contract between Meridian Bridge and every downstream module.
Written to sessionStorage by Bridge. Key: `meridian_handoff`.
Adding new fields is allowed. Removing or renaming existing fields is NOT.

```json
{
  "source":       "Meridian Bridge",
  "targetModule": "pulse",
  "pipelineId":   "pipe_abc123",
  "sentAt":       "2025-11-01T08:45:00Z",
  "rowCount":     45231,
  "columns":      ["customer_id", "revenue_ltm", "last_purchase_date"],
  "columnTypes":  { "customer_id": "id", "revenue_ltm": "number", "last_purchase_date": "date" },
  "schema":       { "customerId": "customer_id", "revenue": "revenue_ltm" },
  "qualityScore": 0.94,
  "rows":         [{ "customer_id": "C001", "revenue_ltm": 4200 }]
}
```

`targetModule` values: `price` | `pulse` | `ledger` | `org` | `field` | `flow`
`pipelineId` is null for ad-hoc (non-pipeline) workflows.
`qualityScore` is 0–1. Modules warn the user when qualityScore < 0.80.
`columnTypes` values: `id` | `number` | `text` | `date` | `percent` | `boolean`


## Four-method module interface — every module implements this

```javascript
receiveHandoff(payload)      // reads sessionStorage, validates structure
validateSchema(schema, required[])  // checks all required dimensions are mapped
initModule(rows, schema)     // sets up AppState, prepares data for analysis
renderOutputs()              // renders all analytical outputs and charts
```

Modules that require Pyodide add a fifth method, called asynchronously before initModule:

```javascript
initPyodide()                // loads Pyodide runtime, imports scientific stack
```

Pyodide modules (Phase 2.1+): pulse (BG/NBD upgrade), field, flow.
JS-only modules (current): bridge, price, pulse (Phase 2.0), ledger, org.


## Canvas system

The canvas is an optional interaction layer — an Alteryx-style drag-drop node graph —
available across the full platform. Canvas and panel UI are two views of the same
underlying workflow data model. Switching between them mid-workflow does not reset state.

### Canvas node types

| Type       | Description                                                        |
|------------|--------------------------------------------------------------------|
| source     | Data input: CSV upload, XLSX upload, demo dataset, sessionStorage  |
| transform  | ETL operation: filter, aggregate, join, pivot, calculate, bin, rank|
| schemaMap  | Maps columns to analytical dimensions for a target module          |
| analysis   | Analytical output: waterfall, CLTV model, margin bridge, etc.      |
| visualise  | Chart, table, summary card — reads from an analysis node           |
| export     | PDF, XLSX, PNG — terminal nodes, no outgoing edges                 |

All node types are registered in `shared/canvas.js` NodeRegistry.
Canvas is scoped to genuine pipelines only (Bridge ETL, Price Scenario Modeller).
It is NOT used in independent-analysis panels (Price sub-modules, Pulse, Ledger, Org).


## Pipeline data model

Pipelines store workflow configuration only — never data.
localStorage key: `meridian_pipelines` (array of pipeline objects).
Export format: `.meridian` (JSON file, same structure).

```json
{
  "id":         "pipe_monthly_pricing_rev",
  "name":       "Monthly Pricing Review — Renova",
  "module":     "price",
  "createdAt":  "2025-10-01T09:00:00Z",
  "lastRunAt":  "2025-11-01T08:45:00Z",
  "nodes": [
    { "id": "n1", "type": "source",    "config": { "mode": "upload" } },
    { "id": "n2", "type": "transform", "config": { "op": "filter", "expr": "[year] == 2024" } },
    { "id": "n3", "type": "schemaMap", "config": { "module": "price", "map": { "listPrice": "list_price" } } },
    { "id": "n4", "type": "analysis",  "config": { "analysis": "pocket_price_waterfall" } },
    { "id": "n5", "type": "export",    "config": { "format": "pdf", "filename": "pricing_review_{date}" } }
  ],
  "edges": [
    { "from": "n1", "to": "n2" }, { "from": "n2", "to": "n3" },
    { "from": "n3", "to": "n4" }, { "from": "n4", "to": "n5" }
  ]
}
```


## CDN dependency stack — exact versions, no substitutions

```
PapaParse    5.4      CSV parsing
SheetJS      0.20     XLSX read/write
Chart.js     4.4      Charts and visualisations
D3           7.9      Custom SVG analytics
math.js      13       Statistical functions
jsPDF        2.5      PDF export
html2canvas  1.4      Chart-to-image for export
Pyodide      0.25+    In-browser Python/ML (Phase 2.1+ modules)
```

Load all dependencies via CDN (cdnjs.cloudflare.com).
No npm, no bundler, no build step. Single HTML file per module.


## Hard constraints — never violate these

1. **Zero server** — no fetch() to any backend, no API calls, no serverless functions
2. **Single HTML file per module** — no bundler, no build step, no imports from other modules
3. **CDN-only dependencies** — exact versions listed above, no others without explicit decision
4. **AppHandoff schema is immutable** — adding fields OK, removing/renaming NOT OK
5. **Canvas and panel share config components** — never duplicate configuration UI logic
6. **Pipelines store config only** — never serialize row data into localStorage or JSON export
7. **No data leaves the machine** — stated as architectural fact, not marketing claim


## Design tokens — consistent across all modules

```
Font stack:    DM Serif Display (headings) · DM Sans (body) · JetBrains Mono (code/labels)
Dark theme:    --bg: #0d1117  --surface: #10151e  --surface2: #161b25
               --border: #1c2230  --border2: #2a3142
               --text: #e6e8ee  --text2: #c0c8d8  --muted: #9ba6ba
Module colours: Price → teal #22d3b8 · Pulse → purple #a78bfa
                Ledger → amber #f5a524 · Org → coral #fb7185
                Field → blue #60a5fa · Flow → green #4ade80
```


## Demo organisation — Renova Home

Mid-market home improvement and décor retail chain, India.
180 stores (Tier 1 + Tier 2). E-commerce ~22% of revenue. B2B contractor segment ~15%.
FY2024 revenue: ₹2,400 Cr. Loyalty programme: 2.1M customers.

### Demo datasets (inline generated — no separate CSV files required for demo mode)

| Module  | Key signals baked in                                               |
|---------|--------------------------------------------------------------------|
| Bridge  | Intentionally messy — mixed formats, nulls, duplicate order IDs   |
| Price   | B2B pocket price leakage 18% below invoice, 2 sales reps over policy |
| Pulse   | Churn signal in occasional buyers, Champions in Tier 1 + B2B      |
| Ledger  | E-comm COGS margin compression H2 FY2024, WC deterioration DIO+15d |
| Org     | High attrition store managers (L3), under-spanned regional directors |
| Field   | Whitespace in high-income Tier 2 districts (Phase 4)               |
| Flow    | Import SKU lead time variance, stockout in bathroom fittings (Phase 4) |


## Analytical methodology decisions (Phase 3)

### Meridian Ledger
- Revenue bridge: volume/price/mix decomposition. When unit volume not mapped, directional
  estimation from revenue growth rates and margin movements (labelled as such in UI).
- Working capital: DSO = (Receivables/Revenue)×30, DPO = (Payables/COGS)×30,
  DIO = (Inventory/COGS)×30, CCC = DSO+DIO−DPO.
- Cash flow waterfall: WC movement estimated from period-on-period DSO/DPO/DIO delta
  when direct cash flow statement not available (labelled as approximation).
- Revenue forecast: Linear trend regression + seasonal indices (ratio-to-trend by calendar month).
  Bounds = ±1σ of historical residuals. Pyodide/ARIMA deferred to Phase 3.1.
- Run Analysis pattern: L1–L5 auto-render (deterministic). L6 explicit Run button (model fitting).

### Meridian Org
- Span of control: direct report count per manager (managerId grouping). Benchmarks:
  Manager L3/L4: 6–8. Director L2: 4–6. VP/Head L1: 3–5.
- Layer benchmarking: levels sorted numerically. IC:Manager ratio from deepest vs all other levels.
- Attrition: rate = leavers/(leavers+active)×100. Voluntary = not performance-exit/redundancy.
  Regrettable = tenure > 24 months + voluntary. India retail benchmark: 18–22%.
- Heatmap: only cells with ≥3 employees shown (small populations produce unreliable rates).
- Capability categories: auto-classified by department name regex. Override via schema mapping.
  Benchmark: Revenue-generating ≥60%, Support ≤25%, Overhead ≤12%.
- No ML in Phase 3. Kaplan-Meier survival analysis deferred to Phase 3.1 (Pyodide).
- All analyses auto-render on data load (deterministic aggregations).


## Build status — update after each phase completes

```
Phase 0:  [✓] repo scaffold  [✓] canvas engine  [✓] pipeline engine
          [✓] AppHandoff v2 in bridge/  [✓] platform home (index.html)

Phase 1:  [✓] Meridian Price — all 8 sub-modules complete
          [✓] Run Analysis button pattern established
          [✓] Scenario Modeller canvas (only canvas in Price — justified branching)

Phase 2:  [✓] Meridian Pulse — 7 sub-modules, JS ML layer (logistic regression, DCF CLTV)
          [✓] Pyodide deferred to Phase 2.1 (BG/NBD, fitted propensity weights)
          [✓] Data mode detection (transaction vs summary), proxy disclosure

Phase 3:  [✓] Meridian Ledger — 6 sub-modules (bridge, P&L, costs, WC, cash flow, forecast)
          [✓] Meridian Org — 5 sub-modules (span, layers, attrition, heatmap, capability)
          [✓] Blueprint Module Registry expanded with full sub-module detail
          [✓] Build journal journal aligned (max-width:640px on journal elements)

Phase 4:  [ ] Meridian Field   [ ] Meridian Flow
          [ ] Renova market + inventory demo datasets
          [ ] Full cross-module demo narrative documented
          [ ] Platform v1.0 shipped
```


## Context for Code sessions

This project originated in Claude Chat (claude.ai) where the full product vision,
architectural decisions, and consulting grounding live. The Chat project contains:
- Full PM lifecycle documentation (Stages 3–7)
- The Meridian Platform Blueprint v2 HTML document
- Detailed module specs, persona definitions, and analytical methodology

When making architectural decisions not covered by this file, err on the side of
consistency with the constraints above and flag the decision in a comment.
