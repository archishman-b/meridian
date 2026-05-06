// ════════════════════════════════════════════════════════════════
// Meridian Platform — Module Canvas Engine
// shared/canvas-module.js
//
// Lightweight Alteryx-style canvas for analytical modules.
// Separate from Bridge's full canvas — scoped to module workflows.
// Shared by Meridian Price and Meridian Pulse (and future modules).
// ════════════════════════════════════════════════════════════════

class ModuleCanvas {
  constructor(opts) {
    this.containerId  = opts.containerId;
    this.panelId      = opts.panelId;       // the normal panel view container
    this.toggleBtnId  = opts.toggleBtnId;
    this.nodeConfig   = opts.nodes;         // module-specific node definitions
    this.onNodeRun    = opts.onNodeRun;     // callback when Run is clicked
    this.onNodeSelect = opts.onNodeSelect;  // callback when node is selected
    this.mode         = 'panel';            // 'panel' | 'canvas'

    // Canvas state
    this.nodes   = [];
    this.edges   = [];
    this.panX    = 60;
    this.panY    = 60;
    this.zoom    = 1;
    this.dragging = null;
    this.charts   = {};
    this._mounted = false;
    this._nodeStatus = {}; // nodeId → 'idle'|'running'|'done'|'error'
  }

  // ── Mount canvas DOM ─────────────────────────────────────────
  mount() {
    const container = document.getElementById(this.containerId);
    if (!container || this._mounted) return;
    this._mounted = true;

    container.style.cssText = `
      position:relative;overflow:hidden;background:var(--bg);
      display:none;flex:1;min-height:0;
      background-image:radial-gradient(circle, var(--border2) 1px, transparent 1px);
      background-size:24px 24px;
    `;

    // SVG edge layer
    const svg = document.createElementNS('http://www.w3.org/2000/svg','svg');
    svg.id = this.containerId + '_svg';
    svg.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;overflow:visible;z-index:1';
    container.appendChild(svg);

    // Node layer
    const nodeLayer = document.createElement('div');
    nodeLayer.id = this.containerId + '_nodes';
    nodeLayer.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;z-index:2';
    container.appendChild(nodeLayer);

    // Toolbar overlay
    const toolbar = document.createElement('div');
    toolbar.style.cssText = `
      position:absolute;top:12px;right:12px;z-index:10;
      display:flex;gap:8px;align-items:center;
    `;
    toolbar.innerHTML = `
      <button onclick="window._mc_${this.containerId}.zoomFit()" style="
        padding:5px 10px;background:var(--surface);border:1px solid var(--border2);
        border-radius:6px;color:var(--muted);font-size:11px;cursor:pointer;font-family:var(--sans)
      ">Fit</button>
      <button onclick="window._mc_${this.containerId}.resetLayout()" style="
        padding:5px 10px;background:var(--surface);border:1px solid var(--border2);
        border-radius:6px;color:var(--muted);font-size:11px;cursor:pointer;font-family:var(--sans)
      ">Auto-layout</button>
      <span style="font-size:10px;font-family:var(--mono);color:var(--dim);padding:5px 8px;
        background:var(--surface);border:1px solid var(--border);border-radius:6px"
        id="${this.containerId}_zoom">100%</span>
    `;
    container.appendChild(toolbar);

    // Pan
    container.addEventListener('mousedown', e => {
      if (e.target !== container && e.target !== svg && e.target !== nodeLayer) return;
      const sx = e.clientX - this.panX, sy = e.clientY - this.panY;
      const move = ev => { this.panX = ev.clientX - sx; this.panY = ev.clientY - sy; this._render(); };
      const up   = () => { document.removeEventListener('mousemove',move); document.removeEventListener('mouseup',up); };
      document.addEventListener('mousemove',move);
      document.addEventListener('mouseup',up);
    });

    // Zoom
    container.addEventListener('wheel', e => {
      e.preventDefault();
      this.zoom = Math.max(0.4, Math.min(2, this.zoom * (e.deltaY > 0 ? 0.9 : 1.1)));
      document.getElementById(this.containerId+'_zoom').textContent = Math.round(this.zoom*100)+'%';
      this._render();
    }, {passive:false});

    // Store reference globally so toolbar buttons can reach it
    window[`_mc_${this.containerId}`] = this;

    this.buildDefaultWorkflow();
    this._render();
  }

  // ── Build default node layout from config ────────────────────
  buildDefaultWorkflow() {
    this.nodes = [];
    this.edges = [];
    let x = 80;
    const y = 180;
    const spacing = 220;
    let prevId = null;

    this.nodeConfig.forEach((def, i) => {
      const node = {
        id:     'mc_' + def.id,
        defId:  def.id,
        label:  def.label,
        sub:    def.sub,
        icon:   def.icon,
        color:  def.color || 'var(--accent)',
        type:   def.type, // 'source'|'process'|'model'|'export'
        status: 'idle',
        x, y,
        w: 170, h: 72,
        runnable: def.runnable || false,
        canRun:   def.canRun !== false,
      };
      this.nodes.push(node);
      this._nodeStatus[node.id] = 'idle';
      if (prevId) this.edges.push({from: prevId, to: node.id});
      prevId = node.id;
      x += spacing;
    });
  }

  // ── Toggle between panel and canvas ─────────────────────────
  toggle() {
    this.mode = this.mode === 'panel' ? 'canvas' : 'panel';
    const container  = document.getElementById(this.containerId);
    const panel      = document.getElementById(this.panelId);
    const btn        = document.getElementById(this.toggleBtnId);

    if (this.mode === 'canvas') {
      if (container) container.style.display = 'block';
      if (panel)     panel.style.display     = 'none';
      if (btn)       btn.textContent          = '▦ Panel view';
      this._render();
    } else {
      if (container) container.style.display = 'none';
      if (panel)     panel.style.display     = 'block';
      if (btn)       btn.textContent          = '◇ Canvas view';
    }
  }

  // ── Set node status (from outside) ──────────────────────────
  setStatus(defId, status) {
    const node = this.nodes.find(n => n.defId === defId);
    if (node) { node.status = status; this._render(); }
  }

  // ── Auto-layout ──────────────────────────────────────────────
  resetLayout() {
    let x = 80;
    const y = 180;
    this.nodes.forEach(n => { n.x = x; n.y = y; x += 220; });
    this.panX = 60; this.panY = 60; this.zoom = 1;
    this._render();
  }

  zoomFit() {
    if (!this.nodes.length) return;
    const container = document.getElementById(this.containerId);
    const w = container?.clientWidth  || 900;
    const h = container?.clientHeight || 400;
    const minX = Math.min(...this.nodes.map(n=>n.x));
    const maxX = Math.max(...this.nodes.map(n=>n.x+n.w));
    const minY = Math.min(...this.nodes.map(n=>n.y));
    const maxY = Math.max(...this.nodes.map(n=>n.y+n.h));
    const cw = maxX - minX + 100, ch = maxY - minY + 100;
    this.zoom = Math.min(1.2, w/cw, h/ch);
    this.panX = (w - cw*this.zoom)/2 - minX*this.zoom + 50;
    this.panY = (h - ch*this.zoom)/2 - minY*this.zoom + 50;
    document.getElementById(this.containerId+'_zoom').textContent = Math.round(this.zoom*100)+'%';
    this._render();
  }

  // ── Render ───────────────────────────────────────────────────
  _render() {
    if (!this._mounted) return;
    this._renderEdges();
    this._renderNodes();
  }

  _renderNodes() {
    const layer = document.getElementById(this.containerId+'_nodes');
    if (!layer) return;
    layer.innerHTML = '';

    this.nodes.forEach(node => {
      const el = document.createElement('div');
      const tx = this.panX + node.x * this.zoom;
      const ty = this.panY + node.y * this.zoom;
      const sw = node.w * this.zoom;
      const sh = node.h * this.zoom;
      const scale = this.zoom;

      const statusColor = {
        idle:    'var(--dim)',
        running: 'var(--warn)',
        done:    'var(--success)',
        error:   'var(--danger)',
      }[node.status] || 'var(--dim)';

      el.style.cssText = `
        position:absolute;left:${tx}px;top:${ty}px;width:${sw}px;
        background:var(--surface2);
        border:1px solid ${node.status==='done'?node.color:node.status==='running'?'var(--warn)':'var(--border2)'};
        border-radius:${8*scale}px;cursor:default;user-select:none;
        box-shadow:${node.status==='running'?`0 0 0 2px rgba(245,165,36,0.3)`:'none'};
        transition:border-color 0.2s,box-shadow 0.2s;
      `;

      const runBtn = node.runnable && node.canRun ? `
        <button data-nodeid="${node.id}" class="mc-run-btn" onclick="window._mc_${this.containerId}._onRun('${node.defId}')"
          style="
            margin-top:${4*scale}px;padding:${3*scale}px ${8*scale}px;
            background:${node.color};color:#0d1117;
            border:none;border-radius:${4*scale}px;
            font-size:${9*scale}px;font-weight:600;cursor:pointer;
            font-family:var(--sans);width:100%;letter-spacing:0.04em;
            opacity:${node.canRun?1:0.4};
          ">
          ${node.status==='running'?'Running…':node.status==='done'?'✓ Re-run':'▶ Run analysis'}
        </button>` : '';

      el.innerHTML = `
        <div style="padding:${8*scale}px ${10*scale}px;display:flex;align-items:center;gap:${6*scale}px">
          <span style="font-size:${12*scale}px;color:${node.color};flex-shrink:0">${node.icon}</span>
          <div style="flex:1;min-width:0">
            <div style="font-size:${11*scale}px;font-weight:600;color:${node.color};
              white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${node.label}</div>
            <div style="font-size:${9*scale}px;color:var(--muted);margin-top:1px;
              white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${node.sub}</div>
          </div>
          <div style="width:${5*scale}px;height:${5*scale}px;border-radius:50%;
            background:${statusColor};flex-shrink:0"></div>
        </div>
        ${runBtn ? `<div style="padding:0 ${8*scale}px ${8*scale}px">${runBtn}</div>` : ''}
      `;

      // Drag
      el.addEventListener('mousedown', e => {
        if (e.target.classList.contains('mc-run-btn')) return;
        e.stopPropagation();
        const startX=e.clientX, startY=e.clientY, ox=node.x, oy=node.y;
        const move = ev => {
          node.x = ox + (ev.clientX-startX)/this.zoom;
          node.y = oy + (ev.clientY-startY)/this.zoom;
          this._render();
        };
        const up = () => { document.removeEventListener('mousemove',move); document.removeEventListener('mouseup',up); };
        document.addEventListener('mousemove',move);
        document.addEventListener('mouseup',up);
      });

      // Click to open config
      el.addEventListener('click', e => {
        if (e.target.classList.contains('mc-run-btn')) return;
        if (this.onNodeSelect) this.onNodeSelect(node.defId);
      });

      layer.appendChild(el);
    });
  }

  _renderEdges() {
    const svg = document.getElementById(this.containerId+'_svg');
    if (!svg) return;
    svg.innerHTML = `<defs><marker id="mc_arr" viewBox="0 0 10 10" refX="8" refY="5"
      markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M2 1L8 5L2 9" fill="none" stroke="#5d6679" stroke-width="1.5"
        stroke-linecap="round" stroke-linejoin="round"/>
    </marker></defs>`;

    this.edges.forEach(edge => {
      const from = this.nodes.find(n=>n.id===edge.from);
      const to   = this.nodes.find(n=>n.id===edge.to);
      if (!from||!to) return;

      const fx = this.panX + (from.x + from.w) * this.zoom;
      const fy = this.panX + (from.y + from.h/2) * this.zoom + (this.panY - this.panX);
      const tx = this.panX + to.x * this.zoom;
      const ty = this.panY + (to.y + to.h/2) * this.zoom;
      const cx1 = fx + Math.min(60, Math.abs(tx-fx)*0.4);
      const cx2 = tx - Math.min(60, Math.abs(tx-fx)*0.4);

      // Fix fy calculation
      const fy2 = this.panY + (from.y + from.h/2) * this.zoom;

      const active = from.status==='done'||from.status==='running';
      const path = document.createElementNS('http://www.w3.org/2000/svg','path');
      path.setAttribute('d',`M ${fx} ${fy2} C ${cx1} ${fy2}, ${cx2} ${ty}, ${tx} ${ty}`);
      path.setAttribute('fill','none');
      path.setAttribute('stroke', active ? from.color : '#2a3142');
      path.setAttribute('stroke-width', (1.5 * this.zoom).toString());
      path.setAttribute('stroke-opacity', active ? '0.7' : '0.4');
      path.setAttribute('marker-end','url(#mc_arr)');
      if (!active) path.setAttribute('stroke-dasharray','4 3');
      svg.appendChild(path);
    });
  }

  _onRun(defId) {
    const node = this.nodes.find(n=>n.defId===defId);
    if (!node) return;
    node.status = 'running';
    this._render();
    if (this.onNodeRun) this.onNodeRun(defId, (success) => {
      node.status = success ? 'done' : 'error';
      this._render();
    });
  }
}

// ── Export ───────────────────────────────────────────────────────
if (typeof window !== 'undefined') {
  window.ModuleCanvas = ModuleCanvas;
}
