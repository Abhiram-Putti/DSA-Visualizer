/* ==========================================================================
   TREE VISUALIZER — Binary Search Tree, AVL Tree, Max-Heap
   ========================================================================== */

const TreeModule = (() => {
  const { el, $$, toast } = Utils;

  const PSEUDOCODE = {
    bst: [
      'insert(x): recurse left/right by value; place at null child',
      'search(x): recurse left/right; found when node.val==x',
      'delete(x): 0 children→remove, 1 child→splice,',
      '           2 children→replace with inorder successor',
      'traverse: inorder / preorder / postorder / level-order'
    ],
    avl: [
      'insert(x): BST insert, then walk up updating heights',
      'balance = height(left) - height(right)',
      'if |balance|>1: apply LL / RR / LR / RL rotation',
      'rotation restores height balance in O(1) per node'
    ],
    heap: [
      'insert(x): place at end; bubble up while parent < x',
      'extractMax(): swap root with last; remove last;',
      '              sift down (heapify) from root'
    ]
  };
  const META = {
    bst: { best: 'O(log n)', avg: 'O(log n)', worst: 'O(n)', space: 'O(n)',
      applications: ['Ordered sets/maps', 'Range queries', 'Symbol tables in compilers'],
      advantages: ['In-order traversal yields sorted data', 'Simple recursive operations'],
      disadvantages: ['Degrades to O(n) on skewed/sorted insertions without balancing'] },
    avl: { best: 'O(log n)', avg: 'O(log n)', worst: 'O(log n)', space: 'O(n)',
      applications: ['Databases & indexes needing guaranteed lookup time', 'Memory-constrained ordered maps'],
      advantages: ['Height always O(log n) — guaranteed worst case', 'Faster lookups than red-black trees in read-heavy workloads'],
      disadvantages: ['More rotations on insert/delete than red-black trees'] },
    heap: { best: 'O(1) peek', avg: 'O(log n)', worst: 'O(log n)', space: 'O(n)',
      applications: ['Priority queues', 'Heap sort', "Dijkstra's & Prim's algorithms"],
      advantages: ['O(1) access to max/min', 'O(log n) insert & extract'],
      disadvantages: ['Not a sorted structure overall', 'O(n) to search an arbitrary value'] }
  };

  let ws, state, nodeSeq;

  function newNode(val) { return { id: nodeSeq++, val, left: null, right: null, height: 1 }; }
  function h(n) { return n ? n.height : 0; }
  function updateHeight(n) { n.height = 1 + Math.max(h(n.left), h(n.right)); }
  function balanceFactor(n) { return n ? h(n.left) - h(n.right) : 0; }

  function rotateRight(y) { const x = y.left; y.left = x.right; x.right = y; updateHeight(y); updateHeight(x); return x; }
  function rotateLeft(x) { const y = x.right; x.right = y.left; y.left = x; updateHeight(x); updateHeight(y); return y; }

  function bstInsert(root, val, trace) {
    if (!root) { const n = newNode(val); trace.push({ id: n.id, note: `Insert ${val} here` }); return n; }
    trace.push({ id: root.id, note: `${val} ${val < root.val ? '<' : val > root.val ? '>' : '='} ${root.val}` });
    if (val < root.val) root.left = bstInsert(root.left, val, trace);
    else if (val > root.val) root.right = bstInsert(root.right, val, trace);
    else return root;
    updateHeight(root);
    return root;
  }

  function avlInsert(root, val, trace, rotations) {
    if (!root) { const n = newNode(val); trace.push({ id: n.id, note: `Insert ${val} here` }); return n; }
    trace.push({ id: root.id, note: `${val} ${val < root.val ? '<' : '>'} ${root.val}` });
    if (val < root.val) root.left = avlInsert(root.left, val, trace, rotations);
    else if (val > root.val) root.right = avlInsert(root.right, val, trace, rotations);
    else return root;
    updateHeight(root);
    const bf = balanceFactor(root);
    if (bf > 1 && val < root.left.val) { rotations.push(`Right rotation at ${root.val} (LL case)`); return rotateRight(root); }
    if (bf < -1 && val > root.right.val) { rotations.push(`Left rotation at ${root.val} (RR case)`); return rotateLeft(root); }
    if (bf > 1 && val > root.left.val) { rotations.push(`Left-Right rotation at ${root.val}`); root.left = rotateLeft(root.left); return rotateRight(root); }
    if (bf < -1 && val < root.right.val) { rotations.push(`Right-Left rotation at ${root.val}`); root.right = rotateRight(root.right); return rotateLeft(root); }
    return root;
  }

  function bstFindMin(root) { while (root.left) root = root.left; return root; }
  function bstDelete(root, val, trace) {
    if (!root) return null;
    trace.push({ id: root.id, note: `${val} ${val < root.val ? '<' : val > root.val ? '>' : '=='} ${root.val}` });
    if (val < root.val) root.left = bstDelete(root.left, val, trace);
    else if (val > root.val) root.right = bstDelete(root.right, val, trace);
    else {
      if (!root.left) return root.right;
      if (!root.right) return root.left;
      const succ = bstFindMin(root.right);
      trace.push({ id: succ.id, note: `Inorder successor = ${succ.val}` });
      root.val = succ.val;
      root.right = bstDelete(root.right, succ.val, trace);
    }
    updateHeight(root);
    return root;
  }

  /* ---------- Layout: assign x via inorder index, y via depth ---------- */
  function layout(root) {
    const positions = new Map();
    let counter = 0;
    (function walk(n, depth) {
      if (!n) return;
      walk(n.left, depth + 1);
      positions.set(n.id, { x: counter++, y: depth, node: n });
      walk(n.right, depth + 1);
    })(root, 0);
    return positions;
  }

  function renderTree(root, activeId, doneSet, note) {
    ws.stage.innerHTML = '';
    if (!root) { ws.stage.appendChild(el('div', { class: 'empty-state', text: 'Tree is empty. Insert a value to begin.' })); return; }
    const positions = layout(root);
    const XG = 56, YG = 64, PAD = 30;
    let maxX = 0;
    positions.forEach(p => maxX = Math.max(maxX, p.x));
    const width = Math.max(maxX * XG + PAD * 2 + 30, 300);
    const height = (Math.max(...Array.from(positions.values()).map(p => p.y)) + 1) * YG + PAD * 2;

    const svgNS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('width', width); svg.setAttribute('height', height);
    svg.style.position = 'absolute'; svg.style.left = 0; svg.style.top = 0;

    const wrap = el('div', { style: `position:relative; width:${width}px; height:${height}px; margin:0 auto;` });

    const coord = (id) => { const p = positions.get(id); return { cx: p.x * XG + PAD + 20, cy: p.y * YG + PAD }; };

    (function drawEdges(n) {
      if (!n) return;
      const c = coord(n.id);
      [n.left, n.right].forEach(child => {
        if (!child) return;
        const cc = coord(child.id);
        const line = document.createElementNS(svgNS, 'line');
        line.setAttribute('x1', c.cx); line.setAttribute('y1', c.cy + 18);
        line.setAttribute('x2', cc.cx); line.setAttribute('y2', cc.cy - 18);
        line.setAttribute('stroke', 'var(--border-strong)'); line.setAttribute('stroke-width', '1.5');
        svg.appendChild(line);
        drawEdges(child);
      });
    })(root);

    wrap.appendChild(svg);

    positions.forEach((p, id) => {
      const { cx, cy } = coord(id);
      const cls = id === activeId ? 'active' : (doneSet && doneSet.has(id)) ? 'visited' : '';
      wrap.appendChild(el('div', {
        class: `node-box ${cls}`,
        style: `position:absolute; left:${cx - 20}px; top:${cy - 18}px; width:40px; height:36px; border-radius:50%; justify-content:center;`
      }, [document.createTextNode(String(p.node.val))]));
    });

    ws.stage.appendChild(wrap);
    if (note) ws.stage.appendChild(el('div', { class: 'badge', style: 'position:absolute; top:14px; left:14px;', text: note }));
  }

  function stepsFromTrace(trace, root, opLabel) {
    const steps = [];
    const doneSet = new Set();
    trace.forEach((t, i) => {
      steps.push({
        desc: t.note, line: 1,
        counters: { comparisons: i + 1, height: h(root), timer: i },
        render: () => renderTree(root, t.id, doneSet, opLabel)
      });
      doneSet.add(t.id);
    });
    steps.push({ desc: `${opLabel} complete.`, line: 0, counters: { comparisons: trace.length, height: h(root), timer: trace.length }, render: () => renderTree(root, null, doneSet, opLabel) });
    return steps;
  }

  function doInsert(val) {
    const trace = [];
    if (state.mode === 'avl') {
      const rotations = [];
      state.root = avlInsert(state.root, val, trace, rotations);
      const steps = stepsFromTrace(trace, state.root, `Insert ${val}`);
      rotations.forEach(r => steps.push({ desc: r, line: 2, counters: { comparisons: trace.length, height: h(state.root), timer: steps.length }, render: () => renderTree(state.root, null, new Set(), r) }));
      ws.player.load(steps); ws.enableTransport(); ws.player.play();
    } else {
      state.root = bstInsert(state.root, val, trace);
      const steps = stepsFromTrace(trace, state.root, `Insert ${val}`);
      ws.player.load(steps); ws.enableTransport(); ws.player.play();
    }
  }
  function doDelete(val) {
    const trace = [];
    state.root = bstDelete(state.root, val, trace);
    const steps = stepsFromTrace(trace.length ? trace : [{ id: null, note: `${val} not found` }], state.root, `Delete ${val}`);
    ws.player.load(steps); ws.enableTransport(); ws.player.play();
  }
  function doSearch(val) {
    const trace = []; let found = false; let n = state.root;
    while (n) {
      trace.push({ id: n.id, note: `${val} ${val < n.val ? '<' : val > n.val ? '>' : '=='} ${n.val}` });
      if (val === n.val) { found = true; break; }
      n = val < n.val ? n.left : n.right;
    }
    const steps = stepsFromTrace(trace, state.root, found ? `Found ${val}` : `${val} not found`);
    ws.player.load(steps); ws.enableTransport(); ws.player.play();
  }
  function doTraverse(kind) {
    if (!state.root) { toast('Tree is empty', 'info'); return; }
    const order = [];
    const visit = (n) => order.push(n);
    if (kind === 'level') {
      const q = [state.root];
      while (q.length) { const n = q.shift(); visit(n); if (n.left) q.push(n.left); if (n.right) q.push(n.right); }
    } else {
      (function walk(n) {
        if (!n) return;
        if (kind === 'preorder') visit(n);
        walk(n.left);
        if (kind === 'inorder') visit(n);
        walk(n.right);
        if (kind === 'postorder') visit(n);
      })(state.root);
    }
    const steps = [];
    const doneSet = new Set();
    order.forEach((n, i) => {
      steps.push({ desc: `Visit ${n.val} (${kind}, ${i + 1}/${order.length})`, line: 4, counters: { comparisons: i + 1, height: h(state.root), timer: i },
        render: () => renderTree(state.root, n.id, doneSet, `${kind}: ${order.slice(0, i + 1).map(x => x.val).join(' → ')}`) });
      doneSet.add(n.id);
    });
    ws.player.load(steps); ws.enableTransport(); ws.player.play();
  }

  /* ---------- Heap mode (array-backed max-heap, shown as a tree) ---------- */
  function heapArrayToTree(arr) {
    if (!arr.length) return { root: null, baseId: null };
    const baseId = nodeSeq;
    const nodes = arr.map(v => ({ id: nodeSeq++, val: v, left: null, right: null }));
    nodes.forEach((n, i) => { if (2 * i + 1 < nodes.length) n.left = nodes[2 * i + 1]; if (2 * i + 2 < nodes.length) n.right = nodes[2 * i + 2]; });
    return { root: nodes[0], baseId };
  }
  function heapInsert(val) {
    state.heap.push(val);
    const steps = [];
    let i = state.heap.length - 1;
    steps.push(mkHeapStep(`Insert ${val} at end (index ${i})`, 0, i));
    while (i > 0) {
      const parent = Math.floor((i - 1) / 2);
      if (state.heap[parent] < state.heap[i]) {
        [state.heap[parent], state.heap[i]] = [state.heap[i], state.heap[parent]];
        steps.push(mkHeapStep(`Bubble up: swap with parent (index ${parent})`, 1, parent));
        i = parent;
      } else break;
    }
    ws.player.load(steps); ws.enableTransport(); ws.player.play();
  }
  function heapExtractMax() {
    if (!state.heap.length) { toast('Heap is empty', 'info'); return; }
    const steps = [];
    const max = state.heap[0];
    state.heap[0] = state.heap[state.heap.length - 1];
    state.heap.pop();
    steps.push(mkHeapStep(`extractMax() → ${max}. Move last element to root.`, 0));
    let i = 0;
    while (true) {
      let largest = i, l = 2 * i + 1, r = 2 * i + 2;
      if (l < state.heap.length && state.heap[l] > state.heap[largest]) largest = l;
      if (r < state.heap.length && state.heap[r] > state.heap[largest]) largest = r;
      if (largest === i) break;
      [state.heap[i], state.heap[largest]] = [state.heap[largest], state.heap[i]];
      steps.push(mkHeapStep(`Sift down: swap index ${i} and ${largest}`, 2, largest));
      i = largest;
    }
    steps.push(mkHeapStep(`Heap restored. Extracted max = ${max}`, 2));
    ws.player.load(steps); ws.enableTransport(); ws.player.play();
  }
  function mkHeapStep(desc, line, activeIdx) {
    const snapshot = state.heap.slice();
    return {
      desc, line, counters: { comparisons: 0, height: Math.ceil(Math.log2(snapshot.length + 1)), timer: 0 },
      render: () => {
        const { root, baseId } = heapArrayToTree(snapshot);
        const activeId = (activeIdx !== undefined && baseId !== null) ? baseId + activeIdx : null;
        renderTree(root, activeId, new Set(), `heap: [${snapshot.join(', ')}]`);
      }
    };
  }

  function mountControls() {
    const modeSelect = el('select', {}, [
      el('option', { value: 'bst', text: 'Binary Search Tree' }),
      el('option', { value: 'avl', text: 'AVL Tree' }),
      el('option', { value: 'heap', text: 'Max-Heap' })
    ]);
    const valueInput = el('input', { type: 'text', placeholder: 'value', style: 'max-width:100px' });
    const traverseSelect = el('select', { dataset: { role: 'traverseSelect' } }, [
      el('option', { value: 'inorder', text: 'Inorder' }),
      el('option', { value: 'preorder', text: 'Preorder' }),
      el('option', { value: 'postorder', text: 'Postorder' }),
      el('option', { value: 'level', text: 'Level Order' })
    ]);

    const bstBtns = el('div', { class: 'btn-group', dataset: { role: 'bstBtns' } }, [
      valueInput,
      el('button', { class: 'btn btn-sm', text: 'Insert', onclick: () => req(v => doInsert(v)) }),
      el('button', { class: 'btn btn-sm', text: 'Delete', onclick: () => req(v => doDelete(v)) }),
      el('button', { class: 'btn btn-sm', text: 'Search', onclick: () => req(v => doSearch(v)) }),
      el('div', { class: 'select-wrap' }, [traverseSelect]),
      el('button', { class: 'btn btn-sm', text: 'Traverse', onclick: () => doTraverse(traverseSelect.value) }),
      el('button', { class: 'btn btn-sm btn-ghost', text: 'Clear', onclick: clearTree })
    ]);
    const heapBtns = el('div', { class: 'btn-group', dataset: { role: 'heapBtns' }, style: 'display:none' }, [
      valueInput,
      el('button', { class: 'btn btn-sm', text: 'Insert', onclick: () => req(v => heapInsert(Number(v))) }),
      el('button', { class: 'btn btn-sm', text: 'Extract Max', onclick: heapExtractMax }),
      el('button', { class: 'btn btn-sm btn-ghost', text: 'Clear', onclick: clearTree })
    ]);
    function req(fn) { if (valueInput.value.trim() === '') { toast('Enter a value', 'error'); return; } const v = valueInput.value.trim(); fn(state.mode === 'heap' ? Number(v) : Number(v)); valueInput.value = ''; }

    const extra = el('div', { style: 'display:flex; flex-direction:column; gap:12px;' }, [
      el('div', { class: 'field', style: 'max-width:220px' }, [el('label', {}, [document.createTextNode('Tree Type')]), el('div', { class: 'select-wrap' }, [modeSelect])]),
      bstBtns, heapBtns
    ]);
    modeSelect.addEventListener('change', () => {
      state.mode = modeSelect.value;
      bstBtns.style.display = state.mode === 'heap' ? 'none' : 'flex';
      heapBtns.style.display = state.mode === 'heap' ? 'flex' : 'none';
      resetForMode();
    });
    return { extra, modeSelect };
  }

  function clearTree() { state.root = null; state.heap = []; ws.stage.innerHTML = ''; ws.stage.appendChild(el('div', { class: 'empty-state', text: 'Tree cleared. Insert a value.' })); ws.player.load([]); }

  function resetForMode() {
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
    clearTree();
    ws.setCounters({ comparisons: 0, height: 0, timer: 0 });
  }

  function render(view) {
    const controls = mountControls();
    ws = Workspace.build(view, {
      title: 'Tree Visualizer',
      description: 'Insert, delete, search, and traverse binary search trees, self-balancing AVL trees, and max-heaps.',
      statChips: [{ key: 'comparisons', label: 'Comparisons' }, { key: 'height', label: 'Height' }, { key: 'timer', label: 'Step' }],
      pseudocode: PSEUDOCODE.bst,
      complexity: META.bst,
      applications: META.bst.applications, advantages: META.bst.advantages, disadvantages: META.bst.disadvantages,
      extraControls: controls.extra,
      legend: [{ color: 'var(--accent)', label: 'Active node' }, { color: 'var(--accent-2)', label: 'Visited' }]
    });
    state = { mode: 'bst', root: null, heap: [] };
    nodeSeq = 1;
    ws.startBtn.style.display = 'none';
    ws.pauseBtn.style.display = 'none';
    resetForMode();
  }

  return { render };
})();
