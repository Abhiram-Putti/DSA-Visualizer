/* ==========================================================================
   GRAPH VISUALIZER
   ========================================================================== */

const GraphModule = (() => {
  const { el, $$, toast, randomUnique } = Utils;

  const PSEUDOCODE = {
    bfs: ['BFS(start):', '  queue=[start]; visited={start}', '  while queue not empty:', '    u=queue.pop_front()', '    for v in adj[u]: if v not visited: mark & enqueue'],
    dfs: ['DFS(u):', '  mark u visited', '  for v in adj[u]:', '    if v not visited: DFS(v)'],
    dijkstra: ['dist[start]=0, others=∞', 'while pq not empty:', '  u = pq.pop_min()', '  for (v,w) in adj[u]:', '    if dist[u]+w < dist[v]: relax & push'],
    prim: ['pick start node; key[start]=0', 'while unvisited remain:', '  u = min-key unvisited node', '  add u to MST', '  for (v,w) in adj[u]: key[v]=min(key[v],w)'],
    kruskal: ['sort edges by weight', 'for (u,v,w) in edges:', '  if find(u) != find(v):', '    union(u,v); add edge to MST'],
    topo: ['compute in-degree of all nodes', 'queue = nodes with in-degree 0', 'while queue not empty:', '  u=pop; output u', '  for v in adj[u]: indegree[v]--; if 0: enqueue'],
    cycle: ['DFS with 3 colors: white/gray/black', 'gray = currently on recursion stack', 'if edge leads to a gray node → cycle found'],
    components: ['for each unvisited node u:', '  new component; BFS/DFS from u', '  mark all reached nodes with this component id']
  };
  const META = {
    bfs: { best: 'O(V+E)', avg: 'O(V+E)', worst: 'O(V+E)', space: 'O(V)', applications: ['Shortest path (unweighted)', 'Level-order exploration', 'Web crawling'], advantages: ['Finds shortest path in unweighted graphs', 'Explores level by level'], disadvantages: ['Higher memory use than DFS (stores full frontier)'] },
    dfs: { best: 'O(V+E)', avg: 'O(V+E)', worst: 'O(V+E)', space: 'O(V)', applications: ['Topological sort', 'Cycle detection', 'Maze solving'], advantages: ['Low memory (stack depth = path length)', 'Naturally recursive'], disadvantages: ['Does not find shortest path'] },
    dijkstra: { best: 'O((V+E) log V)', avg: 'O((V+E) log V)', worst: 'O((V+E) log V)', space: 'O(V)', applications: ['GPS routing', 'Network routing protocols'], advantages: ['Finds shortest paths with non-negative weights'], disadvantages: ['Fails with negative edge weights'] },
    prim: { best: 'O(E log V)', avg: 'O(E log V)', worst: 'O(E log V)', space: 'O(V)', applications: ['Network design (minimum cabling)', 'Cluster analysis'], advantages: ['Efficient on dense graphs'], disadvantages: ['Needs a priority queue for best performance'] },
    kruskal: { best: 'O(E log E)', avg: 'O(E log E)', worst: 'O(E log E)', space: 'O(V)', applications: ['Network design', 'Approximation algorithms (TSP)'], advantages: ['Simple with union-find', 'Efficient on sparse graphs'], disadvantages: ['Requires sorting all edges upfront'] },
    topo: { best: 'O(V+E)', avg: 'O(V+E)', worst: 'O(V+E)', space: 'O(V)', applications: ['Build/task dependency scheduling', 'Course prerequisite ordering'], advantages: ['Linear time', 'Detects cycles as a side effect'], disadvantages: ['Only valid on Directed Acyclic Graphs'] },
    cycle: { best: 'O(V+E)', avg: 'O(V+E)', worst: 'O(V+E)', space: 'O(V)', applications: ['Deadlock detection', 'Validating DAGs before topological sort'], advantages: ['Linear time detection'], disadvantages: ['Directed & undirected cases need different logic'] },
    components: { best: 'O(V+E)', avg: 'O(V+E)', worst: 'O(V+E)', space: 'O(V)', applications: ['Social network clustering', 'Image segmentation'], advantages: ['Simple linear-time scan'], disadvantages: ['Only meaningful on undirected graphs (or weakly-connected for directed)'] }
  };

  let ws, state, svg, lastFrame;

  function circularLayout(n) {
    const R = 130, cx = 200, cy = 170;
    return Array.from({ length: n }, (_, i) => ({
      x: cx + R * Math.cos((2 * Math.PI * i) / n - Math.PI / 2),
      y: cy + R * Math.sin((2 * Math.PI * i) / n - Math.PI / 2)
    }));
  }

  function generateGraph(n) {
    const pos = circularLayout(n);
    state.nodes = pos.map((p, i) => ({ id: i, label: String.fromCharCode(65 + i), x: p.x, y: p.y }));
    state.edges = [];
    // spanning ring for connectivity
    for (let i = 0; i < n; i++) state.edges.push({ from: i, to: (i + 1) % n, weight: 1 + Math.floor(Math.random() * 9) });
    // extra random edges
    const extra = Math.max(1, Math.floor(n / 2));
    for (let k = 0; k < extra; k++) {
      const a = Math.floor(Math.random() * n), b = Math.floor(Math.random() * n);
      if (a !== b && !state.edges.some(e => (e.from === a && e.to === b) || (!state.directed && e.from === b && e.to === a)))
        state.edges.push({ from: a, to: b, weight: 1 + Math.floor(Math.random() * 9) });
    }
    drawGraph();
  }

  function adjacency() {
    const adj = new Map(state.nodes.map(n => [n.id, []]));
    state.edges.forEach(e => {
      adj.get(e.from).push({ to: e.to, weight: e.weight });
      if (!state.directed) adj.get(e.to).push({ to: e.from, weight: e.weight });
    });
    return adj;
  }

  function drawGraph(frame) {
    lastFrame = frame || lastFrame;
    ws.stage.innerHTML = '';
    const svgNS = 'http://www.w3.org/2000/svg';
    svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('viewBox', '0 0 400 340');
    svg.setAttribute('width', '100%'); svg.setAttribute('height', '360');

    const marker = document.createElementNS(svgNS, 'marker');
    marker.setAttribute('id', 'arrowhead'); marker.setAttribute('markerWidth', '8'); marker.setAttribute('markerHeight', '8');
    marker.setAttribute('refX', '16'); marker.setAttribute('refY', '4'); marker.setAttribute('orient', 'auto');
    const arrowPath = document.createElementNS(svgNS, 'path');
    arrowPath.setAttribute('d', 'M0,0 L8,4 L0,8 Z'); arrowPath.setAttribute('fill', 'var(--text-faint)');
    marker.appendChild(arrowPath);
    const defs = document.createElementNS(svgNS, 'defs'); defs.appendChild(marker);
    svg.appendChild(defs);

    const f = lastFrame || {};
    const mstSet = f.mstEdges || new Set();
    const visitedEdgeSet = f.usedEdges || new Set();
    const activeEdgeKey = f.activeEdge;

    state.edges.forEach((e, i) => {
      const a = state.nodes[e.from], b = state.nodes[e.to];
      const key = `${e.from}-${e.to}`;
      const line = document.createElementNS(svgNS, 'line');
      line.setAttribute('x1', a.x); line.setAttribute('y1', a.y); line.setAttribute('x2', b.x); line.setAttribute('y2', b.y);
      let color = 'var(--border-strong)', width = '1.6';
      if (mstSet.has(key) || mstSet.has(`${e.to}-${e.from}`)) { color = 'var(--accent-2)'; width = '3'; }
      else if (visitedEdgeSet.has(key) || visitedEdgeSet.has(`${e.to}-${e.from}`)) { color = 'var(--accent-2)'; width = '2.4'; }
      if (activeEdgeKey === key || activeEdgeKey === `${e.to}-${e.from}`) { color = 'var(--accent)'; width = '3'; }
      line.setAttribute('stroke', color); line.setAttribute('stroke-width', width);
      if (state.directed) line.setAttribute('marker-end', 'url(#arrowhead)');
      svg.appendChild(line);

      const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
      if (state.weighted) {
        const wt = document.createElementNS(svgNS, 'text');
        wt.setAttribute('x', mx); wt.setAttribute('y', my - 4); wt.setAttribute('fill', 'var(--accent-3)');
        wt.setAttribute('font-size', '10'); wt.setAttribute('font-family', 'monospace'); wt.setAttribute('text-anchor', 'middle');
        wt.textContent = e.weight;
        svg.appendChild(wt);
      }
    });

    state.nodes.forEach(n => {
      const g = document.createElementNS(svgNS, 'g');
      g.style.cursor = 'grab';
      const circle = document.createElementNS(svgNS, 'circle');
      circle.setAttribute('cx', n.x); circle.setAttribute('cy', n.y); circle.setAttribute('r', '16');
      let fill = 'var(--surface-2)', stroke = 'var(--border-strong)';
      if (f.visited && f.visited.has(n.id)) { fill = 'var(--accent-2-soft)'; stroke = 'var(--accent-2)'; }
      if (f.compareLo && f.compareLo.has(n.id)) { fill = 'var(--compare-lo-soft)'; stroke = 'var(--compare-lo)'; }
      else if (f.compareHi && f.compareHi.has(n.id)) { fill = 'var(--compare-hi-soft)'; stroke = 'var(--compare-hi)'; }
      if (f.active === n.id) { fill = 'var(--accent-soft)'; stroke = 'var(--accent)'; }
      if (f.componentColor && f.componentColor.has(n.id)) { stroke = f.componentColor.get(n.id); }
      circle.setAttribute('fill', fill); circle.setAttribute('stroke', stroke); circle.setAttribute('stroke-width', '2');
      const text = document.createElementNS(svgNS, 'text');
      text.setAttribute('x', n.x); text.setAttribute('y', n.y + 4); text.setAttribute('text-anchor', 'middle');
      text.setAttribute('font-family', 'monospace'); text.setAttribute('font-size', '12'); text.setAttribute('fill', 'var(--text)');
      text.textContent = n.label;
      g.appendChild(circle); g.appendChild(text);

      if (f.dist && f.dist.has(n.id) && f.dist.get(n.id) !== Infinity) {
        const dtxt = document.createElementNS(svgNS, 'text');
        dtxt.setAttribute('x', n.x); dtxt.setAttribute('y', n.y - 22); dtxt.setAttribute('text-anchor', 'middle');
        dtxt.setAttribute('font-family', 'monospace'); dtxt.setAttribute('font-size', '10'); dtxt.setAttribute('fill', 'var(--accent)');
        dtxt.textContent = f.dist.get(n.id);
        g.appendChild(dtxt);
      }

      enableDrag(g, n);
      svg.appendChild(g);
    });

    ws.stage.appendChild(svg);
    if (f.frontier) {
      ws.stage.appendChild(el('div', { class: 'legend', style: 'margin-top:10px' },
        [el('span', { class: 'eyebrow', text: 'FRONTIER: ' }), ...f.frontier.map(x => el('span', { class: 'badge', text: x }))]));
    }
  }

  function enableDrag(g, n) {
    let dragging = false;
    g.addEventListener('pointerdown', (e) => { dragging = true; g.setPointerCapture(e.pointerId); });
    g.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      const rect = svg.getBoundingClientRect();
      const vb = svg.viewBox.baseVal;
      n.x = ((e.clientX - rect.left) / rect.width) * vb.width;
      n.y = ((e.clientY - rect.top) / rect.height) * vb.height;
      drawGraph();
    });
    g.addEventListener('pointerup', () => dragging = false);
  }

  function mountControls() {
    const modeSelect = el('select', {}, Object.entries({
      bfs: 'BFS', dfs: 'DFS', dijkstra: "Dijkstra's Shortest Path", prim: "Prim's MST", kruskal: "Kruskal's MST",
      topo: 'Topological Sort', cycle: 'Cycle Detection', components: 'Connected Components'
    }).map(([k, v]) => el('option', { value: k, text: v })));
    const nInput = el('input', { type: 'text', value: '6', style: 'max-width:70px' });
    const directedToggle = el('input', { type: 'checkbox' });
    const weightedToggle = el('input', { type: 'checkbox', checked: 'true' });
    const startSelect = el('select', { dataset: { role: 'startSelect' } });
    const fromInput = el('input', { type: 'text', placeholder: 'from (A)', style: 'max-width:80px' });
    const toInput = el('input', { type: 'text', placeholder: 'to (B)', style: 'max-width:80px' });
    const wInput = el('input', { type: 'text', placeholder: 'wt', style: 'max-width:50px' });

    const extra = el('div', { style: 'display:flex; flex-direction:column; gap:12px;' }, [
      el('div', { style: 'display:flex; flex-wrap:wrap; gap:14px; align-items:flex-end;' }, [
        el('div', { class: 'field', style: 'min-width:190px' }, [el('label', {}, [document.createTextNode('Algorithm')]), el('div', { class: 'select-wrap' }, [modeSelect])]),
        el('div', { class: 'field' }, [el('label', {}, [document.createTextNode('Nodes')]), nInput]),
        el('div', { class: 'field' }, [el('label', {}, [document.createTextNode('Start Node')]), startSelect]),
        el('label', { class: 'checkbox-row' }, [directedToggle, document.createTextNode('Directed')]),
        el('label', { class: 'checkbox-row' }, [weightedToggle, document.createTextNode('Weighted')]),
        el('button', { class: 'btn btn-sm', text: '🎲 Random Graph', onclick: () => { state.directed = directedToggle.checked; state.weighted = weightedToggle.checked; generateGraph(Utils.clamp(Number(nInput.value) || 6, 3, 12)); refreshStartOptions(); } })
      ]),
      el('div', { style: 'display:flex; gap:8px; align-items:flex-end; flex-wrap:wrap;' }, [
        el('div', { class: 'field' }, [el('label', {}, [document.createTextNode('Add Edge')]), fromInput]),
        toInput, wInput,
        el('button', { class: 'btn btn-sm', text: '+ Add', onclick: () => addEdge(fromInput.value, toInput.value, wInput.value) })
      ])
    ]);
    modeSelect.addEventListener('change', () => { state.mode = modeSelect.value; refreshInfo(); });
    function refreshStartOptions() {
      startSelect.innerHTML = '';
      state.nodes.forEach(n => startSelect.appendChild(el('option', { value: n.id, text: n.label })));
    }
    return { extra, modeSelect, nInput, startSelect, directedToggle, weightedToggle, refreshStartOptions };
  }

  function addEdge(fromLabel, toLabel, wt) {
    const from = state.nodes.find(n => n.label === fromLabel.trim().toUpperCase());
    const to = state.nodes.find(n => n.label === toLabel.trim().toUpperCase());
    if (!from || !to) { toast('Unknown node label(s)', 'error'); return; }
    state.edges.push({ from: from.id, to: to.id, weight: Number(wt) || 1 });
    drawGraph();
    toast(`Edge ${from.label}→${to.label} added`, 'success');
  }

  function refreshInfo() {
    const meta = META[state.mode];
    ws.setPseudocode(PSEUDOCODE[state.mode]);
    ws.panels.complexity.innerHTML = '';
    ws.panels.complexity.appendChild(el('table', { class: 'complexity-table' }, [
      el('thead', {}, [el('tr', {}, [el('th', { text: 'Case' }), el('th', { text: 'Time' })])]),
      el('tbody', {}, [['Best', meta.best], ['Average', meta.avg], ['Worst', meta.worst]].map(r => el('tr', {}, [el('td', { text: r[0] }), el('td', { class: 'mono', text: r[1] })])))
    ]));
    ws.panels.complexity.appendChild(el('p', {}, [document.createTextNode('Space complexity: '), el('span', { class: 'mono', style: 'color:var(--accent-2)', text: meta.space })]));
    ws.panels.notes.innerHTML = '';
    const block = (title, items) => el('div', { style: 'margin-bottom:12px' }, [
      el('h4', { style: 'font-size:12px;color:var(--text-faint);text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px', text: title }),
      el('ul', { class: 'info-list' }, items.map(i => el('li', { text: i })))
    ]);
    ws.panels.notes.appendChild(block('Applications', meta.applications));
    ws.panels.notes.appendChild(block('Advantages', meta.advantages));
    ws.panels.notes.appendChild(block('Disadvantages', meta.disadvantages));
  }

  function render(view) {
    const controls = mountControls();
    ws = Workspace.build(view, {
      title: 'Graph Visualizer',
      description: 'Drag nodes to rearrange the layout. Build directed/undirected/weighted graphs and run classic graph algorithms.',
      statChips: [{ key: 'visited', label: 'Visited' }, { key: 'edges', label: 'Edges Used' }, { key: 'timer', label: 'Step' }],
      pseudocode: PSEUDOCODE.bfs,
      complexity: META.bfs,
      applications: META.bfs.applications, advantages: META.bfs.advantages, disadvantages: META.bfs.disadvantages,
      extraControls: controls.extra,
      legend: [
        { color: 'var(--accent)', label: 'Active' },
        { color: 'var(--compare-lo)', label: 'Improves / accepted' },
        { color: 'var(--compare-hi)', label: 'No improvement / rejected' },
        { color: 'var(--accent-2)', label: 'Visited / MST edge' }
      ]
    });
    state = { mode: 'bfs', nodes: [], edges: [], directed: false, weighted: true };
    generateGraph(6);
    controls.refreshStartOptions();
    refreshInfo();

    ws.startBtn.addEventListener('click', () => {
      if (ws.player.index > 0 && ws.player.index < ws.player.total - 1) { ws.player.play(); return; }
      runAlgo(Number(controls.startSelect.value) || 0);
    });
  }

  function runAlgo(startId) {
    const adj = adjacency();
    const steps = [];
    const push = (desc, line, frame, counters) => steps.push({
      desc, line, counters: counters || { visited: (frame.visited ? frame.visited.size : 0), edges: (frame.usedEdges ? frame.usedEdges.size : frame.mstEdges ? frame.mstEdges.size : 0), timer: steps.length },
      render: () => drawGraph(frame)
    });

    if (state.mode === 'bfs' || state.mode === 'dfs') {
      const visited = new Set([startId]);
      const usedEdges = new Set();
      push(`Start at ${label(startId)}`, 1, { visited: new Set(visited), active: startId, usedEdges });
      if (state.mode === 'bfs') {
        const q = [startId];
        while (q.length) {
          const u = q.shift();
          (adj.get(u) || []).forEach(({ to }) => {
            if (!visited.has(to)) {
              visited.add(to); usedEdges.add(`${u}-${to}`); q.push(to);
              push(`Visit ${label(to)} from ${label(u)}`, 4, { visited: new Set(visited), active: to, usedEdges: new Set(usedEdges), activeEdge: `${u}-${to}` });
            }
          });
        }
      } else {
        (function dfs(u) {
          (adj.get(u) || []).forEach(({ to }) => {
            if (!visited.has(to)) {
              visited.add(to); usedEdges.add(`${u}-${to}`);
              push(`Visit ${label(to)} from ${label(u)}`, 2, { visited: new Set(visited), active: to, usedEdges: new Set(usedEdges), activeEdge: `${u}-${to}` });
              dfs(to);
            }
          });
        })(startId);
      }
      push('Traversal complete.', 0, { visited: new Set(visited), usedEdges: new Set(usedEdges) });

    } else if (state.mode === 'dijkstra') {
      const dist = new Map(state.nodes.map(n => [n.id, Infinity])); dist.set(startId, 0);
      const visited = new Set(); const usedEdges = new Set();
      push(`Initialize dist[${label(startId)}]=0, all others=∞`, 0, { dist: new Map(dist), visited: new Set() });
      while (visited.size < state.nodes.length) {
        let u = null, best = Infinity;
        dist.forEach((d, id) => { if (!visited.has(id) && d < best) { best = d; u = id; } });
        if (u === null) break;
        visited.add(u);
        push(`Pick unvisited min-distance node ${label(u)} (dist=${dist.get(u)})`, 2, { dist: new Map(dist), visited: new Set(visited), active: u, frontier: [...dist].filter(([id]) => !visited.has(id) && dist.get(id) < Infinity).map(([id, d]) => `${label(id)}:${d}`) });
        (adj.get(u) || []).forEach(({ to, weight }) => {
          const candidate = dist.get(u) + weight;
          const improves = candidate < dist.get(to);
          push(`Relax check: dist[${label(u)}]+${weight} = ${candidate} vs current dist[${label(to)}]=${dist.get(to) === Infinity ? '∞' : dist.get(to)}`, 4,
            { dist: new Map(dist), visited: new Set(visited), active: u, activeEdge: `${u}-${to}`,
              compareLo: improves ? new Set([to]) : new Set(), compareHi: improves ? new Set() : new Set([to]) });
          if (improves) {
            dist.set(to, candidate); usedEdges.add(`${u}-${to}`);
            push(`Relax ${label(u)}→${label(to)}: dist[${label(to)}] = ${dist.get(to)}`, 4, { dist: new Map(dist), visited: new Set(visited), active: u, compareLo: new Set([to]), activeEdge: `${u}-${to}`, usedEdges: new Set(usedEdges) });
          }
        });
      }
      push('Shortest paths finalized.', 0, { dist: new Map(dist), visited: new Set(visited), usedEdges: new Set(usedEdges) });

    } else if (state.mode === 'prim') {
      const inMst = new Set([startId]); const mstEdges = new Set();
      push(`Start MST at ${label(startId)}`, 0, { visited: new Set(inMst), active: startId });
      while (inMst.size < state.nodes.length) {
        let best = null;
        state.edges.forEach(e => {
          [[e.from, e.to], state.directed ? null : [e.to, e.from]].filter(Boolean).forEach(([a, b]) => {
            if (inMst.has(a) && !inMst.has(b)) {
              if (!best || e.weight < best.weight) best = { from: a, to: b, weight: e.weight };
            }
          });
        });
        if (!best) break;
        inMst.add(best.to); mstEdges.add(`${best.from}-${best.to}`);
        push(`Add cheapest crossing edge ${label(best.from)}→${label(best.to)} (w=${best.weight})`, 3, { visited: new Set(inMst), active: best.to, mstEdges: new Set(mstEdges), activeEdge: `${best.from}-${best.to}` });
      }
      push('Minimum Spanning Tree complete.', 0, { visited: new Set(inMst), mstEdges: new Set(mstEdges) });

    } else if (state.mode === 'kruskal') {
      const parent = new Map(state.nodes.map(n => [n.id, n.id]));
      const find = x => parent.get(x) === x ? x : (parent.set(x, find(parent.get(x))), parent.get(x));
      const union = (a, b) => { parent.set(find(a), find(b)); };
      const sorted = state.edges.slice().sort((a, b) => a.weight - b.weight);
      const mstEdges = new Set();
      push('Sort all edges by weight', 0, {});
      sorted.forEach(e => {
        const wouldCycle = find(e.from) === find(e.to);
        push(`Consider edge ${label(e.from)}→${label(e.to)} (w=${e.weight})`, 1,
          { mstEdges: new Set(mstEdges), activeEdge: `${e.from}-${e.to}`,
            compareLo: wouldCycle ? new Set() : new Set([e.from, e.to]),
            compareHi: wouldCycle ? new Set([e.from, e.to]) : new Set() });
        if (!wouldCycle) {
          union(e.from, e.to); mstEdges.add(`${e.from}-${e.to}`);
          push(`No cycle → add to MST`, 3, { mstEdges: new Set(mstEdges), activeEdge: `${e.from}-${e.to}` });
        } else {
          push(`Would form a cycle → skip`, 2, { mstEdges: new Set(mstEdges) });
        }
      });
      push('Minimum Spanning Tree complete.', 0, { mstEdges: new Set(mstEdges) });

    } else if (state.mode === 'topo') {
      if (!state.directed) toast('Topological sort assumes a directed graph', 'info');
      const indeg = new Map(state.nodes.map(n => [n.id, 0]));
      state.edges.forEach(e => indeg.set(e.to, (indeg.get(e.to) || 0) + 1));
      const q = state.nodes.filter(n => indeg.get(n.id) === 0).map(n => n.id);
      const order = []; const visited = new Set();
      push(`Queue nodes with in-degree 0: [${q.map(label).join(', ')}]`, 1, { visited: new Set() });
      while (q.length) {
        const u = q.shift(); order.push(u); visited.add(u);
        push(`Output ${label(u)} → order so far: ${order.map(label).join(', ')}`, 3, { visited: new Set(visited), active: u });
        (adj.get(u) || []).forEach(({ to }) => {
          indeg.set(to, indeg.get(to) - 1);
          if (indeg.get(to) === 0) q.push(to);
        });
      }
      if (order.length < state.nodes.length) push('Cycle detected — no valid topological order exists.', 0, { visited: new Set(visited) });
      else push(`Final order: ${order.map(label).join(' → ')}`, 0, { visited: new Set(visited) });

    } else if (state.mode === 'cycle') {
      const color = new Map(state.nodes.map(n => [n.id, 0]));
      let cycleFound = false;
      const visitedAll = new Set();
      (function dfs(u, parent) {
        if (cycleFound) return;
        color.set(u, 1); visitedAll.add(u);
        push(`Enter ${label(u)} (mark gray / on-stack)`, 1, { visited: new Set(visitedAll), active: u });
        for (const { to } of (adj.get(u) || [])) {
          if (!state.directed && to === parent) continue;
          if (color.get(to) === 1) {
            cycleFound = true;
            push(`Edge ${label(u)}→${label(to)} hits a gray node → cycle found!`, 2, { visited: new Set(visitedAll), active: to, activeEdge: `${u}-${to}` });
            return;
          }
          if (color.get(to) === 0) dfs(to, u);
        }
        color.set(u, 2);
      })(startId, -1);
      if (!cycleFound) push('No cycle detected.', 0, { visited: new Set(visitedAll) });

    } else if (state.mode === 'components') {
      const visited = new Set();
      const colors = ['var(--accent)', 'var(--accent-2)', 'var(--accent-3)', 'var(--success)', 'var(--danger)'];
      const componentColor = new Map();
      let compIdx = 0;
      state.nodes.forEach(n => {
        if (visited.has(n.id)) return;
        const c = colors[compIdx % colors.length]; compIdx++;
        const q = [n.id];
        push(`New component starting at ${label(n.id)}`, 1, { visited: new Set(visited), active: n.id, componentColor: new Map(componentColor) });
        while (q.length) {
          const u = q.shift();
          if (visited.has(u)) continue;
          visited.add(u); componentColor.set(u, c);
          push(`Mark ${label(u)} as component ${compIdx}`, 2, { visited: new Set(visited), active: u, componentColor: new Map(componentColor) });
          (adj.get(u) || []).forEach(({ to }) => { if (!visited.has(to)) q.push(to); });
        }
      });
      push(`Found ${compIdx} connected component(s).`, 0, { visited: new Set(visited), componentColor: new Map(componentColor) });
    }

    ws.player.load(steps);
    ws.enableTransport();
    ws.player.play();
  }

  function label(id) { const n = state.nodes.find(x => x.id === id); return n ? n.label : '?'; }

  return { render };
})();
