/* ==========================================================================
   UTILS — shared helpers used across every visualizer module.
   Exposed on the global `Utils` namespace (no bundler / ES modules needed,
   keeps this runnable by just opening index.html).
   ========================================================================== */

const Utils = (() => {

  /* ---------- DOM helpers ---------- */
  const $  = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

  const el = (tag, opts = {}, children = []) => {
    const node = document.createElement(tag);
    Object.entries(opts).forEach(([key, val]) => {
      if (key === 'class') node.className = val;
      else if (key === 'text') node.textContent = val;
      else if (key === 'html') node.innerHTML = val;
      else if (key.startsWith('on') && typeof val === 'function') node.addEventListener(key.slice(2), val);
      else if (key === 'dataset') Object.entries(val).forEach(([k, v]) => node.dataset[k] = v);
      else node.setAttribute(key, val);
    });
    children.forEach(c => c && node.appendChild(c));
    return node;
  };

  const sleep = (ms) => new Promise(res => setTimeout(res, ms));

  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  const debounce = (fn, wait = 200) => {
    let t;
    return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), wait); };
  };

  /* ---------- Random data ---------- */
  const randomArray = (size, min = 5, max = 100) =>
    Array.from({ length: size }, () => Math.floor(Math.random() * (max - min + 1)) + min);

  const randomUnique = (size, min = 1, max = 999) => {
    const set = new Set();
    while (set.size < size) set.add(Math.floor(Math.random() * (max - min + 1)) + min);
    return Array.from(set);
  };

  const shuffle = (arr) => {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  /* ---------- Toasts ---------- */
  let toastStack;
  const toast = (message, type = 'info', ms = 2600) => {
    if (!toastStack) toastStack = $('#toastStack');
    if (!toastStack) return;
    const t = el('div', { class: `toast ${type}`, text: message });
    toastStack.appendChild(t);
    setTimeout(() => {
      t.classList.add('fade-out');
      setTimeout(() => t.remove(), 260);
    }, ms);
  };

  /* ---------- LocalStorage helpers ---------- */
  const storage = {
    get(key, fallback = null) {
      try { const v = localStorage.getItem(key); return v === null ? fallback : JSON.parse(v); }
      catch { return fallback; }
    },
    set(key, value) {
      try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* quota / privacy mode */ }
    }
  };

  const formatTime = (ms) => {
    if (ms < 1000) return `${ms.toFixed(0)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  /* ==========================================================================
     STEP PLAYER
     A generic playback engine every visualizer builds on. Algorithms produce
     an array of "steps" up front: { line, desc, counters:{}, apply(render) }.
     The player just walks an index through that array, which gives every
     module play / pause / resume / step forward / step backward / reset /
     speed-control for free and keeps each algorithm file focused purely on
     *what happens*, not on *how it's played back*.
     ========================================================================== */
  class StepPlayer {
    /**
     * @param {Object} opts
     * @param {Function} opts.onRender  (step, index, total) => void   called for every frame shown
     * @param {Function} [opts.onDone]  () => void   called once playback reaches the final step
     * @param {Function} [opts.onStateChange] (playing:boolean) => void
     */
    constructor({ onRender, onDone, onStateChange } = {}) {
      this.steps = [];
      this.index = -1;
      this.playing = false;
      this.speed = 500; // ms per step, lower = faster
      this.timer = null;
      this.startedAt = null;
      this.elapsed = 0;
      this.onRender = onRender || (() => {});
      this.onDone = onDone || (() => {});
      this.onStateChange = onStateChange || (() => {});
    }

    load(steps) {
      this.pause();
      this.steps = steps;
      this.index = -1;
      this.elapsed = 0;
      if (this.steps.length) this.goto(0);
    }

    setSpeed(ms) { this.speed = ms; if (this.playing) { this._stopTimer(); this._runLoop(); } }

    goto(i) {
      this.index = clamp(i, 0, Math.max(0, this.steps.length - 1));
      const step = this.steps[this.index];
      if (step) this.onRender(step, this.index, this.steps.length);
    }

    stepForward() {
      if (this.index >= this.steps.length - 1) return false;
      this.goto(this.index + 1);
      if (this.index === this.steps.length - 1) this.onDone();
      return true;
    }

    stepBack() {
      if (this.index <= 0) return false;
      this.goto(this.index - 1);
      return true;
    }

    play() {
      if (this.playing || !this.steps.length) return;
      if (this.index >= this.steps.length - 1) this.goto(0);
      this.playing = true;
      this.startedAt = performance.now() - this.elapsed;
      this.onStateChange(true);
      this._runLoop();
    }

    pause() {
      this.playing = false;
      this._stopTimer();
      if (this.startedAt) this.elapsed = performance.now() - this.startedAt;
      this.onStateChange(false);
    }

    reset() {
      this.pause();
      this.elapsed = 0;
      this.goto(0);
    }

    _runLoop() {
      this._stopTimer();
      this.timer = setInterval(() => {
        const moved = this.stepForward();
        if (!moved) { this.pause(); }
      }, this.speed);
    }

    _stopTimer() { if (this.timer) { clearInterval(this.timer); this.timer = null; } }

    getElapsed() {
      if (this.playing && this.startedAt) return performance.now() - this.startedAt;
      return this.elapsed;
    }

    get currentStep() { return this.steps[this.index]; }
    get total() { return this.steps.length; }
  }

  return {
    $, $$, el, sleep, clamp, debounce,
    randomArray, randomUnique, shuffle,
    toast, storage, formatTime,
    StepPlayer
  };
})();
