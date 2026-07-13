/* ==========================================================================
   SEARCHING VISUALIZER
   ========================================================================== */

const SearchingModule = (() => {
  const { el, $, $$, randomUnique, toast } = Utils;

  const PSEUDOCODE = {
    linear: [
      'for i in 0..n-1:',
      '  if arr[i] == target:',
      '    return i',
      'return -1'
    ],
    binary: [
      'lo = 0; hi = n-1',
      'while lo <= hi:',
      '  mid = (lo+hi)/2',
      '  if arr[mid] == target: return mid',
      '  elif arr[mid] < target: lo = mid+1',
      '  else: hi = mid-1',
      'return -1'
    ]
  };
  const META = {
    linear: { best: 'O(1)', avg: 'O(n)', worst: 'O(n)', space: 'O(1)',
      applications: ['Unsorted or small lists', 'Searching linked lists'],
      advantages: ['Works on unsorted data', 'Simple to implement'],
      disadvantages: ['Slow for large datasets'] },
    binary: { best: 'O(1)', avg: 'O(log n)', worst: 'O(log n)', space: 'O(1)',
      applications: ['Dictionary / index lookups', 'Finding insertion points', 'Database indexing'],
      advantages: ['Very fast on sorted data', 'Predictable performance'],
      disadvantages: ['Requires sorted input', 'Not ideal for frequently-changing data'] }
  };

  let ws, state;
  let cellEls = [];

  function drawArray(arr) {
    ws.stage.innerHTML = '';
    const wrap = el('div', { class: 'array-row', style: 'padding-top:6px;padding-bottom:20px;' });
    cellEls = arr.map((v, i) => {
      const cell = el('div', { class: 'array-cell', text: v }, [el('span', { class: 'idx', text: i })]);
      wrap.appendChild(cell);
      return cell;
    });
    ws.stage.appendChild(wrap);
  }

  function clearCellClasses() { cellEls.forEach(c => { c.className = 'array-cell'; c.removeAttribute('data-ptr'); }); }

  function mountControls() {
    const sizeVal = el('span', { class: 'value', text: '16' });
    const sizeRange = el('input', { type: 'range', min: '5', max: '40', value: '16' });
    const algoSelect = el('select', {}, [
      el('option', { value: 'linear', text: 'Linear Search' }),
      el('option', { value: 'binary', text: 'Binary Search' })
    ]);
    const targetInput = el('input', { type: 'text', placeholder: 'target value', style: 'max-width:120px' });
    const customInput = el('input', { type: 'text', placeholder: 'e.g. 3,7,12,19,25' });

    const extra = el('div', { style: 'display:flex; flex-wrap:wrap; gap:14px; align-items:flex-end;' }, [
      el('div', { class: 'field', style: 'min-width:170px' }, [el('label', {}, [document.createTextNode('Algorithm')]), el('div', { class: 'select-wrap' }, [algoSelect])]),
      el('div', { class: 'field', style: 'min-width:140px' }, [el('label', {}, [document.createTextNode('Array Size'), sizeVal]), sizeRange]),
      el('div', { class: 'field' }, [el('label', {}, [document.createTextNode('Target')]), targetInput]),
      el('div', { class: 'field', style: 'flex:1; min-width:220px' }, [
        el('label', {}, [document.createTextNode('Custom Input (comma separated)')]),
        el('div', { style: 'display:flex; gap:8px' }, [customInput, el('button', { class: 'btn btn-sm', text: 'Apply', onclick: () => applyCustom(customInput.value) })])
      ]),
      el('button', { class: 'btn btn-sm', text: '🎲 Random Data', onclick: () => generate(Number(sizeRange.value)) })
    ]);
    sizeRange.addEventListener('input', () => sizeVal.textContent = sizeRange.value);
    algoSelect.addEventListener('change', () => { state.algo = algoSelect.value; refreshInfo(); });
    return { extra, sizeRange, algoSelect, targetInput };
  }

  function refreshInfo() {
    const meta = META[state.algo];
    ws.setPseudocode(PSEUDOCODE[state.algo]);
    const complexityPanel = ws.panels.complexity; complexityPanel.innerHTML = '';
    const rows = [['Best', meta.best], ['Average', meta.avg], ['Worst', meta.worst]];
    complexityPanel.appendChild(el('table', { class: 'complexity-table' }, [
      el('thead', {}, [el('tr', {}, [el('th', { text: 'Case' }), el('th', { text: 'Time' })])]),
      el('tbody', {}, rows.map(r => el('tr', {}, [el('td', { text: r[0] }), el('td', { class: 'mono', text: r[1] })])))
    ]));
    complexityPanel.appendChild(el('p', {}, [document.createTextNode('Space complexity: '), el('span', { class: 'mono', style: 'color:var(--accent-2)', text: meta.space })]));
    if (state.algo === 'binary') complexityPanel.appendChild(el('p', { style: 'color:var(--accent);font-size:12px' }, [document.createTextNode('⚠ Requires a sorted array — data is auto-sorted for you.')]));

    const notesPanel = ws.panels.notes; notesPanel.innerHTML = '';
    const block = (title, items) => el('div', { style: 'margin-bottom:12px' }, [
      el('h4', { style: 'font-size:12px;color:var(--text-faint);text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px', text: title }),
      el('ul', { class: 'info-list' }, items.map(i => el('li', { text: i })))
    ]);
    notesPanel.appendChild(block('Applications', meta.applications));
    notesPanel.appendChild(block('Advantages', meta.advantages));
    notesPanel.appendChild(block('Disadvantages', meta.disadvantages));
  }

  function applyCustom(text) {
    let nums = text.split(',').map(s => Number(s.trim())).filter(n => !isNaN(n));
    if (!nums.length) { toast('Enter valid comma-separated numbers', 'error'); return; }
    if (state.algo === 'binary') nums = nums.sort((a, b) => a - b);
    state.array = nums;
    drawArray(nums);
    ws.player.load([]);
  }

  function generate(size) {
    let arr = randomUnique(size, 1, 99);
    if (state.algo === 'binary') arr = arr.sort((a, b) => a - b);
    state.array = arr;
    drawArray(arr);
    ws.player.load([]);
    ws.setCounters({ comparisons: 0, visited: 0, timer: 0 });
    ws.explainBox.textContent = `Generated ${size} values. Enter a target and press Start.`;
  }

  function render(view) {
    const controls = mountControls();
    ws = Workspace.build(view, {
      title: 'Searching Visualizer',
      description: 'Trace how linear and binary search hunt for a target value, step by step.',
      statChips: [{ key: 'comparisons', label: 'Comparisons' }, { key: 'visited', label: 'Visited' }, { key: 'timer', label: 'Elapsed' }],
      pseudocode: PSEUDOCODE.linear,
      complexity: META.linear,
      applications: META.linear.applications, advantages: META.linear.advantages, disadvantages: META.linear.disadvantages,
      extraControls: controls.extra,
      legend: [
        { color: 'var(--accent)', label: 'Current' },
        { color: 'var(--accent-2)', label: 'Visited' },
        { color: 'var(--success)', label: 'Found' },
        { color: 'var(--surface-3)', label: 'Excluded' }
      ]
    });
    state = { algo: 'linear', array: [], controls };
    refreshInfo();
    generate(16);

    ws.startBtn.addEventListener('click', () => {
      if (ws.player.index > 0 && ws.player.index < ws.player.total - 1) { ws.player.play(); return; }
      startRun(controls.targetInput.value);
    });
  }

  function startRun(targetStr) {
    const target = Number(targetStr);
    if (targetStr === '' || isNaN(target)) { toast('Enter a numeric target value', 'error'); return; }
    const a = state.array;
    let comparisons = 0, visited = 0;
    const steps = [];
    const push = (desc, line, renderFn) => steps.push({
      desc, line, counters: { comparisons, visited, timer: steps.length },
      render: () => { clearCellClasses(); renderFn && renderFn(); }
    });

    if (state.algo === 'linear') {
      let found = -1;
      for (let i = 0; i < a.length; i++) {
        comparisons++; visited++;
        push(`Check index ${i}: a[${i}]=${a[i]} vs target ${target}`, 1, () => {
          for (let k = 0; k < i; k++) cellEls[k].classList.add('visited');
          cellEls[i].classList.add('active');
        });
        if (a[i] === target) { found = i; break; }
      }
      if (found >= 0) push(`Found target ${target} at index ${found}!`, 2, () => { cellEls[found].classList.add('found'); });
      else push(`Target ${target} not found in array.`, 3, () => { a.forEach((_, k) => cellEls[k].classList.add('visited')); });
    } else {
      let lo = 0, hi = a.length - 1, found = -1;
      push(`Initialize lo=0, hi=${hi}`, 0, () => {});
      while (lo <= hi) {
        const mid = Math.floor((lo + hi) / 2);
        visited++;
        push(`mid = (${lo}+${hi})/2 = ${mid} → a[${mid}]=${a[mid]}`, 2, () => {
          for (let k = 0; k < lo; k++) cellEls[k].classList.add('excluded');
          for (let k = hi + 1; k < a.length; k++) cellEls[k].classList.add('excluded');
          cellEls[mid].classList.add('active');
          cellEls[lo].setAttribute('data-ptr', 'lo'); cellEls[lo].classList.add('pointer-l');
          cellEls[hi].setAttribute('data-ptr', 'hi'); cellEls[hi].classList.add('pointer-r');
        });
        comparisons++;
        if (a[mid] === target) { found = mid; break; }
        else if (a[mid] < target) {
          push(`a[${mid}]=${a[mid]} < target → search right half`, 4, () => { cellEls[mid].classList.add('visited'); });
          lo = mid + 1;
        } else {
          push(`a[${mid}]=${a[mid]} > target → search left half`, 5, () => { cellEls[mid].classList.add('visited'); });
          hi = mid - 1;
        }
      }
      if (found >= 0) push(`Found target ${target} at index ${found}!`, 3, () => { cellEls[found].classList.add('found'); });
      else push(`Target ${target} not found — search space exhausted.`, 6, () => { a.forEach((_, k) => cellEls[k].classList.add('excluded')); });
    }

    ws.player.load(steps);
    ws.enableTransport();
    ws.player.play();
  }

  return { render };
})();
