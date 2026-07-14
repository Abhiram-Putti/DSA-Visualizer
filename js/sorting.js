/* ==========================================================================
   SORTING VISUALIZER
   ========================================================================== */

const SortingModule = (() => {
  const { el, $, $$, randomArray, toast } = Utils;

  const PSEUDOCODE = {
    bubble: [
      'for i in 0..n-1:',
      '  for j in 0..n-i-2:',
      '    if arr[j] > arr[j+1]:',
      '      swap(arr[j], arr[j+1])',
      'return arr'
    ],
    selection: [
      'for i in 0..n-1:',
      '  min = i',
      '  for j in i+1..n-1:',
      '    if arr[j] < arr[min]: min = j',
      '  swap(arr[i], arr[min])',
      'return arr'
    ],
    insertion: [
      'for i in 1..n-1:',
      '  key = arr[i]; j = i-1',
      '  while j>=0 and arr[j]>key:',
      '    arr[j+1] = arr[j]; j--',
      '  arr[j+1] = key',
      'return arr'
    ],
    merge: [
      'mergeSort(arr, l, r):',
      '  if l >= r: return',
      '  m = (l+r)/2',
      '  mergeSort(l, m); mergeSort(m+1, r)',
      '  merge(l, m, r)'
    ],
    quick: [
      'quickSort(arr, lo, hi):',
      '  if lo >= hi: return',
      '  p = partition(arr, lo, hi)',
      '  quickSort(lo, p-1)',
      '  quickSort(p+1, hi)'
    ],
    heap: [
      'buildMaxHeap(arr)',
      'for end in n-1..1:',
      '  swap(arr[0], arr[end])',
      '  heapify(arr, 0, end)',
      'return arr'
    ],
    shell: [
      'gap = n/2',
      'while gap > 0:',
      '  for i in gap..n-1:',
      '    temp = arr[i]; j = i',
      '    while j>=gap and arr[j-gap]>temp:',
      '      arr[j]=arr[j-gap]; j-=gap',
      '    arr[j] = temp',
      '  gap /= 2'
    ],
    counting: [
      'count = array of zeros(max+1)',
      'for x in arr: count[x]++',
      'for i in 1..max: count[i]+=count[i-1]',
      'for x in arr (reverse):',
      '  output[--count[x]] = x'
    ]
  };

  const ALGO_META = {
    bubble: { name: 'Bubble Sort', best: 'O(n)', avg: 'O(n²)', worst: 'O(n²)', space: 'O(1)',
      applications: ['Teaching basic sorting concepts', 'Detecting near-sorted data (few swaps)'],
      advantages: ['Simple to implement', 'Stable sort', 'No extra memory'],
      disadvantages: ['Very slow on large inputs', 'O(n²) comparisons even when nearly sorted (without early-exit)'] },
    selection: { name: 'Selection Sort', best: 'O(n²)', avg: 'O(n²)', worst: 'O(n²)', space: 'O(1)',
      applications: ['Small lists', 'When memory writes are costly (minimizes swaps)'],
      advantages: ['Simple', 'Minimizes number of swaps (O(n))'],
      disadvantages: ['O(n²) always, even if sorted', 'Not stable in naive form'] },
    insertion: { name: 'Insertion Sort', best: 'O(n)', avg: 'O(n²)', worst: 'O(n²)', space: 'O(1)',
      applications: ['Small or nearly-sorted datasets', 'Online sorting (data arriving one at a time)'],
      advantages: ['Efficient for small/near-sorted input', 'Stable', 'In-place'],
      disadvantages: ['Quadratic on large random data'] },
    merge: { name: 'Merge Sort', best: 'O(n log n)', avg: 'O(n log n)', worst: 'O(n log n)', space: 'O(n)',
      applications: ['External sorting', 'Stable sorting of linked lists', 'Inversion counting'],
      advantages: ['Guaranteed O(n log n)', 'Stable'],
      disadvantages: ['Requires O(n) extra space', 'Slower constant factor than quicksort in practice'] },
    quick: { name: 'Quick Sort', best: 'O(n log n)', avg: 'O(n log n)', worst: 'O(n²)', space: 'O(log n)',
      applications: ['General-purpose in-memory sorting', 'Language standard library sorts'],
      advantages: ['Very fast in practice', 'In-place (low memory)'],
      disadvantages: ['Worst case O(n²) on bad pivots', 'Not stable'] },
    heap: { name: 'Heap Sort', best: 'O(n log n)', avg: 'O(n log n)', worst: 'O(n log n)', space: 'O(1)',
      applications: ['Priority queues', 'Memory-constrained sorting with guaranteed bounds'],
      advantages: ['In-place', 'Guaranteed O(n log n)'],
      disadvantages: ['Not stable', 'Poor cache locality vs quicksort'] },
    shell: { name: 'Shell Sort', best: 'O(n log n)', avg: 'O(n^1.3)', worst: 'O(n²)', space: 'O(1)',
      applications: ['Embedded systems with tight memory', 'Medium-sized arrays'],
      advantages: ['Better than insertion sort in practice', 'In-place'],
      disadvantages: ['Complexity depends heavily on gap sequence', 'Not stable'] },
    counting: { name: 'Counting Sort', best: 'O(n+k)', avg: 'O(n+k)', worst: 'O(n+k)', space: 'O(n+k)',
      applications: ['Sorting integers in a known small range', 'Sub-routine of radix sort'],
      advantages: ['Linear time for bounded integer ranges', 'Stable'],
      disadvantages: ['Only works on integers/discrete keys', 'Wastes memory for large ranges'] }
  };

  let state = null;

  function mountControls() {
    const sizeVal = el('span', { class: 'value', text: '30' });
    const sizeRange = el('input', { type: 'range', min: '6', max: '80', value: '30' });
    const algoSelect = el('select', {}, Object.entries(ALGO_META).map(([k, v]) => el('option', { value: k, text: v.name })));
    const customInput = el('input', { type: 'text', placeholder: 'e.g. 42, 8, 15, 4, 23' });

    const extra = el('div', { style: 'display:flex; flex-wrap:wrap; gap:14px; align-items:flex-end;' }, [
      el('div', { class: 'field', style: 'min-width:170px;' }, [
        el('label', {}, [document.createTextNode('Algorithm')]),
        el('div', { class: 'select-wrap' }, [algoSelect])
      ]),
      el('div', { class: 'field', style: 'min-width:150px;' }, [
        el('label', {}, [document.createTextNode('Array Size'), sizeVal]),
        sizeRange
      ]),
      el('div', { class: 'field', style: 'flex:1; min-width:220px;' }, [
        el('label', {}, [document.createTextNode('Custom Input (comma separated)')]),
        el('div', { style: 'display:flex; gap:8px;' }, [
          customInput,
          el('button', { class: 'btn btn-sm', text: 'Apply' , onclick: () => applyCustom(customInput.value) })
        ])
      ]),
      el('button', { class: 'btn btn-sm', text: '🎲 Random Data', onclick: () => generate(Number(sizeRange.value)) })
    ]);

    sizeRange.addEventListener('input', () => { sizeVal.textContent = sizeRange.value; });
    algoSelect.addEventListener('change', () => { state.algo = algoSelect.value; refreshInfo(); });

    return { extra, sizeRange, algoSelect };
  }

  function refreshInfo() {
    const meta = ALGO_META[state.algo];
    ws.setPseudocode(PSEUDOCODE[state.algo]);
    // Rebuild the Complexity / Notes tab contents for the newly selected algorithm.
    const complexityPanel = ws.panels.complexity;
    complexityPanel.innerHTML = '';
    const rows = [['Best', meta.best], ['Average', meta.avg], ['Worst', meta.worst]];
    const tbl = el('table', { class: 'complexity-table' }, [
      el('thead', {}, [el('tr', {}, [el('th', { text: 'Case' }), el('th', { text: 'Time' })])]),
      el('tbody', {}, rows.map(r => el('tr', {}, [el('td', { text: r[0] }), el('td', { class: 'mono', text: r[1] })])))
    ]);
    complexityPanel.appendChild(tbl);
    complexityPanel.appendChild(el('p', {}, [document.createTextNode('Space complexity: '), el('span', { class: 'mono', style: 'color:var(--accent-2)', text: meta.space })]));

    const notesPanel = ws.panels.notes;
    notesPanel.innerHTML = '';
    const block = (title, items) => el('div', { style: 'margin-bottom:12px' }, [
      el('h4', { style: 'font-size:12px;color:var(--text-faint);text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px;', text: title }),
      el('ul', { class: 'info-list' }, items.map(i => el('li', { text: i })))
    ]);
    notesPanel.appendChild(block('Applications', meta.applications));
    notesPanel.appendChild(block('Advantages', meta.advantages));
    notesPanel.appendChild(block('Disadvantages', meta.disadvantages));
  }

  let ws;

  function render(view) {
    const controls = mountControls();
    ws = Workspace.build(view, {
      title: 'Sorting Visualizer',
      description: 'Watch classic sorting algorithms rearrange data element by element, with every comparison and swap tracked live.',
      statChips: [{ key: 'comparisons', label: 'Comparisons' }, { key: 'swaps', label: 'Swaps' }, { key: 'timer', label: 'Elapsed' }],
      pseudocode: PSEUDOCODE.bubble,
      complexity: { best: ALGO_META.bubble.best, avg: ALGO_META.bubble.avg, worst: ALGO_META.bubble.worst, space: ALGO_META.bubble.space },
      applications: ALGO_META.bubble.applications,
      advantages: ALGO_META.bubble.advantages,
      disadvantages: ALGO_META.bubble.disadvantages,
      extraControls: controls.extra,
      legend: [
        { color: 'var(--surface-3)', label: 'Unsorted' },
        { color: 'var(--compare-lo)', label: 'Comparing · smaller' },
        { color: 'var(--compare-hi)', label: 'Comparing · larger' },
        { color: 'var(--danger)', label: 'Swapping' },
        { color: 'var(--accent-3)', label: 'Pivot' },
        { color: 'var(--accent-2)', label: 'Sorted' }
      ]
    });

    state = { algo: 'bubble', array: randomArray(30, 8, 100), controls };
    refreshInfo();
    generate(30);

    ws.startBtn.addEventListener('click', () => {
      if (ws.player.index > 0 && ws.player.index < ws.player.total - 1) { ws.player.play(); return; }
      startRun();
    });
  }

  function applyCustom(text) {
    const nums = text.split(',').map(s => Number(s.trim())).filter(n => !isNaN(n));
    if (!nums.length) { toast('Enter valid comma-separated numbers', 'error'); return; }
    if (nums.length > 100) { toast('Max 100 values', 'error'); return; }
    state.array = nums;
    drawBars(state.array);
    ws.player.load([]);
    ws.explainBox.textContent = `Custom array loaded (${nums.length} values). Press Start.`;
  }

  function generate(size) {
    state.array = randomArray(size, 8, 100);
    drawBars(state.array);
    ws.player.load([]);
    ws.explainBox.textContent = `Generated ${size} random values. Press Start to sort.`;
    ws.setCounters({ comparisons: 0, swaps: 0, timer: 0 });
  }

  let barEls = [];
  function drawBars(arr) {
    ws.stage.innerHTML = '';
    const max = Math.max(...arr, 1);
    const wrap = el('div', { class: 'bars-wrap' });
    barEls = arr.map(v => {
      const bar = el('div', { class: 'bar', style: `height:${(v / max) * 100}%` }, [
        el('span', { class: 'bar-label', text: v })
      ]);
      wrap.appendChild(bar);
      return bar;
    });
    ws.stage.appendChild(wrap);
  }

  function setBarValue(i, v, max) {
    if (!barEls[i]) return;
    barEls[i].style.height = `${(v / max) * 100}%`;
    barEls[i].querySelector('.bar-label').textContent = v;
  }

  function clearBarClasses() { barEls.forEach(b => b.classList.remove('compare', 'compare-lo', 'compare-hi', 'swap', 'sorted', 'pivot', 'current')); }

  /* Color a comparison by *outcome*, not just by "something is being looked at":
     the smaller of the two values lights up blue, the larger lights up amber, so
     you can see which way the comparison resolved without reading the numbers. */
  function markCompare(i, j, valI, valJ) {
    if (!barEls[i] || !barEls[j]) return;
    if (valI === valJ) { barEls[i].classList.add('compare'); barEls[j].classList.add('compare'); return; }
    const [loIdx, hiIdx] = valI < valJ ? [i, j] : [j, i];
    barEls[loIdx].classList.add('compare-lo');
    barEls[hiIdx].classList.add('compare-hi');
  }

  function startRun() {
    const arr = state.array.slice();
    const max = Math.max(...arr, 1);
    let comparisons = 0, swaps = 0;
    const steps = [];

    const push = (desc, line, extra, renderFn) => {
      steps.push({
        desc, line,
        counters: { comparisons, swaps, timer: steps.length * 1 },
        render: () => { clearBarClasses(); renderFn && renderFn(); }
      });
    };

    const algo = state.algo;
    const a = arr.slice();

    if (algo === 'bubble') {
      const sorted = new Set();
      for (let i = 0; i < a.length; i++) {
        for (let j = 0; j < a.length - i - 1; j++) {
          comparisons++;
          push(`Compare a[${j}]=${a[j]} and a[${j + 1}]=${a[j + 1]}`, 2, {}, () => {
            markCompare(j, j + 1, a[j], a[j + 1]);
            sorted.forEach(s => barEls[s].classList.add('sorted'));
          });
          if (a[j] > a[j + 1]) {
            [a[j], a[j + 1]] = [a[j + 1], a[j]]; swaps++;
            push(`Swap a[${j}] and a[${j + 1}]`, 3, {}, () => {
              barEls[j].classList.add('swap'); barEls[j + 1].classList.add('swap');
              setBarValue(j, a[j], max); setBarValue(j + 1, a[j + 1], max);
              sorted.forEach(s => barEls[s].classList.add('sorted'));
            });
          }
        }
        sorted.add(a.length - i - 1);
      }
      push('Array fully sorted.', 4, {}, () => sorted.forEach(s => barEls[s].classList.add('sorted')));

    } else if (algo === 'selection') {
      const sorted = new Set();
      for (let i = 0; i < a.length; i++) {
        let min = i;
        push(`Assume a[${i}]=${a[i]} is minimum`, 1, {}, () => { barEls[i].classList.add('current'); sorted.forEach(s => barEls[s].classList.add('sorted')); });
        for (let j = i + 1; j < a.length; j++) {
          comparisons++;
          push(`Compare a[${j}]=${a[j]} with current min a[${min}]=${a[min]}`, 3, {}, () => {
            markCompare(j, min, a[j], a[min]);
            sorted.forEach(s => barEls[s].classList.add('sorted'));
          });
          if (a[j] < a[min]) min = j;
        }
        if (min !== i) {
          [a[i], a[min]] = [a[min], a[i]]; swaps++;
          push(`Swap a[${i}] and a[${min}]`, 4, {}, () => {
            setBarValue(i, a[i], max); setBarValue(min, a[min], max);
            barEls[i].classList.add('swap'); barEls[min].classList.add('swap');
            sorted.forEach(s => barEls[s].classList.add('sorted'));
          });
        }
        sorted.add(i);
      }
      push('Array fully sorted.', 5, {}, () => sorted.forEach(s => barEls[s].classList.add('sorted')));

    } else if (algo === 'insertion') {
      push('a[0] is trivially sorted', 0, {}, () => barEls[0].classList.add('sorted'));
      for (let i = 1; i < a.length; i++) {
        let key = a[i], j = i - 1;
        push(`Pick key = a[${i}]=${key}`, 1, {}, () => { barEls[i].classList.add('current'); for (let s = 0; s < i; s++) barEls[s].classList.add('sorted'); });
        while (j >= 0 && a[j] > key) {
          comparisons++;
          push(`a[${j}]=${a[j]} > key(${key}) → shift right`, 2, {}, () => { barEls[j].classList.add(a[j] > key ? 'compare-hi' : 'compare-lo'); barEls[j + 1].classList.add('swap'); });
          a[j + 1] = a[j]; setBarValue(j + 1, a[j + 1], max);
          j--; swaps++;
        }
        a[j + 1] = key; setBarValue(j + 1, key, max);
        push(`Insert key at position ${j + 1}`, 4, {}, () => { for (let s = 0; s <= i; s++) barEls[s].classList.add('sorted'); });
      }
      push('Array fully sorted.', 4, {}, () => a.forEach((_, s) => barEls[s].classList.add('sorted')));

    } else if (algo === 'merge') {
      function mergeSortSteps(lo, hi) {
        if (lo >= hi) return;
        const mid = Math.floor((lo + hi) / 2);
        push(`mergeSort(${lo}, ${hi}) → split at ${mid}`, 2, {}, () => { for (let k = lo; k <= hi; k++) barEls[k].classList.add('current'); });
        mergeSortSteps(lo, mid);
        mergeSortSteps(mid + 1, hi);
        const left = a.slice(lo, mid + 1), right = a.slice(mid + 1, hi + 1);
        let i = 0, j = 0, k = lo;
        while (i < left.length && j < right.length) {
          comparisons++;
          push(`Merge: compare ${left[i]} and ${right[j]}`, 4, {}, () => { markCompare(lo + i, mid + 1 + j, left[i], right[j]); });
          if (left[i] <= right[j]) { a[k] = left[i]; i++; } else { a[k] = right[j]; j++; }
          setBarValue(k, a[k], max); swaps++; k++;
        }
        while (i < left.length) { a[k] = left[i]; setBarValue(k, a[k], max); i++; k++; }
        while (j < right.length) { a[k] = right[j]; setBarValue(k, a[k], max); j++; k++; }
        push(`Merged range [${lo}, ${hi}] = [${a.slice(lo, hi + 1).join(', ')}]`, 4, {}, () => { for (let s = lo; s <= hi; s++) barEls[s].classList.add('sorted'); });
      }
      mergeSortSteps(0, a.length - 1);
      push('Array fully sorted.', 4, {}, () => a.forEach((_, s) => barEls[s].classList.add('sorted')));

    } else if (algo === 'quick') {
      function partition(lo, hi) {
        const pivot = a[hi];
        push(`Choose pivot a[${hi}]=${pivot}`, 2, {}, () => barEls[hi].classList.add('pivot'));
        let i = lo - 1;
        for (let j = lo; j < hi; j++) {
          comparisons++;
          push(`Compare a[${j}]=${a[j]} with pivot ${pivot}`, 2, {}, () => { markCompare(j, hi, a[j], pivot); barEls[hi].classList.add('pivot'); });
          if (a[j] < pivot) {
            i++;
            [a[i], a[j]] = [a[j], a[i]]; swaps++;
            push(`Swap a[${i}] and a[${j}]`, 2, {}, () => { setBarValue(i, a[i], max); setBarValue(j, a[j], max); barEls[i].classList.add('swap'); barEls[j].classList.add('swap'); });
          }
        }
        [a[i + 1], a[hi]] = [a[hi], a[i + 1]]; swaps++;
        setBarValue(i + 1, a[i + 1], max); setBarValue(hi, a[hi], max);
        push(`Place pivot at index ${i + 1}`, 3, {}, () => barEls[i + 1].classList.add('sorted'));
        return i + 1;
      }
      function quickSortSteps(lo, hi) {
        if (lo >= hi) { if (lo === hi) push(`Single element a[${lo}] is sorted`, 1, {}, () => barEls[lo].classList.add('sorted')); return; }
        const p = partition(lo, hi);
        quickSortSteps(lo, p - 1);
        quickSortSteps(p + 1, hi);
      }
      quickSortSteps(0, a.length - 1);
      push('Array fully sorted.', 4, {}, () => a.forEach((_, s) => barEls[s].classList.add('sorted')));

    } else if (algo === 'heap') {
      const n = a.length;
      function heapify(size, root) {
        let largest = root, l = 2 * root + 1, r = 2 * root + 2;
        push(`Heapify at root ${root}`, 3, {}, () => barEls[root].classList.add('current'));
        if (l < size) { comparisons++; if (a[l] > a[largest]) largest = l; }
        if (r < size) { comparisons++; if (a[r] > a[largest]) largest = r; }
        if (largest !== root) {
          [a[root], a[largest]] = [a[largest], a[root]]; swaps++;
          setBarValue(root, a[root], max); setBarValue(largest, a[largest], max);
          push(`Swap a[${root}] and a[${largest}] to restore heap`, 3, {}, () => { barEls[root].classList.add('swap'); barEls[largest].classList.add('swap'); });
          heapify(size, largest);
        }
      }
      push('Build max heap', 0, {}, () => {});
      for (let i = Math.floor(n / 2) - 1; i >= 0; i--) heapify(n, i);
      for (let end = n - 1; end > 0; end--) {
        [a[0], a[end]] = [a[end], a[0]]; swaps++;
        setBarValue(0, a[0], max); setBarValue(end, a[end], max);
        push(`Move max to end (index ${end})`, 2, {}, () => barEls[end].classList.add('sorted'));
        heapify(end, 0);
      }
      push('Array fully sorted.', 3, {}, () => a.forEach((_, s) => barEls[s].classList.add('sorted')));

    } else if (algo === 'shell') {
      let gap = Math.floor(a.length / 2);
      push(`Start with gap = ${gap}`, 0, {}, () => {});
      while (gap > 0) {
        for (let i = gap; i < a.length; i++) {
          let temp = a[i], j = i;
          push(`Gap ${gap}: consider a[${i}]=${temp}`, 3, {}, () => barEls[i].classList.add('current'));
          while (j >= gap && a[j - gap] > temp) {
            comparisons++;
            a[j] = a[j - gap]; setBarValue(j, a[j], max); swaps++;
            push(`Shift a[${j - gap}] into position ${j}`, 5, {}, () => { barEls[j].classList.add('swap'); barEls[j - gap].classList.add('compare-hi'); });
            j -= gap;
          }
          a[j] = temp; setBarValue(j, temp, max);
        }
        push(`Reduce gap to ${Math.floor(gap / 2)}`, 7, {}, () => {});
        gap = Math.floor(gap / 2);
      }
      push('Array fully sorted.', 7, {}, () => a.forEach((_, s) => barEls[s].classList.add('sorted')));

    } else if (algo === 'counting') {
      const maxVal = Math.max(...a);
      const count = new Array(maxVal + 1).fill(0);
      push('Initialize count array of zeros', 0, {}, () => {});
      for (let i = 0; i < a.length; i++) { count[a[i]]++; push(`count[${a[i]}]++`, 1, {}, () => barEls[i].classList.add('current')); }
      for (let i = 1; i <= maxVal; i++) count[i] += count[i - 1];
      push('Build prefix sum of counts', 2, {}, () => {});
      const output = new Array(a.length);
      for (let i = a.length - 1; i >= 0; i--) {
        output[--count[a[i]]] = a[i]; swaps++;
        push(`Place ${a[i]} at output[${count[a[i]]}]`, 4, {}, () => barEls[i].classList.add('compare'));
      }
      for (let i = 0; i < a.length; i++) { a[i] = output[i]; setBarValue(i, a[i], max); }
      push('Array fully sorted.', 4, {}, () => a.forEach((_, s) => barEls[s].classList.add('sorted')));
    }

    state.array = a;
    ws.player.load(steps);
    ws.enableTransport();
    ws.player.play();
  }

  return { render };
})();
