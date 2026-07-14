/* ==========================================================================
   INTRO — boot sequence controller
   Draws an ambient particle field that resolves into a small graph
   cluster behind the wordmark, plays a terminal-style status log, then
   hands control back to main.js. Self-contained so it can be safely
   skipped (click / Esc / skip button / reduced-motion / repeat visit).
   ========================================================================== */

const BootIntro = (() => {
  const LINES = [
    'Initializing visualization engine…',
    'Loading algorithms…',
    'Building graph structures…',
    'Preparing learning environment…',
    'Welcome.'
  ];

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const easeOutCubic = t => 1 - Math.pow(1 - t, 3);

  /* ---------- Canvas scene: ambient drift + converging graph cluster ---------- */
  function runScene(canvas) {
    const ctx = canvas.getContext('2d');
    let w, h, dpr = Math.min(window.devicePixelRatio || 1, 2);
    let ambient = [];
    let cluster = [];
    let raf = null;
    let alive = true;
    const start = performance.now();

    const COLORS = ['255,138,61', '79,209,197', '140,124,255'];

    function resize() {
      w = canvas.clientWidth; h = canvas.clientHeight;
      canvas.width = w * dpr; canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const count = Math.max(30, Math.min(80, Math.round((w * h) / 20000)));
      ambient = Array.from({ length: count }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.22,
        vy: (Math.random() - 0.5) * 0.22,
        r: Math.random() * 1.3 + 0.5,
        phase: Math.random() * Math.PI * 2,
        c: COLORS[Math.floor(Math.random() * COLORS.length)]
      }));

      // A small ring of "graph nodes" that assemble behind the wordmark —
      // literal nod to "Building graph structures…" in the status log.
      const cx = w / 2, cy = h * 0.40;
      const radius = Math.max(70, Math.min(120, Math.min(w, h) * 0.14));
      const n = 9;
      cluster = Array.from({ length: n }, (_, i) => {
        const angle = (i / n) * Math.PI * 2 - Math.PI / 2;
        return {
          x0: cx + (Math.random() - 0.5) * w * 0.9,
          y0: cy + (Math.random() - 0.5) * h * 0.9,
          tx: cx + Math.cos(angle) * radius,
          ty: cy + Math.sin(angle) * radius,
          c: COLORS[i % COLORS.length],
          phase: Math.random() * Math.PI * 2
        };
      });
    }

    function frame(now) {
      if (!alive) return;
      const t = now - start;
      ctx.clearRect(0, 0, w, h);

      // Ambient drifting field, gently twinkling.
      for (const p of ambient) {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0 || p.x > w) p.vx *= -1;
        if (p.y < 0 || p.y > h) p.vy *= -1;
      }
      for (let i = 0; i < ambient.length; i++) {
        for (let j = i + 1; j < ambient.length; j++) {
          const a = ambient[i], b = ambient[j];
          const dx = a.x - b.x, dy = a.y - b.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 110) {
            ctx.strokeStyle = `rgba(140,150,180,${(1 - dist / 110) * 0.12})`;
            ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
          }
        }
      }
      ambient.forEach(p => {
        const twinkle = 0.5 + 0.5 * Math.sin(t / 600 + p.phase);
        ctx.beginPath();
        ctx.fillStyle = `rgba(${p.c},${0.25 + twinkle * 0.35})`;
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      });

      // Converging graph cluster — eases into a ring, then breathes gently.
      const formT = Math.min(1, t / 1500);
      const eased = easeOutCubic(formT);
      const pts = cluster.map(p => {
        const bob = formT >= 1 ? Math.sin(t / 900 + p.phase) * 3 : 0;
        return {
          x: p.x0 + (p.tx - p.x0) * eased,
          y: p.y0 + (p.ty - p.y0) * eased + bob,
          c: p.c
        };
      });
      const alpha = eased;
      for (let i = 0; i < pts.length; i++) {
        const a = pts[i], b = pts[(i + 1) % pts.length];
        ctx.strokeStyle = `rgba(180,190,220,${0.16 * alpha})`;
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      }
      pts.forEach(p => {
        const pulse = 0.7 + 0.3 * Math.sin(t / 500);
        ctx.beginPath();
        ctx.fillStyle = `rgba(${p.c},${alpha})`;
        ctx.shadowColor = `rgba(${p.c},0.9)`;
        ctx.shadowBlur = 10 * pulse * alpha;
        ctx.arc(p.x, p.y, 2.6, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.shadowBlur = 0;

      raf = requestAnimationFrame(frame);
    }

    resize();
    window.addEventListener('resize', resize);
    if (!reduceMotion) raf = requestAnimationFrame(frame); else ctx.clearRect(0, 0, w, h);

    return () => { alive = false; if (raf) cancelAnimationFrame(raf); window.removeEventListener('resize', resize); };
  }

  /* ---------- Terminal-style status log: types each line, then checks it off ---------- */
  function typeLines(logEl, announceEl, onAllDone) {
    const txt = logEl.querySelector('.txt');
    let li = 0, ci = 0;
    let timer = null;
    const timers = [];

    function typeChar() {
      const line = LINES[li];
      if (ci <= line.length) {
        txt.textContent = line.slice(0, ci);
        ci++;
        timer = setTimeout(typeChar, 16 + Math.random() * 22);
      } else {
        logEl.classList.add('line-done');
        announceEl.textContent = line;
        const hold = li === LINES.length - 1 ? 500 : 260;
        timer = setTimeout(() => {
          li++;
          if (li >= LINES.length) { onAllDone(); return; }
          ci = 0;
          logEl.classList.remove('line-done');
          typeChar();
        }, hold);
      }
      timers.push(timer);
    }

    typeChar();
    return () => timers.forEach(clearTimeout);
  }

  function play(onDone) {
    const root = document.getElementById('splash');
    if (!root) { onDone && onDone(); return; }

    // Already seen this session (or user prefers less motion)? Skip straight in.
    if (sessionStorage.getItem('dsa.introSeen') || reduceMotion) {
      root.remove();
      onDone && onDone();
      return;
    }

    const canvas = root.querySelector('.intro-canvas');
    const logEl = root.querySelector('#introLog');
    const bar = root.querySelector('#introBar');
    const pct = root.querySelector('#introPct');
    const announce = root.querySelector('#introAnnounce');
    const skipBtn = root.querySelector('.intro-skip');

    const stopScene = canvas ? runScene(canvas) : () => {};

    let finished = false;
    let progressTimer = null;
    let stopTyping = () => {};

    function updateProgress(target, duration) {
      const startVal = parseFloat(bar.style.width) || 0;
      const startTime = performance.now();
      clearInterval(progressTimer);
      progressTimer = setInterval(() => {
        const t = Math.min(1, (performance.now() - startTime) / duration);
        const val = startVal + (target - startVal) * easeOutCubic(t);
        bar.style.width = val + '%';
        pct.textContent = Math.round(val) + '%';
        if (t >= 1) clearInterval(progressTimer);
      }, 40);
    }

    function finish() {
      if (finished) return;
      finished = true;
      stopTyping();
      clearInterval(progressTimer);
      bar.style.width = '100%'; pct.textContent = '100%';
      stopScene();
      sessionStorage.setItem('dsa.introSeen', '1');
      root.classList.add('intro-out');
      setTimeout(() => { root.remove(); onDone && onDone(); }, 680);
    }

    // Roughly stage the progress bar with the log lines as they complete.
    const totalMs = 300 + LINES.reduce((s, l) => s + l.length * 26 + 260, 0) + 400;
    let elapsedTarget = 300;
    LINES.forEach((line) => {
      elapsedTarget += line.length * 26 + 260;
      const pctTarget = Math.round((elapsedTarget / totalMs) * 100);
      setTimeout(() => updateProgress(pctTarget, 350), elapsedTarget - 260);
    });

    setTimeout(() => {
      stopTyping = typeLines(logEl, announce, finish);
    }, 250);

    root.addEventListener('click', finish);
    skipBtn && skipBtn.addEventListener('click', (e) => { e.stopPropagation(); finish(); });
    document.addEventListener('keydown', function esc(e) {
      if (e.key === 'Escape') { finish(); document.removeEventListener('keydown', esc); }
    });
  }

  return { play };
})();
