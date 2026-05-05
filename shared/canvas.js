// ════════════════════════════════════════════════════════════════
// Meridian Platform — Canvas Engine
// shared/canvas.js
//
// Alteryx-style drag-drop node graph for the full platform.
// Canvas and panel UI share the same config components.
// Node types: source | transform | schemaMap | analysis | visualise | export
// ════════════════════════════════════════════════════════════════

// ── Node registry ────────────────────────────────────────────────

const NODE_REGISTRY = {

  // ── Source nodes ─────────────────────────────────────────────
  source_upload: {
    type:     'source',
    label:    'File Upload',
    sub:      'CSV or XLSX',
    icon:     '⊞',
    color:    '#22d3b8',
    outputs:  ['data'],
    inputs:   [],
    config:   { mode: 'upload', acceptedTypes: ['.csv','.xlsx'] },
  },
  source_demo: {
    type:     'source',
    label:    'Demo Dataset',
    sub:      'Renova Home',
    icon:     '◈',
    color:    '#22d3b8',
    outputs:  ['data'],
    inputs:   [],
    config:   { dataset: 'renova_pricing' },
  },
  source_handoff: {
    type:     'source',
    label:    'Bridge Handoff',
    sub:      'sessionStorage',
    icon:     '→',
    color:    '#22d3b8',
    outputs:  ['data'],
    inputs:   [],
    config:   {},
  },

  // ── Transform nodes ──────────────────────────────────────────
  transform_filter: {
    type:     'transform',
    label:    'Filter',
    sub:      'Keep matching rows',
    icon:     '⊻',
    color:    '#9ba6ba',
    inputs:   ['data'],
    outputs:  ['data'],
    config:   { rules: [], logic: 'AND' },
  },
  transform_aggregate: {
    type:     'transform',
    label:    'Aggregate',
    sub:      'Group and summarise',
    icon:     '∑',
    color:    '#9ba6ba',
    inputs:   ['data'],
    outputs:  ['data'],
    config:   { groupBy: [], aggregations: [] },
  },
  transform_calculate: {
    type:     'transform',
    label:    'Calculate',
    sub:      'Add computed column',
    icon:     'ƒ',
    color:    '#9ba6ba',
    inputs:   ['data'],
    outputs:  ['data'],
    config:   { colName: '', expr: '' },
  },
  transform_sort: {
    type:     'transform',
    label:    'Sort',
    sub:      'Order rows',
    icon:     '⇅',
    color:    '#9ba6ba',
    inputs:   ['data'],
    outputs:  ['data'],
    config:   { col: '', dir: 'asc' },
  },
  transform_select: {
    type:     'transform',
    label:    'Select Columns',
    sub:      'Keep or drop columns',
    icon:     '⊡',
    color:    '#9ba6ba',
    inputs:   ['data'],
    outputs:  ['data'],
    config:   { mode: 'keep', columns: [] },
  },
  transform_rename: {
    type:     'transform',
    label:    'Rename',
    sub:      'Rename columns',
    icon:     '✎',
    color:    '#9ba6ba',
    inputs:   ['data'],
    outputs:  ['data'],
    config:   { renames: {} },
  },
  transform_join: {
    type:     'transform',
    label:    'Join',
    sub:      'Merge two datasets',
    icon:     '⋈',
    color:    '#9ba6ba',
    inputs:   ['data_left', 'data_right'],
    outputs:  ['data'],
    config:   { type: 'inner', leftKey: '', rightKey: '' },
  },
  transform_pivot: {
    type:     'transform',
    label:    'Pivot',
    sub:      'Wide to long or pivot table',
    icon:     '⊕',
    color:    '#9ba6ba',
    inputs:   ['data'],
    outputs:  ['data'],
    config:   { rowKey: '', colKey: '', valueKey: '', agg: 'SUM' },
  },

  // ── Schema map nodes ─────────────────────────────────────────
  schemaMap_price: {
    type:     'schemaMap',
    label:    'Map → Price',
    sub:      'Meridian Price dimensions',
    icon:     '◈',
    color:    '#22d3b8',
    inputs:   ['data'],
    outputs:  ['mapped_data'],
    config:   { module: 'price', map: {} },
  },
  schemaMap_pulse: {
    type:     'schemaMap',
    label:    'Map → Pulse',
    sub:      'Meridian Pulse dimensions',
    icon:     '◈',
    color:    '#a78bfa',
    inputs:   ['data'],
    outputs:  ['mapped_data'],
    config:   { module: 'pulse', map: {} },
  },
  schemaMap_ledger: {
    type:     'schemaMap',
    label:    'Map → Ledger',
    sub:      'Meridian Ledger dimensions',
    icon:     '◈',
    color:    '#f5a524',
    inputs:   ['data'],
    outputs:  ['mapped_data'],
    config:   { module: 'ledger', map: {} },
  },
  schemaMap_org: {
    type:     'schemaMap',
    label:    'Map → Org',
    sub:      'Meridian Org dimensions',
    icon:     '◈',
    color:    '#fb7185',
    inputs:   ['data'],
    outputs:  ['mapped_data'],
    config:   { module: 'org', map: {} },
  },
  schemaMap_field: {
    type:     'schemaMap',
    label:    'Map → Field',
    sub:      'Meridian Field dimensions',
    icon:     '◈',
    color:    '#60a5fa',
    inputs:   ['data'],
    outputs:  ['mapped_data'],
    config:   { module: 'field', map: {} },
  },
  schemaMap_flow: {
    type:     'schemaMap',
    label:    'Map → Flow',
    sub:      'Meridian Flow dimensions',
    icon:     '◈',
    color:    '#4ade80',
    inputs:   ['data'],
    outputs:  ['mapped_data'],
    config:   { module: 'flow', map: {} },
  },

  // ── Analysis nodes ───────────────────────────────────────────
  analysis_price_waterfall: {
    type:     'analysis',
    label:    'Price Waterfall',
    sub:      'Pocket price leakage',
    icon:     '⬇',
    color:    '#22d3b8',
    inputs:   ['mapped_data'],
    outputs:  ['analysis_result'],
    config:   { module: 'price', analysis: 'pocket_price_waterfall' },
  },
  analysis_price_elasticity: {
    type:     'analysis',
    label:    'Price Elasticity',
    sub:      'Price-volume relationship',
    icon:     '↗',
    color:    '#22d3b8',
    inputs:   ['mapped_data'],
    outputs:  ['analysis_result'],
    config:   { module: 'price', analysis: 'elasticity' },
  },
  analysis_pulse_rfm: {
    type:     'analysis',
    label:    'RFM Segmentation',
    sub:      'Recency, frequency, monetary',
    icon:     '⬟',
    color:    '#a78bfa',
    inputs:   ['mapped_data'],
    outputs:  ['analysis_result'],
    config:   { module: 'pulse', analysis: 'rfm' },
  },
  analysis_pulse_cltv: {
    type:     'analysis',
    label:    'CLTV Model',
    sub:      'BG/NBD lifetime value',
    icon:     '⬟',
    color:    '#a78bfa',
    inputs:   ['mapped_data'],
    outputs:  ['analysis_result'],
    config:   { module: 'pulse', analysis: 'cltv', requiresPyodide: true },
  },
  analysis_pulse_churn: {
    type:     'analysis',
    label:    'Churn Prediction',
    sub:      'Flight-risk scoring',
    icon:     '⬟',
    color:    '#a78bfa',
    inputs:   ['mapped_data'],
    outputs:  ['analysis_result'],
    config:   { module: 'pulse', analysis: 'churn', requiresPyodide: true },
  },
  analysis_ledger_bridge: {
    type:     'analysis',
    label:    'Revenue Bridge',
    sub:      'Volume · price · mix',
    icon:     '▦',
    color:    '#f5a524',
    inputs:   ['mapped_data'],
    outputs:  ['analysis_result'],
    config:   { module: 'ledger', analysis: 'revenue_bridge' },
  },
  analysis_ledger_margin: {
    type:     'analysis',
    label:    'Margin Bridge',
    sub:      'Gross margin decomposition',
    icon:     '▦',
    color:    '#f5a524',
    inputs:   ['mapped_data'],
    outputs:  ['analysis_result'],
    config:   { module: 'ledger', analysis: 'margin_bridge' },
  },

  // ── Visualise nodes ──────────────────────────────────────────
  visualise_chart: {
    type:     'visualise',
    label:    'Chart',
    sub:      'Bar, line, scatter',
    icon:     '◎',
    color:    '#60a5fa',
    inputs:   ['analysis_result'],
    outputs:  ['rendered'],
    config:   { chartType: 'bar' },
  },
  visualise_table: {
    type:     'visualise',
    label:    'Data Table',
    sub:      'Formatted output table',
    icon:     '▤',
    color:    '#60a5fa',
    inputs:   ['analysis_result'],
    outputs:  ['rendered'],
    config:   {},
  },
  visualise_summary: {
    type:     'visualise',
    label:    'Summary Cards',
    sub:      'KPI metric cards',
    icon:     '▣',
    color:    '#60a5fa',
    inputs:   ['analysis_result'],
    outputs:  ['rendered'],
    config:   {},
  },

  // ── Export nodes ─────────────────────────────────────────────
  export_pdf: {
    type:     'export',
    label:    'PDF Report',
    sub:      'Board-ready PDF',
    icon:     '↗',
    color:    '#4ade80',
    inputs:   ['rendered'],
    outputs:  [],
    config:   { filename: 'meridian_report_{date}', includeMetadata: true },
  },
  export_xlsx: {
    type:     'export',
    label:    'Excel Export',
    sub:      '.xlsx download',
    icon:     '↗',
    color:    '#4ade80',
    inputs:   ['analysis_result'],
    outputs:  [],
    config:   { filename: 'meridian_data_{date}' },
  },
  export_png: {
    type:     'export',
    label:    'PNG Chart',
    sub:      'High-res chart image',
    icon:     '↗',
    color:    '#4ade80',
    inputs:   ['rendered'],
    outputs:  [],
    config:   { filename: 'meridian_chart_{date}', scale: 2 },
  },
};

// ── Node categories for palette sidebar ──────────────────────────

const NODE_CATEGORIES = [
  {
    id:    'source',
    label: 'Data Source',
    color: '#22d3b8',
    keys:  ['source_upload','source_demo','source_handoff'],
  },
  {
    id:    'transform',
    label: 'Transform',
    color: '#9ba6ba',
    keys:  ['transform_filter','transform_aggregate','transform_calculate',
            'transform_sort','transform_select','transform_rename',
            'transform_join','transform_pivot'],
  },
  {
    id:    'schemaMap',
    label: 'Schema Map',
    color: '#22d3b8',
    keys:  ['schemaMap_price','schemaMap_pulse','schemaMap_ledger',
            'schemaMap_org','schemaMap_field','schemaMap_flow'],
  },
  {
    id:    'analysis',
    label: 'Analysis',
    color: '#a78bfa',
    keys:  ['analysis_price_waterfall','analysis_price_elasticity',
            'analysis_pulse_rfm','analysis_pulse_cltv','analysis_pulse_churn',
            'analysis_ledger_bridge','analysis_ledger_margin'],
  },
  {
    id:    'visualise',
    label: 'Visualise',
    color: '#60a5fa',
    keys:  ['visualise_chart','visualise_table','visualise_summary'],
  },
  {
    id:    'export',
    label: 'Export',
    color: '#4ade80',
    keys:  ['export_pdf','export_xlsx','export_png'],
  },
];

// ── Canvas state ─────────────────────────────────────────────────

class MeridianCanvas {
  constructor(containerId, opts = {}) {
    this.containerId  = containerId;
    this.nodes        = [];
    this.edges        = [];
    this.selectedNode = null;
    this.zoom         = 1;
    this.panX         = 0;
    this.panY         = 0;
    this.dragging     = null;
    this.connecting   = null; // { fromNodeId, fromPort }
    this.onNodeSelect = opts.onNodeSelect || null;
    this.onRun        = opts.onRun        || null;
    this.onChange     = opts.onChange     || null;
    this._rendered    = false;
  }

  // ── Initialise canvas DOM ──────────────────────────────────────
  mount() {
    const container = document.getElementById(this.containerId);
    if (!container) return;
    container.style.position   = 'relative';
    container.style.overflow   = 'hidden';
    container.style.background = 'var(--bg)';
    container.style.cursor     = 'default';

    // Dot grid
    container.style.backgroundImage  = 'radial-gradient(circle, var(--border2) 1px, transparent 1px)';
    container.style.backgroundSize   = '24px 24px';

    // SVG layer for edges
    const svg = document.createElementNS('http://www.w3.org/2000/svg','svg');
    svg.id = this.containerId + '_edges';
    svg.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;overflow:visible;z-index:1';
    container.appendChild(svg);

    // Node layer
    const nodeLayer = document.createElement('div');
    nodeLayer.id = this.containerId + '_nodes';
    nodeLayer.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;z-index:2';
    container.appendChild(nodeLayer);

    // Pan on background drag
    container.addEventListener('mousedown', e => {
      if (e.target === container || e.target === svg || e.target === nodeLayer) {
        const sx = e.clientX - this.panX;
        const sy = e.clientY - this.panY;
        const move = ev => { this.panX = ev.clientX - sx; this.panY = ev.clientY - sy; this._render(); };
        const up   = () => { document.removeEventListener('mousemove', move); document.removeEventListener('mouseup', up); };
        document.addEventListener('mousemove', move);
        document.addEventListener('mouseup', up);
      }
    });

    // Zoom
    container.addEventListener('wheel', e => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      this.zoom = Math.max(0.3, Math.min(2, this.zoom * delta));
      this._render();
    }, { passive: false });

    this._rendered = true;
    this._render();
  }

  // ── Add node ──────────────────────────────────────────────────
  addNode(registryKey, x, y) {
    const def = NODE_REGISTRY[registryKey];
    if (!def) return null;
    const node = {
      id:          'n_' + Date.now() + '_' + Math.random().toString(36).slice(2,5),
      registryKey,
      type:        def.type,
      label:       def.label,
      sub:         def.sub,
      icon:        def.icon,
      color:       def.color,
      inputs:      [...def.inputs],
      outputs:     [...def.outputs],
      config:      JSON.parse(JSON.stringify(def.config)),
      x:           x || 100,
      y:           y || 100,
      status:      'idle', // idle | running | done | error
    };
    this.nodes.push(node);
    this._render();
    this._onChange();
    return node;
  }

  // ── Remove node ───────────────────────────────────────────────
  removeNode(id) {
    this.nodes  = this.nodes.filter(n => n.id !== id);
    this.edges  = this.edges.filter(e => e.from !== id && e.to !== id);
    if (this.selectedNode === id) this.selectedNode = null;
    this._render();
    this._onChange();
  }

  // ── Add edge ──────────────────────────────────────────────────
  addEdge(fromId, toId) {
    // No duplicate edges
    if (this.edges.find(e => e.from === fromId && e.to === toId)) return false;
    // No self-loops
    if (fromId === toId) return false;
    this.edges.push({ from: fromId, to: toId });
    this._render();
    this._onChange();
    return true;
  }

  removeEdge(fromId, toId) {
    this.edges = this.edges.filter(e => !(e.from === fromId && e.to === toId));
    this._render();
    this._onChange();
  }

  // ── Load from pipeline ────────────────────────────────────────
  loadPipeline(pipeline) {
    this.nodes = pipeline.nodes ? JSON.parse(JSON.stringify(pipeline.nodes)) : [];
    this.edges = pipeline.edges ? JSON.parse(JSON.stringify(pipeline.edges)) : [];
    this.selectedNode = null;
    this._render();
  }

  // ── Serialise to pipeline format ──────────────────────────────
  toPipelineNodes() {
    return this.nodes.map(n => ({ id: n.id, type: n.registryKey || n.type, config: n.config, x: n.x, y: n.y }));
  }

  toPipelineEdges() {
    return this.edges.map(e => ({ from: e.from, to: e.to }));
  }

  // ── Clear canvas ──────────────────────────────────────────────
  clear() {
    this.nodes = []; this.edges = []; this.selectedNode = null;
    this._render(); this._onChange();
  }

  // ── Internal render ───────────────────────────────────────────
  _render() {
    if (!this._rendered) return;
    this._renderEdges();
    this._renderNodes();
  }

  _renderNodes() {
    const layer = document.getElementById(this.containerId + '_nodes');
    if (!layer) return;
    layer.innerHTML = '';
    this.nodes.forEach(node => {
      const el = document.createElement('div');
      el.dataset.nodeId = node.id;
      const selected = this.selectedNode === node.id;
      const tx = this.panX + node.x * this.zoom;
      const ty = this.panY + node.y * this.zoom;
      const scale = this.zoom;
      el.style.cssText = `
        position:absolute;
        left:${tx}px; top:${ty}px;
        width:${160 * scale}px;
        background:var(--surface2);
        border:1px solid ${selected ? node.color : 'var(--border2)'};
        border-radius:${8 * scale}px;
        box-shadow:${selected ? '0 0 0 2px ' + node.color + '33' : 'none'};
        cursor:grab;
        user-select:none;
        transform-origin:top left;
        transition:border-color 0.12s;
        z-index:${selected ? 10 : 2};
      `;

      const statusColor = { idle:'var(--dim)', running:'var(--amber)', done:'var(--success)', error:'var(--danger)' }[node.status] || 'var(--dim)';

      el.innerHTML = `
        <div style="padding:${8*scale}px ${10*scale}px;display:flex;align-items:center;gap:${6*scale}px;border-bottom:1px solid var(--border)">
          <span style="font-size:${12*scale}px;flex-shrink:0">${node.icon}</span>
          <div style="flex:1;min-width:0">
            <div style="font-size:${11*scale}px;font-weight:600;color:${node.color};white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${node.label}</div>
            <div style="font-size:${9*scale}px;color:var(--muted);margin-top:1px">${node.sub}</div>
          </div>
          <div style="width:${6*scale}px;height:${6*scale}px;border-radius:50%;background:${statusColor};flex-shrink:0"></div>
        </div>
        <div style="padding:${5*scale}px ${10*scale}px;font-size:${9*scale}px;color:var(--dim);font-family:var(--mono,monospace)">${node.type}</div>
        <button class="cn-remove" data-id="${node.id}" style="
          position:absolute;top:${3*scale}px;right:${3*scale}px;
          width:${14*scale}px;height:${14*scale}px;
          border-radius:50%;border:none;background:var(--border2);
          color:var(--muted);font-size:${8*scale}px;cursor:pointer;
          display:flex;align-items:center;justify-content:center;
          opacity:0;transition:opacity 0.1s;
        ">✕</button>
      `;

      // Show/hide remove button on hover
      el.addEventListener('mouseenter', () => { el.querySelector('.cn-remove').style.opacity = '1'; });
      el.addEventListener('mouseleave', () => { el.querySelector('.cn-remove').style.opacity = '0'; });

      // Remove button
      el.querySelector('.cn-remove').addEventListener('click', e => {
        e.stopPropagation();
        this.removeNode(node.id);
      });

      // Select on click
      el.addEventListener('click', e => {
        if (e.target.classList.contains('cn-remove')) return;
        this.selectedNode = node.id;
        this._render();
        if (this.onNodeSelect) this.onNodeSelect(node);
      });

      // Drag
      el.addEventListener('mousedown', e => {
        if (e.target.classList.contains('cn-remove')) return;
        e.stopPropagation();
        const startX = e.clientX;
        const startY = e.clientY;
        const origX  = node.x;
        const origY  = node.y;
        const move = ev => {
          node.x = origX + (ev.clientX - startX) / this.zoom;
          node.y = origY + (ev.clientY - startY) / this.zoom;
          this._render();
        };
        const up = () => {
          document.removeEventListener('mousemove', move);
          document.removeEventListener('mouseup', up);
          this._onChange();
        };
        document.addEventListener('mousemove', move);
        document.addEventListener('mouseup', up);
      });

      layer.appendChild(el);
    });
  }

  _renderEdges() {
    const svg = document.getElementById(this.containerId + '_edges');
    if (!svg) return;
    svg.innerHTML = '';

    this.edges.forEach(edge => {
      const from = this.nodes.find(n => n.id === edge.from);
      const to   = this.nodes.find(n => n.id === edge.to);
      if (!from || !to) return;

      const fx = this.panX + (from.x + 160) * this.zoom;
      const fy = this.panY + (from.y + 28)  * this.zoom;
      const tx = this.panX + to.x * this.zoom;
      const ty = this.panY + (to.y + 28)    * this.zoom;

      const cx1 = fx + Math.min(80, Math.abs(tx - fx) * 0.5) * this.zoom;
      const cx2 = tx - Math.min(80, Math.abs(tx - fx) * 0.5) * this.zoom;

      const path = document.createElementNS('http://www.w3.org/2000/svg','path');
      path.setAttribute('d', `M ${fx} ${fy} C ${cx1} ${fy}, ${cx2} ${ty}, ${tx} ${ty}`);
      path.setAttribute('fill', 'none');
      path.setAttribute('stroke', from.color || '#22d3b8');
      path.setAttribute('stroke-width', 1.5 * this.zoom);
      path.setAttribute('stroke-opacity', '0.6');
      path.setAttribute('marker-end', 'url(#meridian-arrow)');
      svg.appendChild(path);
    });

    // Arrow marker
    const defs = document.createElementNS('http://www.w3.org/2000/svg','defs');
    defs.innerHTML = `<marker id="meridian-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M2 1L8 5L2 9" fill="none" stroke="#22d3b8" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></marker>`;
    svg.insertBefore(defs, svg.firstChild);
  }

  _onChange() {
    if (this.onChange) this.onChange({ nodes: this.toPipelineNodes(), edges: this.toPipelineEdges() });
  }

  // ── Set node status (for run feedback) ────────────────────────
  setNodeStatus(id, status) {
    const node = this.nodes.find(n => n.id === id);
    if (node) { node.status = status; this._render(); }
  }

  resetAllStatus() {
    this.nodes.forEach(n => n.status = 'idle');
    this._render();
  }
}

// ── Render node palette into sidebar element ──────────────────────

function renderNodePalette(containerId, canvasInstance) {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = NODE_CATEGORIES.map(cat => `
    <div class="palette-section">
      <div style="font-size:9px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;
        color:${cat.color};padding:8px 12px 4px">${cat.label}</div>
      ${cat.keys.map(key => {
        const def = NODE_REGISTRY[key];
        if (!def) return '';
        return `<div class="palette-node" draggable="true" data-key="${key}" style="
          display:flex;align-items:center;gap:8px;padding:7px 12px;
          cursor:grab;border-radius:6px;margin:1px 4px;
          transition:background 0.1s;
        " onmouseenter="this.style.background='var(--surface2)'" onmouseleave="this.style.background=''"
           ondragstart="event.dataTransfer.setData('nodeKey','${key}')">
          <span style="font-size:12px;color:${def.color};flex-shrink:0">${def.icon}</span>
          <div>
            <div style="font-size:11px;font-weight:500;color:var(--text)">${def.label}</div>
            <div style="font-size:9px;color:var(--muted)">${def.sub}</div>
          </div>
        </div>`;
      }).join('')}
    </div>
  `).join('');

  // Drop handling on canvas
  if (canvasInstance) {
    const canvasEl = document.getElementById(canvasInstance.containerId);
    if (canvasEl) {
      canvasEl.addEventListener('dragover', e => e.preventDefault());
      canvasEl.addEventListener('drop', e => {
        e.preventDefault();
        const key = e.dataTransfer.getData('nodeKey');
        if (!key) return;
        const rect = canvasEl.getBoundingClientRect();
        const x = (e.clientX - rect.left - canvasInstance.panX) / canvasInstance.zoom;
        const y = (e.clientY - rect.top  - canvasInstance.panY) / canvasInstance.zoom;
        canvasInstance.addNode(key, x, y);
      });
    }
  }
}

// ── Export ───────────────────────────────────────────────────────
if (typeof window !== 'undefined') {
  window.MeridianCanvas    = MeridianCanvas;
  window.NODE_REGISTRY     = NODE_REGISTRY;
  window.NODE_CATEGORIES   = NODE_CATEGORIES;
  window.renderNodePalette = renderNodePalette;
}
