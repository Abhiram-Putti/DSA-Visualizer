/* ==========================================================================
   MAIN — app shell wiring: sidebar, routing, theme, shortcuts, favorites
   ========================================================================== */

(() => {
  const { $, $$, el, toast, storage } = Utils;

  const ICONS = {
    home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/></svg>',
    sort: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 6h10M4 12h7M4 18h4M18 4v16M18 20l3-3M18 20l-3-3"/></svg>',
    search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>',
    array: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="7" width="4" height="10"/><rect x="10" y="4" width="4" height="16"/><rect x="17" y="9" width="4" height="8"/></svg>',
    list: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="5" cy="6" r="2"/><circle cx="5" cy="12" r="2"/><circle cx="5" cy="18" r="2"/><path d="M9 6h11M9 12h11M9 18h11"/></svg>',
    stack: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="5" y="4" width="14" height="4"/><rect x="5" y="10" width="14" height="4"/><rect x="5" y="16" width="14" height="4"/></svg>',
    queue: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="9" width="4" height="6"/><rect x="10" y="9" width="4" height="6"/><rect x="17" y="9" width="4" height="6"/></svg>',
    tree: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="5" r="2"/><circle cx="6" cy="13" r="2"/><circle cx="18" cy="13" r="2"/><circle cx="6" cy="20" r="1.6"/><circle cx="18" cy="20" r="1.6"/><path d="M12 7v2M10.6 9L7.4 11.5M13.4 9l3.2 2.5M6 15v3M18 15v3"/></svg>',
    graph: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="6" cy="6" r="2.4"/><circle cx="18" cy="6" r="2.4"/><circle cx="6" cy="18" r="2.4"/><circle cx="18" cy="18" r="2.4"/><path d="M8 6h8M6 8v8M18 8v8M8 18h8M8 8l8 8"/></svg>',
    dp: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="1"/><path d="M3 9h18M3 15h18M9 3v18M15 3v18"/></svg>',
    recursion: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 12a8 8 0 1 1 8 8"/><path d="M4 12l3-3M4 12l3 3"/></svg>',
    star: '<svg viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M12 2l3.1 6.3 6.9 1-5 4.9 1.2 6.9L12 17.8 5.8 21l1.2-6.9-5-4.9 6.9-1z"/></svg>',
    starOutline: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 2l3.1 6.3 6.9 1-5 4.9 1.2 6.9L12 17.8 5.8 21l1.2-6.9-5-4.9 6.9-1z"/></svg>'
  };

  const ROUTES = [
    { id: 'home', label: 'Home', icon: 'home', group: 'Overview', desc: 'Landing page & algorithm picker' },
    { id: 'sorting', label: 'Sorting', icon: 'sort', group: 'Algorithms', module: () => SortingModule, key: '1' },
    { id: 'searching', label: 'Searching', icon: 'search', group: 'Algorithms', module: () => SearchingModule, key: '2' },
    { id: 'array', label: 'Array Algorithms', icon: 'array', group: 'Algorithms', module: () => ArrayModule, key: '3' },
    { id: 'recursion', label: 'Recursion', icon: 'recursion', group: 'Algorithms', module: () => RecursionModule, key: '4' },
    { id: 'linkedlist', label: 'Linked List', icon: 'list', group: 'Data Structures', module: () => LinkedListModule, key: '5' },
    { id: 'stack', label: 'Stack', icon: 'stack', group: 'Data Structures', module: () => StackModule, key: '6' },
    { id: 'queue', label: 'Queue', icon: 'queue', group: 'Data Structures', module: () => QueueModule, key: '7' },
    { id: 'tree', label: 'Trees', icon: 'tree', group: 'Data Structures', module: () => TreeModule, key: '8' },
    { id: 'graph', label: 'Graphs', icon: 'graph', group: 'Data Structures', module: () => GraphModule, key: '9' },
    { id: 'dp', label: 'Dynamic Programming', icon: 'dp', group: 'Advanced', module: () => DPModule, key: '0' }
  ];

  const state = {
    favorites: new Set(storage.get('dsa.favorites', [])),
    theme: storage.get('dsa.theme', 'dark'),
    current: null,
    mounted: new Set()
  };

  function applyTheme() {
    document.documentElement.setAttribute('data-theme', state.theme);
    storage.set('dsa.theme', state.theme);
  }

  function toggleFavorite(id) {
    if (state.favorites.has(id)) state.favorites.delete(id); else state.favorites.add(id);
    storage.set('dsa.favorites', Array.from(state.favorites));
    buildSidebar();
    if (state.current === 'home') renderHome();
  }

  /* ---------- Sidebar ---------- */
  function buildSidebar() {
    const sidebar = $('#sidebar');
    sidebar.innerHTML = '';
    const groups = {};
    ROUTES.forEach(r => { (groups[r.group] = groups[r.group] || []).push(r); });

    if (state.favorites.size) {
      const favGroup = el('div', { class: 'sidebar-group' }, [
        el('div', { class: 'sidebar-group-title', text: '★ Favorites' }),
        ...ROUTES.filter(r => state.favorites.has(r.id)).map(r => navItem(r))
      ]);
      sidebar.appendChild(favGroup);
    }

    Object.entries(groups).forEach(([groupName, items]) => {
      sidebar.appendChild(el('div', { class: 'sidebar-group' }, [
        el('div', { class: 'sidebar-group-title', text: groupName }),
        ...items.map(r => navItem(r))
      ]));
    });
  }

  function navItem(r) {
    const btn = el('button', { class: `nav-item ${state.current === r.id ? 'active' : ''}`, dataset: { route: r.id }, onclick: () => navigate(r.id) }, [
      el('span', { html: ICONS[r.icon] || '' }),
      el('span', { text: r.label, style: 'flex:1' }),
      r.key ? el('span', { class: 'kbd-hint', text: r.key }) : null
    ]);
    return btn;
  }

  /* ---------- Routing ---------- */
  function navigate(id) {
    state.current = id;
    $$('.nav-item').forEach(n => n.classList.toggle('active', n.dataset.route === id));
    $$('.view').forEach(v => v.classList.remove('active'));
    let view = $(`#view-${id}`);
    if (!view) {
      view = el('section', { class: 'view', id: `view-${id}` });
      $('#main').appendChild(view);
    }
    view.classList.add('active');
    const route = ROUTES.find(r => r.id === id);
    if (id === 'home') { renderHome(); }
    else if (route && route.module && !state.mounted.has(id)) {
      route.module().render(view);
      state.mounted.add(id);
    }
    closeMobileSidebar();
    window.scrollTo({ top: 0 });
    $('#main').scrollTo({ top: 0 });
  }

  /* ---------- Home / landing ---------- */
  function renderHome() {
    const view = $('#view-home');
    view.innerHTML = '';
    view.appendChild(el('div', { class: 'view-header' }, [
      el('div', {}, [
        el('h1', { text: 'DSA Visualizer' }),
        el('p', { class: 'view-desc', text: 'A debugger for data structures & algorithms — step through execution, watch every comparison, and read the pseudocode as it runs.' })
      ])
    ]));
    const grid = el('div', { class: 'card-grid' });
    ROUTES.filter(r => r.id !== 'home').forEach(r => {
      const isFav = state.favorites.has(r.id);
      grid.appendChild(el('div', { class: 'algo-card', onclick: () => navigate(r.id) }, [
        el('button', { class: `fav-btn ${isFav ? 'active' : ''}`, title: 'Toggle favorite', onclick: (e) => { e.stopPropagation(); toggleFavorite(r.id); } }, [
          el('span', { html: isFav ? ICONS.star : ICONS.starOutline })
        ]),
        el('div', { class: 'algo-icon', html: ICONS[r.icon] }),
        el('h4', { text: r.label }),
        el('p', { text: r.group })
      ]));
    });
    view.appendChild(grid);

    view.appendChild(el('div', { class: 'panel', style: 'margin-top:20px; max-width:520px;' }, [
      el('h3', { text: 'Keyboard Shortcuts' }),
      el('div', { class: 'shortcut-grid' }, [
        rowShortcut('Jump to section', '1–0'),
        rowShortcut('Focus search', '/'),
        rowShortcut('Toggle theme', 'T'),
        rowShortcut('Toggle sidebar (mobile)', 'M'),
        rowShortcut('Close panel / sidebar', 'Esc')
      ])
    ]));
  }
  function rowShortcut(label, key) {
    return el('div', { style: 'display:contents' }, [
      el('span', { style: 'color:var(--text-dim)', text: label }),
      el('span', { class: 'kbd', text: key })
    ]);
  }

  /* ---------- Search filter ---------- */
  function wireSearch() {
    const input = $('#topSearch');
    input.addEventListener('input', Utils.debounce(() => {
      const q = input.value.trim().toLowerCase();
      $$('.nav-item').forEach(item => {
        const label = item.textContent.toLowerCase();
        item.style.display = !q || label.includes(q) ? 'flex' : 'none';
      });
    }, 120));
  }

  /* ---------- Mobile sidebar ---------- */
  function openMobileSidebar() { $('#sidebar').classList.add('open'); $('#sidebarScrim').classList.add('open'); }
  function closeMobileSidebar() { $('#sidebar').classList.remove('open'); $('#sidebarScrim').classList.remove('open'); }

  /* ---------- Theme & fullscreen ---------- */
  function wireTopbar() {
    $('#themeSwitch').addEventListener('click', () => {
      state.theme = state.theme === 'dark' ? 'light' : 'dark';
      applyTheme();
    });
    $('#menuToggle').addEventListener('click', () => {
      $('#sidebar').classList.contains('open') ? closeMobileSidebar() : openMobileSidebar();
    });
    $('#sidebarScrim').addEventListener('click', closeMobileSidebar);
    $('#fullscreenBtn').addEventListener('click', () => {
      const stage = document.querySelector('.view.active .stage');
      if (!stage) { toast('No visualization to expand yet', 'info'); return; }
      if (!document.fullscreenElement) stage.requestFullscreen().catch(() => toast('Fullscreen not supported', 'error'));
      else document.exitFullscreen();
    });
  }

  /* ---------- Keyboard shortcuts ---------- */
  function wireShortcuts() {
    document.addEventListener('keydown', (e) => {
      const tag = (e.target.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'select' || tag === 'textarea') {
        if (e.key === 'Escape') e.target.blur();
        return;
      }
      if (e.key === '/') { e.preventDefault(); $('#topSearch').focus(); }
      else if (e.key.toLowerCase() === 't') { state.theme = state.theme === 'dark' ? 'light' : 'dark'; applyTheme(); }
      else if (e.key.toLowerCase() === 'm') { $('#sidebar').classList.contains('open') ? closeMobileSidebar() : openMobileSidebar(); }
      else if (e.key === 'Escape') closeMobileSidebar();
      else {
        const route = ROUTES.find(r => r.key === e.key);
        if (route) navigate(route.id);
      }
    });
  }

  /* ---------- Boot ---------- */
  function boot() {
    applyTheme();
    buildSidebar();
    wireSearch();
    wireTopbar();
    wireShortcuts();
    navigate('home');

    const splash = $('#splash');
    if (splash) setTimeout(() => { splash.style.opacity = '0'; setTimeout(() => splash.remove(), 400); }, 350);

    toast('DSA Visualizer ready — press / to search, 1–0 to jump.', 'success', 3500);
  }

  document.addEventListener('DOMContentLoaded', boot);
})();
