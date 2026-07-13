/* ==========================================================================
   ARRAY ALGORITHMS VISUALIZER — Two Pointer & Sliding Window techniques
   ========================================================================== */

const ArrayModule = (() => {
  const { el, $$, toast, randomArray } = Utils;

  const PSEUDOCODE = {
    reverse: ['l=0; r=n-1', 'while l < r:', '  swap(a[l], a[r])', '  l++; r--'],
    movezero: ['j=0', 'for i in 0..n-1:', '  if a[i]!=0: swap(a[i],a[j]); j++'],
    container: ['l=0; r=n-1; best=0', 'while l<r:', '  best=max(best, min(h[l],h[r])*(r-l))', '  shorter side moves inward'],
    twosum: ['sort array (index-tracked)', 'l=0; r=n-1', 'while l<r:', '  sum=a[l]+a[r]', '  if sum==target: return', '  elif sum<target: l++ else r--'],
    maxsubarray: ["sum=0; best=-∞ (Kadane's algorithm)", 'for x in arr:', '  sum = max(x, sum+x)', '  best = max(best, sum)'],
    windowsum: ['sum = sum of first k elements', 'best = sum', 'for i in k..n-1:', '  sum += a[i] - a[i-k]', '  best = max(best, sum)'],
    longestsub: ['l=0; seen={}', 'for r in 0..n-1:', '  if a[r] in seen and seen[a[r]]>=l: l=seen[a[r]]+1', '  seen[a[r]]=r; best=max(best, r-l+1)'],
    windowmax: ['deque of indices (decreasing values)', 'for i in 0..n-1:', '  pop front if out of window', '  pop back while a[back]<=a[i]; push i', '  if i>=k-1: result.push(a[front])']
  };
  const META = {
    reverse: { best: 'O(n)', avg: 'O(n)', worst: 'O(n)', space: 'O(1)', applications: ['Palindrome checks', 'In-place transformations'], advantages: ['Constant extra space'], disadvantages: ['Destroys original order'] },
    movezero: { best: 'O(n)', avg: 'O(n)', worst: 'O(n)', space: 'O(1)', applications: ['Data cleanup / compaction', 'Partitioning by predicate'], advantages: ['Single pass, in-place'], disadvantages: ['Not stable for equal non-zero elements unless careful'] },
    container: { best: 'O(n)', avg: 'O(n)', worst: 'O(n)', space: 'O(1)', applications: ['Resource/container capacity problems'], advantages: ['Linear time vs O(n²) brute force'], disadvantages: ['Greedy proof is non-obvious at first glance'] },
    twosum: { best: 'O(n log n)', avg: 'O(n log n)', worst: 'O(n log n)', space: 'O(1)', applications: ['Pair-sum lookups on sorted data'], advantages: ['No extra hashmap memory needed'], disadvantages: ['Requires sorted input (or a sort step)'] },
    maxsubarray: { best: 'O(n)', avg: 'O(n)', worst: 'O(n)', space: 'O(1)', applications: ['Stock profit problems', 'Signal processing'], advantages: ["Kadane's algorithm is optimal linear time"], disadvantages: ['Only tracks sum, not the subarray without extra bookkeeping'] },
    windowsum: { best: 'O(n)', avg: 'O(n)', worst: 'O(n)', space: 'O(1)', applications: ['Moving averages', 'Fixed-size window analytics'], advantages: ['Avoids recomputing the whole window sum'], disadvantages: ['Only works for fixed window size'] },
    longestsub: { best: 'O(n)', avg: 'O(n)', worst: 'O(n)', space: 'O(min(n,charset))', applications: ['Text processing', 'Unique-window problems'], advantages: ['Single pass with a hashmap'], disadvantages: ['Extra memory for the seen-index map'] },
    windowmax: { best: 'O(n)', avg: 'O(n)', worst: 'O(n)', space: 'O(k)', applications: ['Streaming max-in-window analytics', 'Real-time monitoring'], advantages: ['Amortized O(n) via monotonic deque'], disadvantages: ['Deque logic is subtle to implement correctly'] }
  };

  let ws, state, cellEls;

  function drawArray(arr, isChar) {
    ws.stage.innerHTML = '';
    const wrap = el('div', { class: 'array-row', style: 'padding-top:24px; padding-bottom:20px;' });
    cellEls = arr.map((v, i) => {
      const cell = el('div', { class: 'array-cell', text: v }, [el('span', { class: 'idx', text: i })]);
      wrap.appendChild(cell);
      return cell;
    });
    ws.stage.appendChild(wrap);
  }
  function clearCellClasses() { cellEls.forEach(c => { c.className = 'array-cell'; c.removeAttribute('data-ptr'); }); }
  function setPtr(i, label) { if (cellEls[i]) { cellEls[i].setAttribute('data-ptr', label); cellEls[i].classList.add(label === 'L' ? 'pointer-l' : 'pointer-r'); } }

  function mountControls() {
    const modeSelect = el('select', {}, Object.entries({
      reverse: 'Reverse Array', movezero: 'Move Zeroes', container: 'Container With Most Water', twosum: 'Two Sum',
      maxsubarray: 'Maximum Sum Subarray (Kadane)', windowsum: 'Sliding Window (Fixed Sum)',
      longestsub: 'Longest Substring Without Repeating Characters', windowmax: 'Sliding Window Maximum'
    }).map(([k, v]) => el('option', { value: k, text: v })));
    const customInput = el('input', { type: 'text', placeholder: 'comma separated values / string' });
    const targetInput = el('input', { type: 'text', placeholder: 'target', style: 'max-width:100px;display:none' });
    const kInput = el('input', { type: 'text', placeholder: 'window k', style: 'max-width:90px;display:none' });

    const extra = el('div', { style: 'display:flex; flex-wrap:wrap; gap:14px; align-items:flex-end;' }, [
      el('div', { class: 'field', style: 'min-width:230px' }, [el('label', {}, [document.createTextNode('Technique')]), el('div', { class: 'select-wrap' }, [modeSelect])]),
      el('div', { class: 'field', style: 'flex:1; min-width:200px' }, [el('label', {}, [document.createTextNode('Input')]), customInput]),
      el('div', { class: 'field', dataset: { role: 'targetField' } }, [el('label', {}, [document.createTextNode('Target')]), targetInput]),
      el('div', { class: 'field', dataset: { role: 'kField' } }, [el('label', {}, [document.createTextNode('k')]), kInput]),
      el('button', { class: 'btn btn-sm', text: '🎲 Random', onclick: () => randomize() })
    ]);
    modeSelect.addEventListener('change', () => { state.mode = modeSelect.value; syncFields(); refreshInfo(); randomize(); });

    function syncFields() {
      targetInput.style.display = state.mode === 'twosum' ? 'block' : 'none';
      kInput.style.display = (state.mode === 'windowsum' || state.mode === 'windowmax') ? 'block' : 'none';
    }
    return { extra, modeSelect, customInput, targetInput, kInput, syncFields };
  }

  function randomize() {
    const c = state.controls;
    if (state.mode === 'longestsub') { c.customInput.value = 'abcabcbb'; }
    else if (state.mode === 'twosum') { const a = randomArray(8, 1, 20); c.customInput.value = a.join(','); c.targetInput.value = String(a[0] + a[a.length - 1]); }
    else if (state.mode === 'movezero') { c.customInput.value = '0,1,0,3,12,0,5'; }
    else { c.customInput.value = randomArray(10, 1, 30).join(','); }
    if (state.mode === 'windowsum' || state.mode === 'windowmax') c.kInput.value = '3';
    applyInput();
  }

  function applyInput() {
    const c = state.controls;
    const raw = c.customInput.value;
    if (state.mode === 'longestsub') { state.arr = raw.split(''); drawArray(state.arr); }
    else { state.arr = raw.split(',').map(s => Number(s.trim())).filter(n => !isNaN(n)); drawArray(state.arr); }
    ws.player.load([]);
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
      title: 'Array Algorithms Visualizer',
      description: 'Two-pointer and sliding-window techniques for classic array & string problems.',
      statChips: [{ key: 'comparisons', label: 'Comparisons' }, { key: 'result', label: 'Result' }, { key: 'timer', label: 'Step' }],
      pseudocode: PSEUDOCODE.reverse,
      complexity: META.reverse,
      applications: META.reverse.applications, advantages: META.reverse.advantages, disadvantages: META.reverse.disadvantages,
      extraControls: controls.extra,
      legend: [{ color: 'var(--accent)', label: 'Pointer L' }, { color: 'var(--accent-3)', label: 'Pointer R' }, { color: 'var(--accent-2)', label: 'In window / included' }]
    });
    state = { mode: 'reverse', arr: [], controls };
    controls.syncFields();
    refreshInfo();
    randomize();

    ws.startBtn.addEventListener('click', () => {
      if (ws.player.index > 0 && ws.player.index < ws.player.total - 1) { ws.player.play(); return; }
      applyInput();
      startRun();
    });
  }

  function startRun() {
    const a = state.arr.slice();
    const steps = [];
    let comparisons = 0;
    const push = (desc, line, renderFn, result) => steps.push({ desc, line, counters: { comparisons, result: result ?? '', timer: steps.length }, render: () => { clearCellClasses(); renderFn && renderFn(); } });

    if (state.mode === 'reverse') {
      let l = 0, r = a.length - 1;
      while (l < r) {
        comparisons++;
        push(`Swap index ${l} and ${r}`, 2, () => { setPtr(l, 'L'); setPtr(r, 'R'); [a[l], a[r]] = [a[r], a[l]]; cellEls[l].textContent = a[l]; cellEls[r].textContent = a[r]; });
        l++; r--;
      }
      push(`Reversed: [${a.join(', ')}]`, 3, () => {}, a.join(','));

    } else if (state.mode === 'movezero') {
      let j = 0;
      for (let i = 0; i < a.length; i++) {
        comparisons++;
        if (a[i] !== 0) {
          [a[i], a[j]] = [a[j], a[i]];
          push(`a[${i}]≠0 → swap into position ${j}`, 2, () => { setPtr(i, 'L'); setPtr(j, 'R'); cellEls[i].textContent = a[i]; cellEls[j].textContent = a[j]; });
          j++;
        } else {
          push(`a[${i}]=0 → skip`, 2, () => setPtr(i, 'L'));
        }
      }
      push(`Result: [${a.join(', ')}]`, 2, () => {}, a.join(','));

    } else if (state.mode === 'container') {
      let l = 0, r = a.length - 1, best = 0;
      while (l < r) {
        comparisons++;
        const area = Math.min(a[l], a[r]) * (r - l);
        best = Math.max(best, area);
        push(`min(${a[l]},${a[r]})×${r - l} = ${area} → best=${best}`, 2, () => { setPtr(l, 'L'); setPtr(r, 'R'); }, best);
        if (a[l] < a[r]) l++; else r--;
      }
      push(`Max water container = ${best}`, 0, () => {}, best);

    } else if (state.mode === 'twosum') {
      const target = Number(state.controls.targetInput.value);
      const indexed = a.map((v, i) => ({ v, i })).sort((x, y) => x.v - y.v);
      let l = 0, r = indexed.length - 1; let found = null;
      while (l < r) {
        comparisons++;
        const sum = indexed[l].v + indexed[r].v;
        push(`a[${indexed[l].i}]+a[${indexed[r].i}] = ${sum} vs target ${target}`, 3, () => { setPtr(indexed[l].i, 'L'); setPtr(indexed[r].i, 'R'); });
        if (sum === target) { found = [indexed[l].i, indexed[r].i]; break; }
        else if (sum < target) l++; else r--;
      }
      push(found ? `Found pair at indices ${found.join(', ')}!` : 'No pair sums to target.', 0, () => { if (found) { cellEls[found[0]].classList.add('found'); cellEls[found[1]].classList.add('found'); } }, found ? found.join(',') : 'none');

    } else if (state.mode === 'maxsubarray') {
      let sum = 0, best = -Infinity, start = 0, bestL = 0, bestR = 0;
      for (let i = 0; i < a.length; i++) {
        comparisons++;
        if (sum + a[i] < a[i]) { sum = a[i]; start = i; } else sum += a[i];
        if (sum > best) { best = sum; bestL = start; bestR = i; }
        push(`i=${i}: running sum=${sum}, best=${best}`, 2, () => { for (let k = bestL; k <= bestR; k++) cellEls[k].classList.add('visited'); cellEls[i].classList.add('active'); }, best);
      }
      push(`Maximum subarray sum = ${best} (indices ${bestL}-${bestR})`, 0, () => { for (let k = bestL; k <= bestR; k++) cellEls[k].classList.add('found'); }, best);

    } else if (state.mode === 'windowsum') {
      const k = Utils.clamp(parseInt(state.controls.kInput.value) || 3, 1, a.length);
      let sum = 0;
      for (let i = 0; i < k; i++) sum += a[i];
      let best = sum;
      push(`Initial window sum (first ${k}) = ${sum}`, 0, () => { for (let x = 0; x < k; x++) cellEls[x].classList.add('visited'); }, best);
      for (let i = k; i < a.length; i++) {
        comparisons++;
        sum += a[i] - a[i - k];
        best = Math.max(best, sum);
        push(`Slide window: +a[${i}] -a[${i - k}] → sum=${sum}`, 3, () => { for (let x = i - k + 1; x <= i; x++) cellEls[x].classList.add('visited'); cellEls[i].classList.add('active'); }, best);
      }
      push(`Max window sum (k=${k}) = ${best}`, 0, () => {}, best);

    } else if (state.mode === 'longestsub') {
      const seen = new Map();
      let l = 0, best = 0, bestL = 0, bestR = 0;
      for (let r = 0; r < a.length; r++) {
        comparisons++;
        const ch = a[r];
        if (seen.has(ch) && seen.get(ch) >= l) { l = seen.get(ch) + 1; push(`'${ch}' repeats → shrink window, l=${l}`, 2, () => { setPtr(l, 'L'); setPtr(r, 'R'); }); }
        seen.set(ch, r);
        if (r - l + 1 > best) { best = r - l + 1; bestL = l; bestR = r; }
        push(`window [${l},${r}] = "${a.slice(l, r + 1).join('')}" (len ${r - l + 1})`, 3, () => { for (let x = l; x <= r; x++) cellEls[x].classList.add('visited'); setPtr(l, 'L'); setPtr(r, 'R'); }, best);
      }
      push(`Longest substring without repeats = ${best} ("${a.slice(bestL, bestR + 1).join('')}")`, 0, () => { for (let x = bestL; x <= bestR; x++) cellEls[x].classList.add('found'); }, best);

    } else if (state.mode === 'windowmax') {
      const k = Utils.clamp(parseInt(state.controls.kInput.value) || 3, 1, a.length);
      const dq = []; const result = [];
      for (let i = 0; i < a.length; i++) {
        while (dq.length && dq[0] <= i - k) dq.shift();
        while (dq.length && a[dq[dq.length - 1]] <= a[i]) { comparisons++; dq.pop(); }
        dq.push(i);
        if (i >= k - 1) result.push(a[dq[0]]);
        push(`i=${i}: deque indices [${dq.join(',')}] → window max=${a[dq[0]]}`, 3, () => { for (let x = Math.max(0, i - k + 1); x <= i; x++) cellEls[x].classList.add('visited'); cellEls[dq[0]].classList.add('active'); }, result.join(','));
      }
      push(`Sliding window maximums: [${result.join(', ')}]`, 0, () => {}, result.join(','));
    }

    ws.player.load(steps);
    ws.enableTransport();
    ws.player.play();
  }

  return { render };
})();
