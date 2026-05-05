// ════════════════════════════════════════════════════════════════
// Meridian Platform — Pipeline Engine
// shared/pipelines.js
//
// Save, load, replay, export and import named analysis pipelines.
// Pipelines store configuration only — never row data.
// localStorage key: 'meridian_pipelines'
// Export format: .meridian (JSON)
// ════════════════════════════════════════════════════════════════

const PIPELINES_KEY = 'meridian_pipelines';
const PIPELINE_FILE_EXT = '.meridian';
const PIPELINE_VERSION = '1.0';

// ── Core CRUD ────────────────────────────────────────────────────

function getAllPipelines() {
  try {
    const raw = localStorage.getItem(PIPELINES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch(e) {
    return [];
  }
}

function getPipeline(id) {
  return getAllPipelines().find(p => p.id === id) || null;
}

function savePipeline(pipeline) {
  const all = getAllPipelines();
  const idx = all.findIndex(p => p.id === pipeline.id);
  const now = new Date().toISOString();
  const record = {
    ...pipeline,
    version:     PIPELINE_VERSION,
    updatedAt:   now,
    createdAt:   pipeline.createdAt || now,
  };
  if (idx >= 0) {
    all[idx] = record;
  } else {
    all.unshift(record); // newest first
  }
  try {
    localStorage.setItem(PIPELINES_KEY, JSON.stringify(all));
    return { ok: true, pipeline: record };
  } catch(e) {
    return { ok: false, error: e.message };
  }
}

function deletePipeline(id) {
  const all = getAllPipelines().filter(p => p.id !== id);
  try {
    localStorage.setItem(PIPELINES_KEY, JSON.stringify(all));
    return { ok: true };
  } catch(e) {
    return { ok: false, error: e.message };
  }
}

function renamePipeline(id, newName) {
  const all = getAllPipelines();
  const p = all.find(p => p.id === id);
  if (!p) return { ok: false, error: 'Pipeline not found' };
  p.name = newName;
  p.updatedAt = new Date().toISOString();
  try {
    localStorage.setItem(PIPELINES_KEY, JSON.stringify(all));
    return { ok: true };
  } catch(e) {
    return { ok: false, error: e.message };
  }
}

// ── Create new pipeline ──────────────────────────────────────────

function createPipeline({ name, module, nodes = [], edges = [] }) {
  const id = 'pipe_' + Date.now() + '_' + Math.random().toString(36).slice(2,7);
  const pipeline = {
    id,
    name,
    module,
    createdAt:  new Date().toISOString(),
    updatedAt:  new Date().toISOString(),
    lastRunAt:  null,
    runCount:   0,
    version:    PIPELINE_VERSION,
    nodes,
    edges,
  };
  return savePipeline(pipeline).ok ? pipeline : null;
}

// ── Mark pipeline as run ─────────────────────────────────────────

function recordPipelineRun(id) {
  const all = getAllPipelines();
  const p = all.find(p => p.id === id);
  if (!p) return;
  p.lastRunAt = new Date().toISOString();
  p.runCount = (p.runCount || 0) + 1;
  try { localStorage.setItem(PIPELINES_KEY, JSON.stringify(all)); } catch(e) {}
}

// ── Export pipeline to .meridian file ────────────────────────────

function exportPipeline(id) {
  const pipeline = getPipeline(id);
  if (!pipeline) return;
  const data = JSON.stringify(pipeline, null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  const safe = pipeline.name.replace(/[^a-z0-9_\-]/gi, '_').toLowerCase();
  a.href     = url;
  a.download = safe + PIPELINE_FILE_EXT;
  a.click();
  URL.revokeObjectURL(url);
}

function exportAllPipelines() {
  const all = getAllPipelines();
  if (!all.length) return;
  const data = JSON.stringify({ version: PIPELINE_VERSION, pipelines: all, exportedAt: new Date().toISOString() }, null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = 'meridian_pipelines_backup' + PIPELINE_FILE_EXT;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Import pipeline from .meridian file ──────────────────────────

function importPipeline(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const data = JSON.parse(e.target.result);
        // Single pipeline or bulk export
        if (data.pipelines) {
          // Bulk export
          let imported = 0;
          data.pipelines.forEach(p => {
            p.id = 'pipe_' + Date.now() + '_' + Math.random().toString(36).slice(2,7);
            p.importedAt = new Date().toISOString();
            savePipeline(p);
            imported++;
          });
          resolve({ ok: true, count: imported });
        } else if (data.id && data.nodes) {
          // Single pipeline — give it a new ID to avoid collision
          data.id = 'pipe_' + Date.now() + '_' + Math.random().toString(36).slice(2,7);
          data.importedAt = new Date().toISOString();
          savePipeline(data);
          resolve({ ok: true, count: 1, pipeline: data });
        } else {
          reject(new Error('Invalid .meridian file'));
        }
      } catch(err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error('File read error'));
    reader.readAsText(file);
  });
}

// ── Pipeline node helpers ─────────────────────────────────────────

function createNode(type, config = {}) {
  return {
    id:     'n_' + Date.now() + '_' + Math.random().toString(36).slice(2,5),
    type,
    config,
    x:      100,
    y:      100,
  };
}

function createEdge(fromId, toId) {
  return { from: fromId, to: toId };
}

// ── Topological sort for pipeline execution order ─────────────────
// Returns nodes in execution order, or null if cycle detected

function topoSort(nodes, edges) {
  const inDegree = {};
  const adj = {};
  nodes.forEach(n => { inDegree[n.id] = 0; adj[n.id] = []; });
  edges.forEach(e => {
    if (adj[e.from]) adj[e.from].push(e.to);
    if (inDegree[e.to] != null) inDegree[e.to]++;
  });
  const queue = nodes.filter(n => inDegree[n.id] === 0).map(n => n.id);
  const order = [];
  while (queue.length) {
    const id = queue.shift();
    order.push(id);
    (adj[id] || []).forEach(next => {
      inDegree[next]--;
      if (inDegree[next] === 0) queue.push(next);
    });
  }
  return order.length === nodes.length ? order : null; // null = cycle
}

// ── Validate pipeline before run ─────────────────────────────────

function validatePipeline(pipeline) {
  const errors = [];
  if (!pipeline.nodes || !pipeline.nodes.length) {
    errors.push('Pipeline has no nodes');
    return { valid: false, errors };
  }
  const sources = pipeline.nodes.filter(n => n.type === 'source');
  if (!sources.length) errors.push('Pipeline needs at least one source node');
  const exports = pipeline.nodes.filter(n => n.type === 'export');
  if (!exports.length) errors.push('Pipeline needs at least one export node');
  const order = topoSort(pipeline.nodes, pipeline.edges || []);
  if (!order) errors.push('Pipeline has a circular dependency');
  return { valid: errors.length === 0, errors, executionOrder: order };
}

// ── Pipeline library UI renderer ──────────────────────────────────
// Renders a pipeline list into a target element

function renderPipelineLibrary(containerId, opts = {}) {
  const container = document.getElementById(containerId);
  if (!container) return;
  const all = getAllPipelines();
  const { onRun, onDelete, onExport, onRename, filterModule } = opts;

  const pipelines = filterModule ? all.filter(p => p.module === filterModule) : all;

  if (!pipelines.length) {
    container.innerHTML = `<div style="padding:24px;text-align:center;color:var(--muted);font-size:12px">
      No saved pipelines yet.<br>Build a workflow and save it to reuse it later.
    </div>`;
    return;
  }

  container.innerHTML = pipelines.map(p => {
    const mod = (typeof MERIDIAN_MODULES !== 'undefined' && MERIDIAN_MODULES[p.module]) || {};
    const color = mod.color || '#22d3b8';
    const modName = mod.name || p.module;
    const lastRun = p.lastRunAt ? new Date(p.lastRunAt).toLocaleDateString() : 'Never run';
    const runs = p.runCount || 0;
    return `
    <div class="pipeline-item" data-id="${p.id}" style="
      display:flex;align-items:center;gap:12px;
      padding:12px 14px;border-bottom:1px solid var(--border);
      cursor:default;transition:background 0.1s;
    " onmouseenter="this.style.background='var(--surface2)'" onmouseleave="this.style.background=''">
      <div style="flex:1;min-width:0">
        <div style="font-size:13px;font-weight:500;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escapeHtml(p.name)}</div>
        <div style="font-size:10px;color:var(--muted);margin-top:2px;display:flex;gap:8px;align-items:center">
          <span style="color:${color};font-family:var(--mono)">${escapeHtml(modName)}</span>
          <span>·</span>
          <span>${p.nodes ? p.nodes.length : 0} nodes</span>
          <span>·</span>
          <span>Last run: ${lastRun}</span>
          ${runs > 0 ? `<span>· ${runs}× run</span>` : ''}
        </div>
      </div>
      <div style="display:flex;gap:6px;flex-shrink:0">
        ${onRun ? `<button onclick="(${onRun.toString()})('${p.id}')" style="padding:4px 10px;border:1px solid var(--border2);border-radius:5px;background:var(--accent-bg);color:var(--accent);font-size:11px;cursor:pointer;font-family:var(--sans)">▶ Run</button>` : ''}
        ${onRename ? `<button onclick="(${onRename.toString()})('${p.id}')" style="padding:4px 8px;border:1px solid var(--border2);border-radius:5px;background:transparent;color:var(--muted);font-size:11px;cursor:pointer">✎</button>` : ''}
        ${onExport ? `<button onclick="(${onExport.toString()})('${p.id}')" style="padding:4px 8px;border:1px solid var(--border2);border-radius:5px;background:transparent;color:var(--muted);font-size:11px;cursor:pointer">↓</button>` : ''}
        ${onDelete ? `<button onclick="(${onDelete.toString()})('${p.id}')" style="padding:4px 8px;border:1px solid var(--border2);border-radius:5px;background:transparent;color:var(--danger);font-size:11px;cursor:pointer">✕</button>` : ''}
      </div>
    </div>`;
  }).join('');
}

function escapeHtml(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ── Export ───────────────────────────────────────────────────────
if (typeof window !== 'undefined') {
  window.MeridianPipelines = {
    PIPELINES_KEY,
    PIPELINE_FILE_EXT,
    getAllPipelines,
    getPipeline,
    savePipeline,
    deletePipeline,
    renamePipeline,
    createPipeline,
    recordPipelineRun,
    exportPipeline,
    exportAllPipelines,
    importPipeline,
    createNode,
    createEdge,
    topoSort,
    validatePipeline,
    renderPipelineLibrary,
  };
}
