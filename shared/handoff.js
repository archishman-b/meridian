// ════════════════════════════════════════════════════════════════
// Meridian Platform — AppHandoff Protocol
// shared/handoff.js
//
// The interface contract between Meridian Bridge and every module.
// IMMUTABLE: do not remove or rename existing fields.
// Adding new fields is permitted.
// ════════════════════════════════════════════════════════════════

const MERIDIAN_BASE = 'http://archishman.com/meridian/';

const MERIDIAN_MODULES = {
  bridge:  { name: 'Meridian Bridge',  path: 'bridge/',  color: '#22d3b8' },
  price:   { name: 'Meridian Price',   path: 'price/',   color: '#22d3b8' },
  pulse:   { name: 'Meridian Pulse',   path: 'pulse/',   color: '#a78bfa' },
  ledger:  { name: 'Meridian Ledger',  path: 'ledger/',  color: '#f5a524' },
  org:     { name: 'Meridian Org',     path: 'org/',     color: '#fb7185' },
  field:   { name: 'Meridian Field',   path: 'field/',   color: '#60a5fa' },
  flow:    { name: 'Meridian Flow',    path: 'flow/',    color: '#4ade80' },
};

const HANDOFF_KEY = 'meridian_handoff';
const QUALITY_WARN_THRESHOLD = 0.80;

// Column type enum
const COL_TYPES = {
  ID:      'id',
  NUMBER:  'number',
  TEXT:    'text',
  DATE:    'date',
  PERCENT: 'percent',
  BOOLEAN: 'boolean',
};

// ── Write handoff (called by Meridian Bridge) ────────────────────
function writeHandoff({ targetModule, rows, columns, columnTypes, schema, qualityScore, pipelineId = null }) {
  const payload = {
    source:       'Meridian Bridge',
    targetModule,
    pipelineId,
    sentAt:       new Date().toISOString(),
    rowCount:     rows.length,
    columns,
    columnTypes:  columnTypes || inferColumnTypes(rows, columns),
    schema:       schema || {},
    qualityScore: qualityScore != null ? qualityScore : 1,
    rows,
  };
  try {
    sessionStorage.setItem(HANDOFF_KEY, JSON.stringify(payload));
    return { ok: true, payload };
  } catch(e) {
    return { ok: false, error: e.message };
  }
}

// ── Read handoff (called by each module on load) ─────────────────
function readHandoff() {
  try {
    const raw = sessionStorage.getItem(HANDOFF_KEY);
    if (!raw) return null;
    const payload = JSON.parse(raw);
    if (!validateHandoffStructure(payload)) return null;
    return payload;
  } catch(e) {
    return null;
  }
}

// ── Clear handoff after module has consumed it ───────────────────
function clearHandoff() {
  sessionStorage.removeItem(HANDOFF_KEY);
}

// ── Structural validation ────────────────────────────────────────
function validateHandoffStructure(payload) {
  const required = ['source','targetModule','sentAt','rowCount','columns','rows'];
  return required.every(k => payload && payload[k] != null);
}

// ── Schema validation (called by each module) ────────────────────
// requiredDimensions: array of dimension keys the module needs
// returns { valid: bool, missing: [], mapped: {} }
function validateSchema(schema, requiredDimensions) {
  if (!schema || !requiredDimensions) return { valid: false, missing: requiredDimensions || [], mapped: {} };
  const missing = requiredDimensions.filter(d => !schema[d]);
  return {
    valid:   missing.length === 0,
    missing,
    mapped:  Object.fromEntries(Object.entries(schema).filter(([k]) => requiredDimensions.includes(k))),
  };
}

// ── Column type inference ────────────────────────────────────────
function inferColumnTypes(rows, columns) {
  if (!rows || !rows.length) return {};
  const sample = rows.slice(0, Math.min(200, rows.length));
  const types = {};
  columns.forEach(col => {
    const vals = sample.map(r => r[col]).filter(v => v != null && v !== '');
    if (!vals.length) { types[col] = COL_TYPES.TEXT; return; }

    // ID detection — high cardinality strings with id/code/key in name
    if (/\b(id|code|key|num|no|ref)\b/i.test(col) && vals.every(v => typeof v === 'string' || !isNaN(v))) {
      types[col] = COL_TYPES.ID; return;
    }
    // Percent detection
    if (/pct|percent|%|rate|ratio/i.test(col)) {
      types[col] = COL_TYPES.PERCENT; return;
    }
    // Boolean
    const boolVals = new Set(vals.map(v => String(v).toLowerCase()));
    if ([...boolVals].every(v => ['true','false','yes','no','1','0','y','n'].includes(v))) {
      types[col] = COL_TYPES.BOOLEAN; return;
    }
    // Date
    const dateSample = vals.slice(0, 20);
    if (dateSample.every(v => !isNaN(Date.parse(v)) && isNaN(Number(v)))) {
      types[col] = COL_TYPES.DATE; return;
    }
    // Number
    if (vals.every(v => !isNaN(Number(String(v).replace(/[,₹$£€%]/g,''))))) {
      types[col] = COL_TYPES.NUMBER; return;
    }
    types[col] = COL_TYPES.TEXT;
  });
  return types;
}

// ── Navigate to module (Bridge → module) ─────────────────────────
function navigateToModule(targetModule) {
  const mod = MERIDIAN_MODULES[targetModule];
  if (!mod) return;
  const url = MERIDIAN_BASE + mod.path;
  setTimeout(() => window.open(url, '_blank'), 400);
}

// ── Quality score helpers ────────────────────────────────────────
function qualityLabel(score) {
  if (score >= 0.90) return { label: 'Excellent', cls: 'q-good' };
  if (score >= 0.80) return { label: 'Good',      cls: 'q-good' };
  if (score >= 0.60) return { label: 'Fair',       cls: 'q-warn' };
  return                    { label: 'Poor',       cls: 'q-bad'  };
}

// ── Export ───────────────────────────────────────────────────────
if (typeof window !== 'undefined') {
  window.MeridianHandoff = {
    MERIDIAN_BASE,
    MERIDIAN_MODULES,
    HANDOFF_KEY,
    QUALITY_WARN_THRESHOLD,
    COL_TYPES,
    writeHandoff,
    readHandoff,
    clearHandoff,
    validateHandoffStructure,
    validateSchema,
    inferColumnTypes,
    navigateToModule,
    qualityLabel,
  };
}
