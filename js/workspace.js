/* ==========================================================================
   WORKSPACE — builds the standard IDE-like shell every visualizer uses:
   stage (canvas) + controls dock + tabbed side panel (Explain / Pseudocode /
   Complexity / Notes) + stat chips + a StepPlayer wired to the transport
   buttons. Individual algorithm modules only supply *content*: the DOM for
   the stage, the list of steps, and the static info (complexity/pseudocode).
   This is what keeps sorting.js, stack.js, tree.js etc. free of duplicated
   boilerplate.
   ========================================================================== */

const Workspace = (() => {
  const { el, $, toast } = Utils;

  /**
   * @param {HTMLElement} view          the <section class="view"> to render into
   * @param {Object} cfg
   * @param {string} cfg.title
   * @param {string} cfg.description
   * @param {Array}  cfg.statChips      [{key,label}]
   * @param {Array}  cfg.pseudocode     array of code line strings (default set)
   * @param {Object} cfg.complexity     {rows:[{case,time}], space, best,avg,worst}
   * @param {Array}  cfg.applications
   * @param {Array}  cfg.advantages
   * @param {Array}  cfg.disadvantages
   * @param {HTMLElement|null} cfg.extraControls   extra control elements (array size, custom input...)
   * @param {boolean} cfg.showStepButtons
   */
  function build(view, cfg) {
    view.innerHTML = '';

    const header = el('div', { class: 'view-header' }, [
      el('div', {}, [
        el('h1', { text: cfg.title }),
        el('p', { class: 'view-desc', text: cfg.description || '' })
      ]),
      cfg.headerRight || null
    ]);

    const stage = el('div', { class: 'stage' }, [
      el('div', { class: 'empty-state' }, [
        el('div', { text: '▶ Generate data or start the algorithm to begin' })
      ])
    ]);

    const statRow = el('div', { class: 'stat-row' },
      (cfg.statChips || []).map((s, i) =>
        el('div', { class: `stat-chip ${i === 0 ? 'accent' : i === 1 ? 'teal' : ''}` }, [
          el('div', { class: 'label', text: s.label }),
          el('div', { class: 'value', text: '0', dataset: { chip: s.key } })
        ])
      )
    );

    /* ---------- Controls dock ---------- */
    const speedField = el('div', { class: 'field' }, [
      el('label', {}, [
        document.createTextNode('Speed'),
        el('span', { class: 'value', text: '1.0×', dataset: { role: 'speedVal' } })
      ]),
      el('input', { type: 'range', min: '1', max: '10', value: '5', dataset: { role: 'speedRange' } })
    ]);

    const transport = el('div', { class: 'btn-group' }, [
      el('button', { class: 'btn btn-primary', dataset: { role: 'startBtn' } }, [document.createTextNode('▶ Start')]),
      el('button', { class: 'btn', dataset: { role: 'pauseBtn' }, disabled: 'true' }, [document.createTextNode('⏸ Pause')]),
      el('button', { class: 'btn', dataset: { role: 'stepBackBtn' }, disabled: 'true' }, [document.createTextNode('⏮ Step')]),
      el('button', { class: 'btn', dataset: { role: 'stepFwdBtn' }, disabled: 'true' }, [document.createTextNode('Step ⏭')]),
      el('button', { class: 'btn btn-ghost', dataset: { role: 'resetBtn' } }, [document.createTextNode('↺ Reset')])
    ]);

    const controlsDock = el('div', { class: 'controls-dock' }, [
      cfg.extraControls || null,
      el('div', { style: 'display:flex; gap:16px; flex-wrap:wrap; align-items:flex-end;' }, [
        el('div', { style: 'flex:1; min-width:160px;' }, [speedField]),
      ]),
      transport
    ]);

    const explainBox = el('div', { class: 'step-explain', text: 'Ready. Configure your input and press Start.' });

    /* ---------- Side tab panel ---------- */
    const codeLines = el('div', { class: 'code-lines' });
    const codePanel = el('div', { class: 'code-panel' }, [
      el('div', { class: 'code-panel-head' }, [
        el('div', { class: 'traffic' }, [el('span'), el('span'), el('span')]),
        el('span', { text: `${cfg.title.toLowerCase().replace(/\s+/g, '_')}.js` })
      ]),
      codeLines
    ]);

    const complexityBody = buildComplexity(cfg.complexity || {});
    const notesBody = buildNotes(cfg);

    const tabs = ['Pseudocode', 'Complexity', 'Notes'];
    const tabRow = el('div', { class: 'tab-row' });
    const tabPanels = el('div', {});
    const panelMap = { Pseudocode: codePanel, Complexity: complexityBody, Notes: notesBody };
    tabs.forEach((t, i) => {
      const btn = el('button', { class: `tab-btn ${i === 0 ? 'active' : ''}`, text: t, onclick: () => {
        Utils.$$('.tab-btn', tabRow).forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        Utils.$$('.tab-panel', tabPanels).forEach(p => p.classList.remove('active'));
        wrap[t].classList.add('active');
      }});
      tabRow.appendChild(btn);
    });
    const wrap = {};
    tabs.forEach((t, i) => {
      const p = el('div', { class: `tab-panel ${i === 0 ? 'active' : ''}` }, [panelMap[t]]);
      wrap[t] = p;
      tabPanels.appendChild(p);
    });

    const sidePanel = el('div', { class: 'panel' }, [tabRow, tabPanels]);
    const explainPanel = el('div', { class: 'panel' }, [
      el('h3', { text: 'Current Step' }),
      explainBox
    ]);

    const legendPanel = cfg.legend ? el('div', { class: 'panel' }, [
      el('h3', { text: 'Legend' }),
      el('div', { class: 'legend' }, cfg.legend.map(l => el('span', { class: 'badge' }, [
        el('span', { class: 'swatch', style: `background:${l.color}` }),
        document.createTextNode(l.label)
      ])))
    ]) : null;

    const stageCol = el('div', { class: 'stage-col' }, [stage, statRow, controlsDock, explainPanel]);
    const sideCol = el('div', { class: 'side-col' }, [legendPanel, sidePanel]);
    const grid = el('div', { class: 'workspace-grid' }, [stageCol, sideCol]);

    view.appendChild(header);
    view.appendChild(grid);

    /* ---------- Wire pseudocode lines ---------- */
    function setPseudocode(lines) {
      codeLines.innerHTML = '';
      lines.forEach((text, i) => {
        codeLines.appendChild(el('div', { class: 'code-line', dataset: { line: i } }, [
          el('span', { class: 'bp' }),
          el('span', { class: 'ln', text: String(i + 1) }),
          el('span', { text })
        ]));
      });
    }
    setPseudocode(cfg.pseudocode || ['// pseudocode will appear here']);

    function highlightLine(lineIdx) {
      Utils.$$('.code-line', codeLines).forEach(l => l.classList.remove('active'));
      if (lineIdx === null || lineIdx === undefined) return;
      const target = codeLines.querySelector(`.code-line[data-line="${lineIdx}"]`);
      if (target) target.scrollIntoView({ block: 'nearest' });
      if (target) target.classList.add('active');
    }

    function setCounters(counters = {}) {
      Object.entries(counters).forEach(([k, v]) => {
        const node = statRow.querySelector(`[data-chip="${k}"]`);
        if (node) node.textContent = typeof v === 'number' && k === 'timer' ? Utils.formatTime(v) : v;
      });
    }

    /* ---------- Player wiring ---------- */
    const startBtn = Utils.$('[data-role="startBtn"]', controlsDock);
    const pauseBtn = Utils.$('[data-role="pauseBtn"]', controlsDock);
    const stepBackBtn = Utils.$('[data-role="stepBackBtn"]', controlsDock);
    const stepFwdBtn = Utils.$('[data-role="stepFwdBtn"]', controlsDock);
    const resetBtn = Utils.$('[data-role="resetBtn"]', controlsDock);
    const speedRange = Utils.$('[data-role="speedRange"]', controlsDock);
    const speedVal = Utils.$('[data-role="speedVal"]', controlsDock);

    let timerInterval = null;
    const player = new Utils.StepPlayer({
      onRender(step) {
        if (step.render) step.render();
        if (step.desc) explainBox.textContent = step.desc;
        highlightLine(step.line);
        setCounters(step.counters || {});
      },
      onStateChange(playing) {
        startBtn.disabled = playing;
        pauseBtn.disabled = !playing;
        stepBackBtn.disabled = playing;
        stepFwdBtn.disabled = playing;
        startBtn.innerHTML = '';
        startBtn.appendChild(document.createTextNode(player.index > 0 && !playing ? '▶ Resume' : '▶ Start'));
      },
      onDone() { toast('Finished ✓', 'success'); }
    });

    speedRange.addEventListener('input', () => {
      const v = Number(speedRange.value);
      speedVal.textContent = `${(v / 5).toFixed(1)}×`;
      player.setSpeed(1100 - v * 100);
    });
    player.setSpeed(600);

    resetBtn.addEventListener('click', () => {
      player.reset();
      toast('Reset', 'info');
    });
    pauseBtn.addEventListener('click', () => player.pause());
    stepFwdBtn.addEventListener('click', () => { if (!player.stepForward()) toast('Already at last step', 'info'); });
    stepBackBtn.addEventListener('click', () => { if (!player.stepBack()) toast('Already at first step', 'info'); });

    function enableTransport() {
      stepBackBtn.disabled = false;
      stepFwdBtn.disabled = false;
    }

    return {
      stage, controlsDock, statRow, explainBox, startBtn, pauseBtn, stepBackBtn, stepFwdBtn, resetBtn,
      player, setPseudocode, highlightLine, setCounters, enableTransport,
      panels: { pseudocode: wrap.Pseudocode, complexity: wrap.Complexity, notes: wrap.Notes }
    };
  }

  function buildComplexity(c) {
    const rows = c.rows || [
      { case: 'Best', time: c.best || '—' },
      { case: 'Average', time: c.avg || '—' },
      { case: 'Worst', time: c.worst || '—' }
    ];
    const table = el('table', { class: 'complexity-table' }, [
      el('thead', {}, [el('tr', {}, [el('th', { text: 'Case' }), el('th', { text: 'Time' })])]),
      el('tbody', {}, rows.map(r => el('tr', {}, [el('td', { text: r.case }), el('td', { class: 'mono', text: r.time })])))
    ]);
    const space = el('p', {}, [document.createTextNode('Space complexity: '), el('span', { class: 'mono', style: `color:var(--accent-2)`, text: c.space || '—' })]);
    return el('div', {}, [table, space]);
  }

  function buildNotes(cfg) {
    const block = (title, items) => items && items.length ? el('div', { style: 'margin-bottom:12px' }, [
      el('h4', { style: 'font-size:12px; color:var(--text-faint); text-transform:uppercase; letter-spacing:.06em; margin-bottom:6px;', text: title }),
      el('ul', { class: 'info-list' }, items.map(i => el('li', { text: i })))
    ]) : null;
    return el('div', {}, [
      block('Applications', cfg.applications),
      block('Advantages', cfg.advantages),
      block('Disadvantages', cfg.disadvantages)
    ]);
  }

  return { build };
})();
