/* ==========================================================================
   QUEUE VISUALIZER — Queue, Circular Queue, Deque, Priority Queue
   ========================================================================== */

const QueueModule = (() => {
  const { el, $$, toast } = Utils;
  const CAPACITY = 8;

  const PSEUDOCODE = {
    queue: [
      'enqueue(x): if full: OVERFLOW',
      '            else: rear++; arr[rear]=x',
      'dequeue(): if empty: UNDERFLOW',
      '           else: x=arr[front]; front++; return x'
    ],
    circular: [
      'enqueue(x): if (rear+1)%cap == front: OVERFLOW',
      '            rear=(rear+1)%cap; arr[rear]=x',
      'dequeue(): if front==-1: UNDERFLOW',
      '           x=arr[front]; front=(front+1)%cap; return x'
    ],
    deque: [
      'insertFront(x) / insertRear(x)',
      'deleteFront() / deleteRear()',
      'O(1) insertion/removal at both ends'
    ],
    priority: [
      'enqueue(x, priority): insert keeping order',
      'dequeue(): remove & return highest-priority item',
      'peek(): view highest-priority item'
    ]
  };
  const META = {
    queue: { best: 'O(1)', avg: 'O(1)', worst: 'O(1)', space: 'O(n)',
      applications: ['Task scheduling', 'Print queues', 'BFS traversal'],
      advantages: ['FIFO fairness', 'O(1) core ops'],
      disadvantages: ['Naive array version wastes space after dequeues'] },
    circular: { best: 'O(1)', avg: 'O(1)', worst: 'O(1)', space: 'O(n)',
      applications: ['Ring buffers', 'CPU scheduling', 'Streaming data buffers'],
      advantages: ['Reuses freed slots (no wasted space)', 'O(1) ops'],
      disadvantages: ['Fixed capacity', 'Slightly trickier index math'] },
    deque: { best: 'O(1)', avg: 'O(1)', worst: 'O(1)', space: 'O(n)',
      applications: ['Sliding window problems', 'Undo/redo with both-end access', 'Palindrome checks'],
      advantages: ['Flexible insertion/removal at both ends'],
      disadvantages: ['Slightly more bookkeeping than a plain queue'] },
    priority: { best: 'O(log n)', avg: 'O(log n)', worst: 'O(n)', space: 'O(n)',
      applications: ['Dijkstra\'s algorithm', 'Task schedulers', 'Huffman coding'],
      advantages: ['Always serves the most important item first'],
      disadvantages: ['Naive array implementation is O(n) insert; needs a heap for O(log n)'] }
  };

  let ws, state, history;

  function ringLabel(i, front, rear, len) {
    if (i === front && len > 0) return 'F';
    if (i === rear && len > 0) return 'R';
    return '';
  }

  function drawFrame(frame) {
    ws.stage.innerHTML = '';
    if (state.mode === 'priority') {
      const row = el('div', { class: 'array-row' }, frame.items.map((it, i) =>
        el('div', { class: `node-box ${i === 0 ? 'active' : ''}`, style: 'flex-direction:column; height:auto; padding:8px 10px;' }, [
          el('div', { text: it.val }),
          el('div', { style: 'font-size:10px;color:var(--text-faint)', text: `p:${it.priority}` })
        ])
      ));
      ws.stage.appendChild(row.childNodes.length ? row : el('div', { class: 'empty-state', text: 'Queue is empty' }));
      return;
    }
    if (state.mode === 'deque') {
      const row = el('div', { class: 'array-row', style: 'justify-content:center' }, [
        el('span', { class: 'badge', text: 'FRONT →' }),
        ...frame.items.map(v => el('div', { class: 'node-box' }, [document.createTextNode(String(v))])),
        el('span', { class: 'badge', text: '← REAR' })
      ]);
      ws.stage.appendChild(row);
      return;
    }
    if (state.mode === 'circular') {
      const slots = new Array(CAPACITY).fill(null);
      frame.items.forEach((v, k) => { slots[(frame.front + k) % CAPACITY] = v; });
      const row = el('div', { class: 'array-row', style: 'justify-content:center' }, slots.map((v, i) =>
        el('div', { class: `array-cell ${v !== null ? 'active' : ''}`, text: v === null ? '' : v }, [
          el('span', { class: 'idx', text: ringLabel(i, frame.front, frame.rear, frame.items.length) })
        ])
      ));
      ws.stage.appendChild(row);
      return;
    }
    // simple queue
    const row = el('div', { class: 'array-row', style: 'justify-content:center' }, [
      el('span', { class: 'badge', text: 'FRONT →' }),
      ...frame.items.map(v => el('div', { class: 'node-box' }, [document.createTextNode(String(v))])),
      el('span', { class: 'badge', text: '← REAR' })
    ]);
    ws.stage.appendChild(row);
  }

  function pushHistory(desc, line, extra = {}) {
    history.push({
      desc, line,
      counters: { enqueues: state.enq, dequeues: state.deq, timer: history.length },
      items: state.items.slice(), front: state.front, rear: state.rear,
      render() { drawFrame(this); }
    });
    ws.player.load(history);
    ws.player.goto(history.length - 1);
    ws.enableTransport();
  }

  function doEnqueue(val, priority) {
    if (state.mode === 'priority') {
      state.items.push({ val, priority: Number(priority) || 0 });
      state.items.sort((a, b) => a.priority - b.priority);
      state.enq++;
      pushHistory(`Enqueue(${val}, priority ${priority}) → inserted in priority order`, 0);
      return;
    }
    if (state.items.length >= CAPACITY) { pushHistory(`Enqueue(${val}) → Overflow! Capacity reached.`, 0); toast('Queue overflow', 'error'); return; }
    state.items.push(val); state.enq++;
    if (state.mode === 'circular') { state.rear = (state.rear + 1) % CAPACITY; if (state.front === -1) state.front = 0; }
    pushHistory(`Enqueue(${val}) → added to rear`, 1);
  }
  function doDequeue() {
    if (!state.items.length) { pushHistory('Dequeue() → Underflow! Queue is empty.', 2); toast('Queue underflow', 'error'); return; }
    const v = state.mode === 'priority' ? state.items.shift().val : state.items.shift();
    state.deq++;
    if (state.mode === 'circular') state.front = state.items.length ? (state.front + 1) % CAPACITY : -1;
    pushHistory(`Dequeue() → removed ${typeof v === 'object' ? v.val : v} from front`, 3);
  }
  function doInsertFront(val) { state.items.unshift(val); state.enq++; pushHistory(`insertFront(${val})`, 0); }
  function doDeleteRear() { if (!state.items.length) { toast('Deque empty', 'error'); return; } const v = state.items.pop(); state.deq++; pushHistory(`deleteRear() → removed ${v}`, 1); }
  function doPeek() {
    if (!state.items.length) { toast('Queue is empty', 'info'); return; }
    const v = state.mode === 'priority' ? state.items[0].val : state.items[0];
    pushHistory(`Peek() → front is ${v}`, 0);
  }
  function doClear() { state.items = []; state.front = -1; state.rear = -1; pushHistory('Clear() → queue emptied', 0); }

  function mountControls() {
    const modeSelect = el('select', {}, [
      el('option', { value: 'queue', text: 'Simple Queue' }),
      el('option', { value: 'circular', text: 'Circular Queue' }),
      el('option', { value: 'deque', text: 'Deque' }),
      el('option', { value: 'priority', text: 'Priority Queue' })
    ]);
    const valueInput = el('input', { type: 'text', placeholder: 'value', style: 'max-width:100px' });
    const priorityInput = el('input', { type: 'text', placeholder: 'priority', style: 'max-width:90px;display:none' });

    const btns = el('div', { class: 'btn-group' }, [
      valueInput, priorityInput,
      el('button', { class: 'btn btn-sm', text: 'Enqueue', onclick: () => { if (!valueInput.value.trim()) { toast('Enter a value', 'error'); return; } doEnqueue(valueInput.value.trim(), priorityInput.value.trim() || 0); valueInput.value = ''; priorityInput.value = ''; } }),
      el('button', { class: 'btn btn-sm', text: 'Dequeue', onclick: doDequeue }),
      el('button', { class: 'btn btn-sm', text: 'Peek', onclick: doPeek }),
      el('button', { class: 'btn btn-sm', dataset: { role: 'frontBtn' }, text: 'Insert Front', style: 'display:none', onclick: () => { if (!valueInput.value.trim()) return; doInsertFront(valueInput.value.trim()); valueInput.value=''; } }),
      el('button', { class: 'btn btn-sm', dataset: { role: 'rearBtn' }, text: 'Delete Rear', style: 'display:none', onclick: doDeleteRear }),
      el('button', { class: 'btn btn-sm btn-ghost', text: 'Clear', onclick: doClear })
    ]);

    const extra = el('div', { style: 'display:flex; flex-direction:column; gap:12px;' }, [
      el('div', { class: 'field', style: 'max-width:220px' }, [el('label', {}, [document.createTextNode('Mode')]), el('div', { class: 'select-wrap' }, [modeSelect])]),
      btns
    ]);

    modeSelect.addEventListener('change', () => {
      state.mode = modeSelect.value;
      priorityInput.style.display = state.mode === 'priority' ? 'inline-block' : 'none';
      $$('[data-role="frontBtn"], [data-role="rearBtn"]', btns).forEach(b => b.style.display = state.mode === 'deque' ? 'inline-flex' : 'none');
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

    state.items = []; state.front = -1; state.rear = -1; state.enq = 0; state.deq = 0;
    history = [];
    ws.player.load([]);
    ws.stage.innerHTML = '';
    ws.stage.appendChild(el('div', { class: 'empty-state', text: 'Enqueue a value to begin.' }));
    ws.setCounters({ enqueues: 0, dequeues: 0, timer: 0 });
  }

  function render(view) {
    const controls = mountControls();
    ws = Workspace.build(view, {
      title: 'Queue Visualizer',
      description: 'FIFO queues, circular buffers, deques, and priority queues — enqueue and dequeue to see each variant behave.',
      statChips: [{ key: 'enqueues', label: 'Enqueues' }, { key: 'dequeues', label: 'Dequeues' }, { key: 'timer', label: 'Step' }],
      pseudocode: PSEUDOCODE.queue,
      complexity: META.queue,
      applications: META.queue.applications, advantages: META.queue.advantages, disadvantages: META.queue.disadvantages,
      extraControls: controls.extra,
      legend: [{ color: 'var(--accent)', label: 'Front / Active' }]
    });
    state = { mode: 'queue', items: [], front: -1, rear: -1, enq: 0, deq: 0 };
    ws.startBtn.style.display = 'none';
    ws.pauseBtn.style.display = 'none';
    resetForMode();
  }

  return { render };
})();
