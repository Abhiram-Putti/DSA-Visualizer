/* ==========================================================================
   STACK VISUALIZER
   Two modes sharing one workspace:
   - "Interactive": manual push/pop/peek/clear. Every action is recorded as
     a history entry, so Step Back/Forward doubles as an undo/redo trail.
   - "Algorithm Demo": Parentheses Matching and Next Greater Element, played
     back like the sorting/searching modules.
   ========================================================================== */

const StackModule = (() => {
  const { el, $, $$, toast } = Utils;

  const CAPACITY = 8;

  const PSEUDOCODE = {
    interactive: [
      'push(x): if size==capacity: OVERFLOW',
      '         else: top++; arr[top]=x',
      'pop():  if top==-1: UNDERFLOW',
      '        else: x=arr[top]; top--; return x',
      'peek(): return arr[top]'
    ],
    parens: [
      'for ch in expression:',
      '  if ch in "([{": push(ch)',
      '  if ch in ")]}":',
      '    if stack empty: return false',
      '    if not matches(pop(), ch): return false',
      'return stack.isEmpty()'
    ],
    nge: [
      'for i from n-1 downto 0:',
      '  while stack not empty and stack.top <= arr[i]:',
      '    pop()',
      '  result[i] = stack.isEmpty() ? -1 : stack.top',
      '  push(arr[i])'
    ]
  };

  const META = {
    interactive: { best: 'O(1)', avg: 'O(1)', worst: 'O(1)', space: 'O(n)',
      applications: ['Function call stacks', 'Undo/redo history', 'Browser back button'],
      advantages: ['All core ops are O(1)', 'Simple LIFO model'],
      disadvantages: ['Fixed capacity in array form (can overflow)', 'No random access'] },
    parens: { best: 'O(n)', avg: 'O(n)', worst: 'O(n)', space: 'O(n)',
      applications: ['Syntax/bracket validation in compilers & editors', 'Expression parsing'],
      advantages: ['Linear time', 'Simple to implement with a stack'],
      disadvantages: ['Only validates matching, not full grammar'] },
    nge: { best: 'O(n)', avg: 'O(n)', worst: 'O(n)', space: 'O(n)',
      applications: ['Stock span problems', 'Histogram area problems', 'Temperature-wait problems'],
      advantages: ['Amortized O(n) vs naive O(n²)', 'Monotonic stack pattern reusable elsewhere'],
      disadvantages: ['Needs auxiliary stack memory'] }
  };

  let ws, state, history, historyIndex;

  function stackFrame(stackArr, highlightTop = false, overflow = false, underflow = false) {
    const box = el('div', { style: 'display:flex; flex-direction:column-reverse; gap:6px; align-items:center; min-height:260px; justify-content:flex-start;' });
    stackArr.forEach((v, i) => {
      const isTop = i === stackArr.length - 1;
      box.appendChild(el('div', { class: `node-box ${isTop && highlightTop ? 'active pop-in' : ''}`, style: 'width:120px;' }, [
        document.createTextNode(String(v)),
        isTop ? el('span', { class: 'ptr-arrow', text: '← top', style: 'font-size:10px;color:var(--accent)' }) : null
      ]));
    });
    const wrap = el('div', { style: 'display:flex; flex-direction:column; align-items:center; gap:10px;' }, [
      el('div', { class: `badge ${overflow ? '' : ''}`, style: `border-color:${overflow ? 'var(--danger)' : underflow ? 'var(--danger)' : 'var(--border)'}`, text: overflow ? 'OVERFLOW' : underflow ? 'UNDERFLOW' : `${stackArr.length} / ${CAPACITY}` }),
      el('div', { style: `border:2px dashed var(--border); border-top:none; padding:12px; border-radius: 0 0 12px 12px; min-width:150px; display:flex; justify-content:center;` }, [box])
    ]);
    return wrap;
  }

  function renderHistoryFrame(frame) {
    ws.stage.innerHTML = '';
    ws.stage.appendChild(stackFrame(frame.stack, frame.highlightTop, frame.overflow, frame.underflow));
  }

  function pushHistory(desc, line, stackSnapshot, extra = {}) {
    history.push({
      desc, line,
      counters: { pushes: extra.pushes ?? countOps('push'), pops: extra.pops ?? countOps('pop'), timer: history.length },
      stack: stackSnapshot.slice(),
      highlightTop: !!extra.highlightTop,
      overflow: !!extra.overflow,
      underflow: !!extra.underflow,
      render() { renderHistoryFrame(this); }
    });
    ws.player.load(history);
    ws.player.goto(history.length - 1);
    ws.enableTransport();
  }

  let pushCount = 0, popCount = 0;
  function countOps(type) { return type === 'push' ? pushCount : popCount; }

  function doPush(val) {
    if (state.stack.length >= CAPACITY) {
      pushHistory(`Push(${val}) → Stack Overflow! Capacity (${CAPACITY}) reached.`, 0, state.stack, { overflow: true });
      toast('Stack overflow', 'error');
      return;
    }
    state.stack.push(val); pushCount++;
    pushHistory(`Push(${val}) → top is now ${val}`, 1, state.stack, { highlightTop: true });
  }
  function doPop() {
    if (!state.stack.length) {
      pushHistory('Pop() → Stack Underflow! Nothing to pop.', 2, state.stack, { underflow: true });
      toast('Stack underflow', 'error');
      return;
    }
    const v = state.stack.pop(); popCount++;
    pushHistory(`Pop() → removed ${v}`, 3, state.stack);
  }
  function doPeek() {
    if (!state.stack.length) { toast('Stack is empty', 'info'); return; }
    pushHistory(`Peek() → top is ${state.stack[state.stack.length - 1]}`, 4, state.stack, { highlightTop: true });
  }
  function doClear() {
    state.stack = [];
    pushHistory('Clear() → stack emptied', 0, state.stack);
  }

  function mountControls() {
    const modeSelect = el('select', {}, [
      el('option', { value: 'interactive', text: 'Interactive Stack' }),
      el('option', { value: 'parens', text: 'Algorithm: Parentheses Matching' }),
      el('option', { value: 'nge', text: 'Algorithm: Next Greater Element' })
    ]);
    const valueInput = el('input', { type: 'text', placeholder: 'value', style: 'max-width:110px' });
    const exprInput = el('input', { type: 'text', placeholder: 'e.g. {[()]}', style: 'max-width:200px' });
    const arrInput = el('input', { type: 'text', placeholder: 'e.g. 4,5,2,10,8', style: 'max-width:220px' });

    const interactiveBtns = el('div', { class: 'btn-group', dataset: { role: 'interactiveBtns' } }, [
      valueInput,
      el('button', { class: 'btn btn-sm', text: 'Push', onclick: () => { const v = valueInput.value.trim(); if (v === '') { toast('Enter a value', 'error'); return; } doPush(v); valueInput.value = ''; } }),
      el('button', { class: 'btn btn-sm', text: 'Pop', onclick: doPop }),
      el('button', { class: 'btn btn-sm', text: 'Peek', onclick: doPeek }),
      el('button', { class: 'btn btn-sm btn-ghost', text: 'Clear', onclick: doClear })
    ]);
    const parensBtns = el('div', { class: 'btn-group', dataset: { role: 'parensBtns' }, style: 'display:none' }, [
      exprInput, el('button', { class: 'btn btn-sm', text: 'Check', onclick: () => runParens(exprInput.value) })
    ]);
    const ngeBtns = el('div', { class: 'btn-group', dataset: { role: 'ngeBtns' }, style: 'display:none' }, [
      arrInput, el('button', { class: 'btn btn-sm', text: 'Run', onclick: () => runNGE(arrInput.value) })
    ]);

    const extra = el('div', { style: 'display:flex; flex-direction:column; gap:12px;' }, [
      el('div', { class: 'field', style: 'max-width:260px' }, [el('label', {}, [document.createTextNode('Mode')]), el('div', { class: 'select-wrap' }, [modeSelect])]),
      interactiveBtns, parensBtns, ngeBtns
    ]);

    modeSelect.addEventListener('change', () => {
      state.mode = modeSelect.value;
      interactiveBtns.style.display = state.mode === 'interactive' ? 'flex' : 'none';
      parensBtns.style.display = state.mode === 'parens' ? 'flex' : 'none';
      ngeBtns.style.display = state.mode === 'nge' ? 'flex' : 'none';
      resetForMode();
    });

    return { extra, modeSelect };
  }

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

    state.stack = [];
    history = [];
    pushCount = 0; popCount = 0;
    ws.player.load([]);
    ws.stage.innerHTML = '';
    ws.stage.appendChild(el('div', { class: 'empty-state' }, [document.createTextNode(
      state.mode === 'interactive' ? 'Push a value to begin.' :
      state.mode === 'parens' ? 'Enter a bracket expression and press Check.' :
      'Enter a numeric array and press Run.'
    )]));
    ws.setCounters({ pushes: 0, pops: 0, timer: 0 });
  }

  function render(view) {
    const controls = mountControls();
    ws = Workspace.build(view, {
      title: 'Stack Visualizer',
      description: 'Explore LIFO push/pop mechanics interactively, or watch classic stack-based algorithms run.',
      statChips: [{ key: 'pushes', label: 'Pushes' }, { key: 'pops', label: 'Pops' }, { key: 'timer', label: 'Step' }],
      pseudocode: PSEUDOCODE.interactive,
      complexity: META.interactive,
      applications: META.interactive.applications, advantages: META.interactive.advantages, disadvantages: META.interactive.disadvantages,
      extraControls: controls.extra,
      legend: [{ color: 'var(--accent)', label: 'Top / Active' }, { color: 'var(--danger)', label: 'Overflow / Underflow' }]
    });
    state = { mode: 'interactive', stack: [] };
    ws.startBtn.style.display = 'none';
    ws.pauseBtn.style.display = 'none';
    resetForMode();
  }

  function runParens(expr) {
    if (!expr || !expr.trim()) { toast('Enter an expression', 'error'); return; }
    const pairs = { ')': '(', ']': '[', '}': '{' };
    const stk = [];
    const steps = [];
    let ok = true;
    for (let i = 0; i < expr.length; i++) {
      const ch = expr[i];
      if ('([{'.includes(ch)) {
        stk.push(ch);
        steps.push(mkParenStep(`Push '${ch}' (index ${i})`, 1, stk, expr, i));
      } else if (')]}'.includes(ch)) {
        if (!stk.length || stk[stk.length - 1] !== pairs[ch]) {
          ok = false;
          steps.push(mkParenStep(`Mismatch at '${ch}' (index ${i}) → invalid expression`, 3, stk, expr, i, true));
          break;
        }
        stk.pop();
        steps.push(mkParenStep(`Match '${ch}' with top → pop`, 4, stk, expr, i));
      } else {
        steps.push(mkParenStep(`Skip non-bracket character '${ch}'`, 0, stk, expr, i));
      }
    }
    if (ok) steps.push(mkParenStep(stk.length === 0 ? '✓ Expression is balanced!' : '✗ Unclosed brackets remain — invalid.', 5, stk, expr, -1, stk.length !== 0));
    ws.player.load(steps);
    ws.player.play();
    ws.enableTransport();
  }
  function mkParenStep(desc, line, stk, expr, idx, bad = false) {
    return {
      desc, line, counters: { pushes: 0, pops: 0, timer: 0 },
      render() {
        ws.stage.innerHTML = '';
        const exprRow = el('div', { class: 'mono', style: 'font-size:22px; letter-spacing:4px; margin-bottom:18px; text-align:center;' },
          expr.split('').map((c, i) => el('span', { style: `color:${i === idx ? (bad ? 'var(--danger)' : 'var(--accent)') : 'var(--text-dim)'}; ${i === idx ? 'text-decoration:underline;' : ''}`, text: c }))
        );
        ws.stage.appendChild(exprRow);
        ws.stage.appendChild(stackFrame(stk, true, false, false));
      }
    };
  }

  function runNGE(text) {
    const arr = text.split(',').map(s => Number(s.trim())).filter(n => !isNaN(n));
    if (!arr.length) { toast('Enter valid comma-separated numbers', 'error'); return; }
    const n = arr.length;
    const result = new Array(n).fill(-1);
    const stk = [];
    const steps = [];
    for (let i = n - 1; i >= 0; i--) {
      while (stk.length && stk[stk.length - 1] <= arr[i]) {
        stk.pop();
        steps.push(mkNgeStep(`arr[${i}]=${arr[i]} ≥ stack top → pop`, 1, arr, stk, result, i));
      }
      result[i] = stk.length ? stk[stk.length - 1] : -1;
      steps.push(mkNgeStep(`Next Greater of ${arr[i]} = ${result[i]}`, 3, arr, stk, result, i));
      stk.push(arr[i]);
      steps.push(mkNgeStep(`Push ${arr[i]} onto stack`, 4, arr, stk, result, i));
    }
    steps.push(mkNgeStep(`Done → [${result.join(', ')}]`, 4, arr, stk, result, -1));
    ws.player.load(steps);
    ws.player.play();
    ws.enableTransport();
  }
  function mkNgeStep(desc, line, arr, stk, result, idx) {
    return {
      desc, line, counters: { pushes: 0, pops: 0, timer: 0 },
      render() {
        ws.stage.innerHTML = '';
        const arrRow = el('div', { class: 'array-row', style: 'margin-bottom:24px' }, arr.map((v, i) =>
          el('div', { class: `array-cell ${i === idx ? 'active' : ''}` }, [document.createTextNode(String(v)), el('span', { class: 'idx', text: result[i] === -1 && idx !== i ? '' : `NGE:${result[i]}` })])
        ));
        ws.stage.appendChild(arrRow);
        ws.stage.appendChild(el('div', { style: 'margin-top:14px' }, [stackFrame(stk, true)]));
      }
    };
  }

  return { render };
})();
