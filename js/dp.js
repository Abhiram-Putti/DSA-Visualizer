/* ==========================================================================
   DYNAMIC PROGRAMMING VISUALIZER — animated table fill for six classics
   ========================================================================== */

const DPModule = (() => {
  const { el, $$, toast } = Utils;

  const PSEUDOCODE = {
    fib: ['dp[0]=0; dp[1]=1', 'for i in 2..n:', '  dp[i] = dp[i-1] + dp[i-2]', 'return dp[n]'],
    knapsack: [
      'for i in 1..n:',
      '  for w in 0..W:',
      '    if wt[i] <= w:',
      '      dp[i][w] = max(dp[i-1][w], val[i]+dp[i-1][w-wt[i]])',
      '    else: dp[i][w] = dp[i-1][w]'
    ],
    lcs: ['for i in 1..n: for j in 1..m:', '  if a[i]==b[j]: dp[i][j]=dp[i-1][j-1]+1', '  else: dp[i][j]=max(dp[i-1][j], dp[i][j-1])'],
    lis: ['dp[i] = 1 for all i', 'for i in 1..n: for j in 0..i-1:', '  if a[j]<a[i]: dp[i]=max(dp[i], dp[j]+1)', 'return max(dp)'],
    coin: ['dp[0]=0; dp[1..amount]=∞', 'for c in coins: for a in c..amount:', '  dp[a] = min(dp[a], dp[a-c]+1)', 'return dp[amount]'],
    mcm: ['dp[i][i]=0', 'for len in 2..n: for i in 1..n-len+1:', '  j=i+len-1; dp[i][j]=min over k of', '  dp[i][k]+dp[k+1][j]+p[i-1]*p[k]*p[j]']
  };
  const META = {
    fib: { best: 'O(n)', avg: 'O(n)', worst: 'O(n)', space: 'O(n)', applications: ['Teaching memoization', 'Sequence generation'], advantages: ['Avoids exponential naive recursion'], disadvantages: ['O(1) space possible but table shown here for clarity'] },
    knapsack: { best: 'O(nW)', avg: 'O(nW)', worst: 'O(nW)', space: 'O(nW)', applications: ['Resource allocation', 'Budgeting problems', 'Cargo loading'], advantages: ['Guarantees optimal solution'], disadvantages: ['Pseudo-polynomial — slow for large weight capacity'] },
    lcs: { best: 'O(nm)', avg: 'O(nm)', worst: 'O(nm)', space: 'O(nm)', applications: ['Diff tools', 'DNA sequence alignment', 'Version control merges'], advantages: ['Finds true longest common subsequence'], disadvantages: ['Quadratic space (reducible to O(min(n,m)))'] },
    lis: { best: 'O(n log n)*', avg: 'O(n²)', worst: 'O(n²)', space: 'O(n)', applications: ['Patience sorting', 'Scheduling problems'], advantages: ['Simple O(n²) DP; O(n log n) with binary search'], disadvantages: ['Naive DP is quadratic'] },
    coin: { best: 'O(amount)', avg: 'O(coins×amount)', worst: 'O(coins×amount)', space: 'O(amount)', applications: ['Currency/change-making', 'Resource-count minimization'], advantages: ['Finds minimum coins guaranteed'], disadvantages: ['Pseudo-polynomial in amount'] },
    mcm: { best: 'O(n³)', avg: 'O(n³)', worst: 'O(n³)', space: 'O(n²)', applications: ['Optimizing chained matrix multiplication order', 'Compiler expression optimization'], advantages: ['Finds globally optimal parenthesization'], disadvantages: ['Cubic time — costly for many matrices'] }
  };

  let ws, state;

  function mountControls() {
    const modeSelect = el('select', {}, Object.entries({
      fib: 'Fibonacci', knapsack: '0/1 Knapsack', lcs: 'Longest Common Subsequence',
      lis: 'Longest Increasing Subsequence', coin: 'Coin Change', mcm: 'Matrix Chain Multiplication'
    }).map(([k, v]) => el('option', { value: k, text: v })));

    const fibN = el('input', { type: 'text', value: '10', style: 'max-width:70px' });
    const kWeights = el('input', { type: 'text', value: '2,3,4,5', style: 'max-width:150px' });
    const kValues = el('input', { type: 'text', value: '3,4,5,6', style: 'max-width:150px' });
    const kCap = el('input', { type: 'text', value: '8', style: 'max-width:70px' });
    const lcsA = el('input', { type: 'text', value: 'ABCBDAB', style: 'max-width:140px' });
    const lcsB = el('input', { type: 'text', value: 'BDCABA', style: 'max-width:140px' });
    const lisArr = el('input', { type: 'text', value: '10,9,2,5,3,7,101,18', style: 'max-width:200px' });
    const coinList = el('input', { type: 'text', value: '1,2,5', style: 'max-width:110px' });
    const coinAmt = el('input', { type: 'text', value: '11', style: 'max-width:70px' });
    const mcmDims = el('input', { type: 'text', value: '40,20,30,10,30', style: 'max-width:180px' });

    const fields = {
      fib: el('div', { class: 'field' }, [el('label', {}, [document.createTextNode('n')]), fibN]),
      knapsack: el('div', { style: 'display:flex;gap:10px' }, [
        el('div', { class: 'field' }, [el('label', {}, [document.createTextNode('Weights')]), kWeights]),
        el('div', { class: 'field' }, [el('label', {}, [document.createTextNode('Values')]), kValues]),
        el('div', { class: 'field' }, [el('label', {}, [document.createTextNode('Capacity')]), kCap])
      ]),
      lcs: el('div', { style: 'display:flex;gap:10px' }, [
        el('div', { class: 'field' }, [el('label', {}, [document.createTextNode('String A')]), lcsA]),
        el('div', { class: 'field' }, [el('label', {}, [document.createTextNode('String B')]), lcsB])
      ]),
      lis: el('div', { class: 'field' }, [el('label', {}, [document.createTextNode('Array')]), lisArr]),
      coin: el('div', { style: 'display:flex;gap:10px' }, [
        el('div', { class: 'field' }, [el('label', {}, [document.createTextNode('Coins')]), coinList]),
        el('div', { class: 'field' }, [el('label', {}, [document.createTextNode('Amount')]), coinAmt])
      ]),
      mcm: el('div', { class: 'field' }, [el('label', {}, [document.createTextNode('Dimensions p0..pn')]), mcmDims])
    };
    const fieldWrap = el('div', {}, [fields.fib]);
    Object.entries(fields).forEach(([k, node]) => { if (k !== 'fib') node.style.display = 'none'; });
    Object.values(fields).slice(1).forEach(node => fieldWrap.appendChild(node));

    const extra = el('div', { style: 'display:flex; flex-direction:column; gap:12px;' }, [
      el('div', { class: 'field', style: 'max-width:260px' }, [el('label', {}, [document.createTextNode('Problem')]), el('div', { class: 'select-wrap' }, [modeSelect])]),
      fieldWrap
    ]);
    modeSelect.addEventListener('change', () => {
      state.mode = modeSelect.value;
      Object.entries(fields).forEach(([k, node]) => node.style.display = k === state.mode ? (k === 'knapsack' || k === 'lcs' || k === 'coin' ? 'flex' : 'block') : 'none');
      refreshInfo();
    });

    return { extra, modeSelect, fibN, kWeights, kValues, kCap, lcsA, lcsB, lisArr, coinList, coinAmt, mcmDims };
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
      title: 'Dynamic Programming Visualizer',
      description: 'Watch the DP table fill in cell by cell for six classic problems.',
      statChips: [{ key: 'cells', label: 'Cells Filled' }, { key: 'result', label: 'Result' }, { key: 'timer', label: 'Step' }],
      pseudocode: PSEUDOCODE.fib,
      complexity: META.fib,
      applications: META.fib.applications, advantages: META.fib.advantages, disadvantages: META.fib.disadvantages,
      extraControls: controls.extra,
      legend: [{ color: 'var(--accent)', label: 'Active cell' }, { color: 'var(--surface-2)', label: 'Filled' }]
    });
    state = { mode: 'fib', c: controls };
    refreshInfo();

    ws.startBtn.addEventListener('click', () => {
      if (ws.player.index > 0 && ws.player.index < ws.player.total - 1) { ws.player.play(); return; }
      run();
    });
  }

  function nums(str) { return str.split(',').map(s => Number(s.trim())).filter(n => !isNaN(n)); }

  function renderTable(rows, cols, get, activeR, activeC, rowLabels, colLabels) {
    const table = el('table', { class: 'dp-table' });
    const head = el('tr', {}, [el('th', {}), ...Array.from({ length: cols }, (_, j) => el('th', { text: colLabels ? colLabels[j] : j }))]);
    table.appendChild(head);
    for (let i = 0; i < rows; i++) {
      const tr = el('tr', {}, [el('th', { text: rowLabels ? rowLabels[i] : i })]);
      for (let j = 0; j < cols; j++) {
        const v = get(i, j);
        const cls = (i === activeR && j === activeC) ? 'active' : (v !== '' && v !== undefined) ? 'filled' : '';
        tr.appendChild(el('td', { class: cls, text: v === undefined ? '' : v }));
      }
      table.appendChild(tr);
    }
    return table;
  }

  function run() {
    const c = state.c;
    const steps = [];
    let cellsFilled = 0;
    const push = (desc, line, renderFn, result) => steps.push({
      desc, line, counters: { cells: cellsFilled, result: result ?? '', timer: steps.length }, render: renderFn
    });

    if (state.mode === 'fib') {
      const n = Utils.clamp(parseInt(c.fibN.value) || 10, 1, 25);
      const dp = new Array(n + 1).fill('');
      dp[0] = 0; if (n >= 1) dp[1] = 1;
      cellsFilled = 2;
      push('Base cases dp[0]=0, dp[1]=1', 0, () => { ws.stage.innerHTML = ''; ws.stage.appendChild(renderTable(1, n + 1, (i, j) => dp[j], -1, 1)); });
      for (let i = 2; i <= n; i++) {
        dp[i] = dp[i - 1] + dp[i - 2]; cellsFilled++;
        push(`dp[${i}] = dp[${i - 1}] + dp[${i - 2}] = ${dp[i]}`, 2, () => { ws.stage.innerHTML = ''; ws.stage.appendChild(renderTable(1, n + 1, (i2, j) => dp[j], -1, i)); }, dp[i]);
      }
      push(`Fibonacci(${n}) = ${dp[n]}`, 3, () => { ws.stage.innerHTML = ''; ws.stage.appendChild(renderTable(1, n + 1, (i, j) => dp[j], -1, n)); }, dp[n]);

    } else if (state.mode === 'knapsack') {
      const wt = nums(c.kWeights.value), val = nums(c.kValues.value), W = Utils.clamp(parseInt(c.kCap.value) || 8, 1, 30);
      const n = Math.min(wt.length, val.length);
      const dp = Array.from({ length: n + 1 }, () => new Array(W + 1).fill(0));
      for (let i = 1; i <= n; i++) {
        for (let w = 0; w <= W; w++) {
          if (wt[i - 1] <= w) { dp[i][w] = Math.max(dp[i - 1][w], val[i - 1] + dp[i - 1][w - wt[i - 1]]); }
          else dp[i][w] = dp[i - 1][w];
          cellsFilled++;
          push(`item ${i} (wt=${wt[i - 1]},val=${val[i - 1]}), cap=${w} → dp=${dp[i][w]}`, wt[i - 1] <= w ? 3 : 4,
            () => { ws.stage.innerHTML = ''; ws.stage.appendChild(renderTable(n + 1, W + 1, (ii, ww) => dp[ii][ww], i, w)); }, dp[n][W]);
        }
      }
      push(`Max value = ${dp[n][W]}`, 0, () => { ws.stage.innerHTML = ''; ws.stage.appendChild(renderTable(n + 1, W + 1, (i, w) => dp[i][w], n, W)); }, dp[n][W]);

    } else if (state.mode === 'lcs') {
      const A = c.lcsA.value.trim(), B = c.lcsB.value.trim();
      const n = A.length, m = B.length;
      const dp = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
      for (let i = 1; i <= n; i++) {
        for (let j = 1; j <= m; j++) {
          if (A[i - 1] === B[j - 1]) dp[i][j] = dp[i - 1][j - 1] + 1;
          else dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
          cellsFilled++;
          push(`${A[i - 1]} vs ${B[j - 1]} → dp[${i}][${j}]=${dp[i][j]}`, A[i - 1] === B[j - 1] ? 1 : 2,
            () => { ws.stage.innerHTML = ''; ws.stage.appendChild(renderTable(n + 1, m + 1, (ii, jj) => dp[ii][jj], i, j, ['', ...A.split('')], ['', ...B.split('')])); }, dp[n][m]);
        }
      }
      push(`LCS length = ${dp[n][m]}`, 0, () => { ws.stage.innerHTML = ''; ws.stage.appendChild(renderTable(n + 1, m + 1, (i, j) => dp[i][j], n, m, ['', ...A.split('')], ['', ...B.split('')])); }, dp[n][m]);

    } else if (state.mode === 'lis') {
      const a = nums(c.lisArr.value);
      const n = a.length;
      const dp = new Array(n).fill(1);
      push('Initialize dp[i]=1 for all i', 0, () => { ws.stage.innerHTML = ''; ws.stage.appendChild(renderTable(1, n, (i, j) => dp[j], -1, -1, [''], a)); });
      for (let i = 1; i < n; i++) {
        for (let j = 0; j < i; j++) {
          if (a[j] < a[i]) { dp[i] = Math.max(dp[i], dp[j] + 1); cellsFilled++; push(`a[${j}]=${a[j]} < a[${i}]=${a[i]} → dp[${i}]=${dp[i]}`, 2, () => { ws.stage.innerHTML = ''; ws.stage.appendChild(renderTable(1, n, (r, col) => dp[col], -1, i, [''], a)); }, Math.max(...dp)); }
        }
      }
      push(`LIS length = ${Math.max(...dp)}`, 0, () => { ws.stage.innerHTML = ''; ws.stage.appendChild(renderTable(1, n, (r, col) => dp[col], -1, -1, [''], a)); }, Math.max(...dp));

    } else if (state.mode === 'coin') {
      const coins = nums(c.coinList.value), amount = Utils.clamp(parseInt(c.coinAmt.value) || 11, 1, 60);
      const dp = new Array(amount + 1).fill(Infinity); dp[0] = 0;
      push('dp[0]=0, rest=∞', 0, () => { ws.stage.innerHTML = ''; ws.stage.appendChild(renderTable(1, amount + 1, (i, j) => dp[j] === Infinity ? '∞' : dp[j], -1, 0)); });
      coins.forEach(coin => {
        for (let a2 = coin; a2 <= amount; a2++) {
          if (dp[a2 - coin] + 1 < dp[a2]) { dp[a2] = dp[a2 - coin] + 1; cellsFilled++;
            push(`coin ${coin}: dp[${a2}] = dp[${a2 - coin}]+1 = ${dp[a2]}`, 2, () => { ws.stage.innerHTML = ''; ws.stage.appendChild(renderTable(1, amount + 1, (i, j) => dp[j] === Infinity ? '∞' : dp[j], -1, a2)); }, dp[amount] === Infinity ? '—' : dp[amount]);
          }
        }
      });
      push(`Min coins for ${amount} = ${dp[amount] === Infinity ? 'impossible' : dp[amount]}`, 0, () => { ws.stage.innerHTML = ''; ws.stage.appendChild(renderTable(1, amount + 1, (i, j) => dp[j] === Infinity ? '∞' : dp[j], -1, amount)); }, dp[amount] === Infinity ? '—' : dp[amount]);

    } else if (state.mode === 'mcm') {
      const p = nums(c.mcmDims.value);
      const n = p.length - 1;
      const dp = Array.from({ length: n + 1 }, () => new Array(n + 1).fill(0));
      push('dp[i][i] = 0 for all i', 0, () => { ws.stage.innerHTML = ''; ws.stage.appendChild(renderTable(n + 1, n + 1, (i, j) => i === 0 || j === 0 ? '' : (i > j ? '' : dp[i][j]), -1, -1)); });
      for (let len = 2; len <= n; len++) {
        for (let i = 1; i <= n - len + 1; i++) {
          const j = i + len - 1;
          dp[i][j] = Infinity;
          for (let k = i; k < j; k++) {
            const cost = dp[i][k] + dp[k + 1][j] + p[i - 1] * p[k] * p[j];
            if (cost < dp[i][j]) dp[i][j] = cost;
          }
          cellsFilled++;
          push(`dp[${i}][${j}] = ${dp[i][j]} (best split found)`, 2, () => { ws.stage.innerHTML = ''; ws.stage.appendChild(renderTable(n + 1, n + 1, (r, cc) => r === 0 || cc === 0 || r > cc ? '' : dp[r][cc], i, j)); }, dp[1][n]);
        }
      }
      push(`Minimum multiplications = ${dp[1][n]}`, 0, () => { ws.stage.innerHTML = ''; ws.stage.appendChild(renderTable(n + 1, n + 1, (r, cc) => r === 0 || cc === 0 || r > cc ? '' : dp[r][cc], 1, n)); }, dp[1][n]);
    }

    ws.player.load(steps);
    ws.enableTransport();
    ws.player.play();
  }

  return { render };
})();
