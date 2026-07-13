/* ==========================================================================
   RECURSION VISUALIZER — call tree with active-call highlighting
   ========================================================================== */

const RecursionModule = (() => {
  const { el, $$, toast } = Utils;

  const PSEUDOCODE = {
    factorial: ['factorial(n):', '  if n <= 1: return 1', '  return n * factorial(n-1)'],
    hanoi: [
      'hanoi(n, from, to, aux):',
      '  if n == 0: return',
      '  hanoi(n-1, from, aux, to)',
      '  move disk n: from -> to',
      '  hanoi(n-1, aux, to, from)'
    ],
    binsearch: [
      'search(arr, lo, hi, target):',
      '  if lo > hi: return -1',
      '  mid = (lo+hi)/2',
      '  if arr[mid]==target: return mid',
      '  elif arr[mid]<target: return search(mid+1, hi)',
      '  else: return search(lo, mid-1)'
    ],
    mergetree: ['mergeSort(l, r):', '  if l >= r: return', '  m = (l+r)/2', '  mergeSort(l, m)', '  mergeSort(m+1, r)', '  merge(l, m, r)']
  };
  const META = {
    factorial: { best: 'O(n)', avg: 'O(n)', worst: 'O(n)', space: 'O(n) (call stack)',
      applications: ['Combinatorics', 'Introductory recursion teaching'],
      advantages: ['Direct translation of the mathematical definition'],
      disadvantages: ['Stack overflow risk for very large n', 'Iterative version is more efficient'] },
    hanoi: { best: 'O(2ⁿ)', avg: 'O(2ⁿ)', worst: 'O(2ⁿ)', space: 'O(n) (call stack)',
      applications: ['Classic recursion/backtracking teaching', 'Modeling divide-and-conquer with constraints'],
      advantages: ['Elegant recursive structure', 'Provably optimal move count (2ⁿ-1)'],
      disadvantages: ['Exponential time — infeasible for large n'] },
    binsearch: { best: 'O(1)', avg: 'O(log n)', worst: 'O(log n)', space: 'O(log n) (call stack)',
      applications: ['Same use cases as iterative binary search, expressed recursively'],
      advantages: ['Clear divide-and-conquer structure'],
      disadvantages: ['Uses extra stack space vs the iterative version'] },
    mergetree: { best: 'O(n log n)', avg: 'O(n log n)', worst: 'O(n log n)', space: 'O(n)',
      applications: ['Visualizing divide-and-conquer decomposition'],
      advantages: ['Shows exactly how the array is split before merging'],
      disadvantages: ['Tree depth grows with input size — large arrays produce large trees'] }
  };

  let ws, state;

  function mountControls() {
    const modeSelect = el('select', {}, [
      el('option', { value: 'factorial', text: 'Factorial' }),
      el('option', { value: 'hanoi', text: 'Tower of Hanoi' }),
      el('option', { value: 'binsearch', text: 'Binary Search (Recursive)' }),
      el('option', { value: 'mergetree', text: 'Merge Sort Recursion Tree' })
    ]);
    const nInput = el('input', { type: 'text', placeholder: 'n', value: '4', style: 'max-width:90px' });
    const targetInput = el('input', { type: 'text', placeholder: 'target', style: 'max-width:100px;display:none' });

    const extra = el('div', { style: 'display:flex; flex-wrap:wrap; gap:14px; align-items:flex-end;' }, [
      el('div', { class: 'field', style: 'min-width:190px' }, [el('label', {}, [document.createTextNode('Problem')]), el('div', { class: 'select-wrap' }, [modeSelect])]),
      el('div', { class: 'field' }, [el('label', {}, [document.createTextNode('n')]), nInput]),
      el('div', { class: 'field', dataset: { role: 'targetField' }, style: 'display:none' }, [el('label', {}, [document.createTextNode('Target')]), targetInput])
    ]);
    modeSelect.addEventListener('change', () => {
      state.mode = modeSelect.value;
      extra.querySelector('[data-role="targetField"]').style.display = state.mode === 'binsearch' ? 'flex' : 'none';
      refreshInfo();
    });
    return { extra, modeSelect, nInput, targetInput };
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
      title: 'Recursion Visualizer',
      description: 'Watch the call tree unfold: each box is one recursive call, highlighted while active and marked once it returns.',
      statChips: [{ key: 'calls', label: 'Calls' }, { key: 'depth', label: 'Max Depth' }, { key: 'timer', label: 'Step' }],
      pseudocode: PSEUDOCODE.factorial,
      complexity: META.factorial,
      applications: META.factorial.applications, advantages: META.factorial.advantages, disadvantages: META.factorial.disadvantages,
      extraControls: controls.extra,
      legend: [{ color: 'var(--accent)', label: 'Active call' }, { color: 'var(--accent-2)', label: 'Returned' }]
    });
    state = { mode: 'factorial' };
    refreshInfo();

    ws.startBtn.addEventListener('click', () => {
      if (ws.player.index > 0 && ws.player.index < ws.player.total - 1) { ws.player.play(); return; }
      run(controls.nInput.value, controls.targetInput.value);
    });
  }

  /* Build steps from a recorded call/return trace, rendering the tree fresh each step */
  function buildFromTrace(events) {
    const steps = [];
    const nodes = new Map(); // id -> {id,parent,label,status,ret}
    const order = [];
    let maxDepth = 0;

    events.forEach(ev => {
      if (ev.type === 'call') {
        nodes.set(ev.id, { id: ev.id, parent: ev.parent, label: ev.label, status: 'calling', depth: ev.depth, ret: null });
        order.push(ev.id);
        maxDepth = Math.max(maxDepth, ev.depth);
        steps.push({
          desc: `Call ${ev.label}`, line: ev.line,
          counters: { calls: order.length, depth: maxDepth, timer: steps.length },
          render: () => renderTree(nodes, order, ev.id)
        });
      } else {
        const n = nodes.get(ev.id);
        n.status = 'returned'; n.ret = ev.ret;
        steps.push({
          desc: `${ev.label} returns ${ev.ret}`, line: ev.line,
          counters: { calls: order.length, depth: maxDepth, timer: steps.length },
          render: () => renderTree(nodes, order, ev.id)
        });
      }
    });
    return steps;
  }

  function renderTree(nodes, order, activeId) {
    ws.stage.innerHTML = '';
    if (!order.length) { ws.stage.appendChild(el('div', { class: 'empty-state', text: 'No calls yet.' })); return; }
    const rootId = order[0];
    const buildLi = (id) => {
      const n = nodes.get(id);
      const children = order.filter(oid => nodes.get(oid).parent === id);
      const box = el('div', { class: `rnode ${id === activeId ? 'calling' : n.status === 'returned' ? 'returned' : 'pending'}` }, [
        el('div', { text: n.label }),
        n.ret !== null ? el('div', { class: 'ret', text: `→ ${n.ret}` }) : null
      ]);
      const li = el('li', {}, [box]);
      if (children.length) li.appendChild(el('ul', {}, children.map(buildLi)));
      return li;
    };
    const treeWrap = el('div', { class: 'rtree' }, [el('ul', {}, [buildLi(rootId)])]);
    ws.stage.appendChild(treeWrap);
  }

  function run(nStr, targetStr) {
    const n = parseInt(nStr, 10);
    if (isNaN(n) || n < 0) { toast('Enter a valid non-negative integer for n', 'error'); return; }
    let events = [];
    let idc = 0;

    if (state.mode === 'factorial') {
      if (n > 10) { toast('Keep n ≤ 10 to keep the tree readable', 'error'); return; }
      (function fact(k, parent, depth) {
        const id = idc++;
        events.push({ type: 'call', id, parent, label: `factorial(${k})`, depth, line: 0 });
        let ret;
        if (k <= 1) { ret = 1; events.push({ type: 'return', id, ret, label: `factorial(${k})`, line: 1 }); }
        else { const sub = fact(k - 1, id, depth + 1); ret = k * sub; events.push({ type: 'return', id, ret, label: `factorial(${k})`, line: 2 }); }
        return ret;
      })(n, null, 0);

    } else if (state.mode === 'hanoi') {
      if (n > 4) { toast('Keep n ≤ 4 (2ⁿ-1 moves grows fast!)', 'error'); return; }
      let moveNum = 0;
      (function hanoi(k, from, to, aux, parent, depth) {
        const id = idc++;
        events.push({ type: 'call', id, parent, label: `hanoi(${k},${from}→${to})`, depth, line: 0 });
        if (k === 0) { events.push({ type: 'return', id, ret: '—', label: `hanoi(${k})`, line: 1 }); return; }
        hanoi(k - 1, from, aux, to, id, depth + 1);
        moveNum++;
        events.push({ type: 'call', id: `m${idc++}`, parent: id, label: `Move disk ${k}: ${from}→${to}`, depth: depth + 1, line: 3 });
        events.push({ type: 'return', id: `m${idc - 1}`.replace('m', 'm'), ret: 'moved', label: `Move disk ${k}`, line: 3 });
        hanoi(k - 1, aux, to, from, id, depth + 1);
        events.push({ type: 'return', id, ret: 'done', label: `hanoi(${k})`, line: 4 });
      })(n, 'A', 'C', 'B', null, 0);

    } else if (state.mode === 'binsearch') {
      const arr = Array.from({ length: Math.max(n, 4) }, (_, i) => (i + 1) * 2).sort((a, b) => a - b);
      const target = Number(targetStr);
      if (targetStr === '' || isNaN(target)) { toast('Enter a numeric target (array is auto-generated & sorted)', 'error'); return; }
      (function search(lo, hi, parent, depth) {
        const id = idc++;
        events.push({ type: 'call', id, parent, label: `search(${lo},${hi})`, depth, line: 0 });
        if (lo > hi) { events.push({ type: 'return', id, ret: -1, label: `search(${lo},${hi})`, line: 1 }); return -1; }
        const mid = Math.floor((lo + hi) / 2);
        if (arr[mid] === target) { events.push({ type: 'return', id, ret: mid, label: `search(${lo},${hi})`, line: 3 }); return mid; }
        let ret;
        if (arr[mid] < target) ret = search(mid + 1, hi, id, depth + 1);
        else ret = search(lo, mid - 1, id, depth + 1);
        events.push({ type: 'return', id, ret, label: `search(${lo},${hi})`, line: 4 });
        return ret;
      })(0, arr.length - 1, null, 0);
      ws.explainBox.textContent = `Searching in array [${arr.join(', ')}]`;

    } else if (state.mode === 'mergetree') {
      if (n > 12) { toast('Keep n ≤ 12 to keep the tree readable', 'error'); return; }
      (function ms(l, r, parent, depth) {
        const id = idc++;
        events.push({ type: 'call', id, parent, label: `sort(${l},${r})`, depth, line: 0 });
        if (l >= r) { events.push({ type: 'return', id, ret: 'leaf', label: `sort(${l},${r})`, line: 1 }); return; }
        const m = Math.floor((l + r) / 2);
        ms(l, m, id, depth + 1);
        ms(m + 1, r, id, depth + 1);
        events.push({ type: 'return', id, ret: 'merged', label: `sort(${l},${r})`, line: 5 });
      })(0, n - 1, null, 0);
    }

    const steps = buildFromTrace(events);
    ws.player.load(steps);
    ws.enableTransport();
    ws.player.play();
  }

  return { render };
})();
