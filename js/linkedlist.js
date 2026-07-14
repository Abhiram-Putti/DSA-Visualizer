/* ==========================================================================
   LINKED LIST VISUALIZER — Singly / Doubly / Circular
   ========================================================================== */

const LinkedListModule = (() => {
  const { el, $$, toast } = Utils;

  const PSEUDOCODE = {
    base: [
      'insertHead(x): node.next=head; head=node',
      'insertTail(x): traverse to last; last.next=node',
      'insertAt(x,i): traverse to i-1; splice node in',
      'delete(x): unlink matching node',
      'reverse(): iteratively flip next pointers',
      'traverse(): visit head → ... → null',
      'search(x): walk until value matches'
    ]
  };
  const META = {
    singly: { best: 'O(1)', avg: 'O(n)', worst: 'O(n)', space: 'O(n)',
      applications: ['Implementing stacks/queues', 'Adjacency lists for graphs', 'Undo history chains'],
      advantages: ['O(1) head insertion/removal', 'Dynamic size, no pre-allocation'],
      disadvantages: ['O(n) random access', 'Extra memory per node for pointers'] },
    doubly: { best: 'O(1)', avg: 'O(n)', worst: 'O(n)', space: 'O(n)',
      applications: ['Browser history (back/forward)', 'LRU cache implementation', 'Text editor undo/redo'],
      advantages: ['Traversal in both directions', 'O(1) deletion given a node reference'],
      disadvantages: ['Extra pointer per node (more memory)'] },
    circular: { best: 'O(1)', avg: 'O(n)', worst: 'O(n)', space: 'O(n)',
      applications: ['Round-robin CPU scheduling', 'Circular buffers', 'Multiplayer turn rotation'],
      advantages: ['Continuous traversal with no null end', 'Natural fit for cyclic processes'],
      disadvantages: ['Easy to infinite-loop without a stopping condition'] }
  };

  let ws, state, history;

  function drawFrame(frame) {
    ws.stage.innerHTML = '';
    if (!frame.list.length) { ws.stage.appendChild(el('div', { class: 'empty-state', text: 'List is empty. Insert a node to begin.' })); return; }
    const row = el('div', { style: 'display:flex; align-items:center; flex-wrap:wrap; gap:4px; padding:12px 0;' });
    frame.list.forEach((v, i) => {
      const isActive = frame.activeIdx === i;
      const box = el('div', { class: `node-box ${isActive ? (frame.activeCls || 'active') + ' pop-in' : ''} ${frame.visited && frame.visited.includes(i) ? 'visited' : ''}` }, [document.createTextNode(String(v))]);
      row.appendChild(box);
      if (i < frame.list.length - 1) {
        row.appendChild(el('span', { class: 'ptr-arrow mono', text: state.mode === 'doubly' ? ' ⇄ ' : ' → ' }));
      }
    });
    if (state.mode === 'circular' && frame.list.length) {
      row.appendChild(el('span', { class: 'ptr-arrow mono', style: 'color:var(--accent-3)', text: ' ↻ head' }));
    } else if (state.mode !== 'circular' && frame.list.length) {
      row.appendChild(el('span', { class: 'ptr-arrow mono', text: ' → null' }));
    }
    ws.stage.appendChild(row);
    ws.stage.appendChild(el('div', { class: 'legend', style: 'margin-top:14px' }, [
      el('span', { class: 'badge', text: `head: ${frame.list[0]}` }),
      el('span', { class: 'badge', text: `tail: ${frame.list[frame.list.length - 1]}` }),
      el('span', { class: 'badge', text: `length: ${frame.list.length}` })
    ]));
  }

  function pushHistory(desc, line, extra = {}) {
    history.push({
      desc, line, counters: { nodes: state.list.length, ops: history.length + 1, timer: history.length },
      list: state.list.slice(), activeIdx: extra.activeIdx ?? -1, visited: extra.visited || [], activeCls: extra.activeCls,
      render() { drawFrame(this); }
    });
    ws.player.load(history);
    ws.player.goto(history.length - 1);
    ws.enableTransport();
  }

  function insertHead(v) { state.list.unshift(v); pushHistory(`insertHead(${v})`, 0, { activeIdx: 0 }); }
  function insertTail(v) { state.list.push(v); pushHistory(`insertTail(${v})`, 1, { activeIdx: state.list.length - 1 }); }
  function insertAt(v, pos) {
    const i = Utils.clamp(Number(pos) || 0, 0, state.list.length);
    state.list.splice(i, 0, v);
    pushHistory(`insertAt(${v}, ${i})`, 2, { activeIdx: i });
  }
  function deleteVal(v) {
    const i = state.list.indexOf(v);
    if (i === -1) { toast(`Value ${v} not found`, 'error'); return; }
    state.list.splice(i, 1);
    pushHistory(`delete(${v}) → unlinked node at index ${i}`, 3, {});
  }
  function reverseList() {
    state.list.reverse();
    pushHistory('reverse() → all next pointers flipped', 4, {});
  }
  function traverseAll() {
    const visited = [];
    state.list.forEach((v, i) => {
      visited.push(i);
      pushHistory(`Visit node[${i}] = ${v}`, 5, { activeIdx: i, visited: visited.slice() });
    });
    if (!state.list.length) toast('List is empty', 'info');
  }
  function searchVal(v) {
    const visited = [];
    for (let i = 0; i < state.list.length; i++) {
      visited.push(i);
      const found = state.list[i] == v;
      pushHistory(found ? `Found ${v} at index ${i}!` : `node[${i}]=${state.list[i]} ≠ ${v}, continue`, 6, { activeIdx: i, visited: visited.slice(), activeCls: found ? 'match' : 'compare-hi' });
      if (found) return;
    }
    toast(`${v} not found in list`, 'info');
  }

  function mountControls() {
    const modeSelect = el('select', {}, [
      el('option', { value: 'singly', text: 'Singly Linked List' }),
      el('option', { value: 'doubly', text: 'Doubly Linked List' }),
      el('option', { value: 'circular', text: 'Circular Linked List' })
    ]);
    const valueInput = el('input', { type: 'text', placeholder: 'value', style: 'max-width:100px' });
    const posInput = el('input', { type: 'text', placeholder: 'position', style: 'max-width:90px' });

    const btns = el('div', { class: 'btn-group' }, [
      valueInput, posInput,
      el('button', { class: 'btn btn-sm', text: 'Insert Head', onclick: () => req(valueInput.value, v => insertHead(v)) }),
      el('button', { class: 'btn btn-sm', text: 'Insert Tail', onclick: () => req(valueInput.value, v => insertTail(v)) }),
      el('button', { class: 'btn btn-sm', text: 'Insert At', onclick: () => req(valueInput.value, v => insertAt(v, posInput.value)) }),
      el('button', { class: 'btn btn-sm', text: 'Delete', onclick: () => req(valueInput.value, v => deleteVal(v)) }),
      el('button', { class: 'btn btn-sm', text: 'Search', onclick: () => req(valueInput.value, v => searchVal(v)) }),
      el('button', { class: 'btn btn-sm', text: 'Reverse', onclick: reverseList }),
      el('button', { class: 'btn btn-sm', text: 'Traverse', onclick: traverseAll }),
      el('button', { class: 'btn btn-sm btn-ghost', text: 'Clear', onclick: () => { state.list = []; pushHistory('Clear() → list emptied', 0, {}); } })
    ]);
    function req(v, fn) { if (v.trim() === '') { toast('Enter a value', 'error'); return; } fn(v.trim()); valueInput.value = ''; }

    const extra = el('div', { style: 'display:flex; flex-direction:column; gap:12px;' }, [
      el('div', { class: 'field', style: 'max-width:220px' }, [el('label', {}, [document.createTextNode('List Type')]), el('div', { class: 'select-wrap' }, [modeSelect])]),
      btns
    ]);
    modeSelect.addEventListener('change', () => { state.mode = modeSelect.value; resetForMode(); });
    return { extra, modeSelect };
  }

  function resetForMode() {
    const meta = META[state.mode];
    ws.setPseudocode(PSEUDOCODE.base);
    ws.panels.complexity.innerHTML = '';
    ws.panels.complexity.appendChild(el('table', { class: 'complexity-table' }, [
      el('thead', {}, [el('tr', {}, [el('th', { text: 'Case' }), el('th', { text: 'Time' })])]),
      el('tbody', {}, [['Best (head op)', meta.best], ['Average', meta.avg], ['Worst', meta.worst]].map(r => el('tr', {}, [el('td', { text: r[0] }), el('td', { class: 'mono', text: r[1] })])))
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

    state.list = [10, 20, 30];
    history = [];
    ws.player.load([]);
    ws.stage.innerHTML = '';
    drawFrame({ list: state.list, activeIdx: -1, visited: [] });
    ws.setCounters({ nodes: state.list.length, ops: 0, timer: 0 });
  }

  function render(view) {
    const controls = mountControls();
    ws = Workspace.build(view, {
      title: 'Linked List Visualizer',
      description: 'Insert, delete, reverse, traverse, and search across singly, doubly, and circular linked lists.',
      statChips: [{ key: 'nodes', label: 'Nodes' }, { key: 'ops', label: 'Operations' }, { key: 'timer', label: 'Step' }],
      pseudocode: PSEUDOCODE.base,
      complexity: META.singly,
      applications: META.singly.applications, advantages: META.singly.advantages, disadvantages: META.singly.disadvantages,
      extraControls: controls.extra,
      legend: [
        { color: 'var(--accent)', label: 'Active Node' },
        { color: 'var(--success)', label: 'Match found' },
        { color: 'var(--compare-hi)', label: 'Checking · no match' },
        { color: 'var(--accent-2)', label: 'Visited' }
      ]
    });
    state = { mode: 'singly', list: [10, 20, 30] };
    ws.startBtn.style.display = 'none';
    ws.pauseBtn.style.display = 'none';
    resetForMode();
  }

  return { render };
})();
