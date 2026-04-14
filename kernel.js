/* ════════════════════════════════════════════════════════════
   NEXUSOS — kernel.js — Quantum Core Engine
   ════════════════════════════════════════════════════════════ */

'use strict';

// ── Helpers ───────────────────────────────────────────────────────────────
let _wid = 0;
const genWinId = () => `w${++_wid}_${Date.now()}`;

// ════════════════════════════════════════════════════════════
// EventBus — lightweight pub/sub
// ════════════════════════════════════════════════════════════
class EventBus {
  constructor() { this._h = Object.create(null); }
  on(ev, fn)  { (this._h[ev] = this._h[ev] || []).push(fn); return this; }
  off(ev, fn) { this._h[ev] = (this._h[ev] || []).filter(h => h !== fn); }
  emit(ev, ...a) { (this._h[ev] || []).slice().forEach(fn => fn(...a)); }
}

// ════════════════════════════════════════════════════════════
// NexusFS — Virtual filesystem (persisted in localStorage)
// ════════════════════════════════════════════════════════════
class NexusFS {
  constructor() {
    this._data = null;
    this._load();
  }

  _load() {
    try {
      const raw = localStorage.getItem('nexusfs_v3');
      this._data = raw ? JSON.parse(raw) : this._defaultTree();
    } catch {
      this._data = this._defaultTree();
    }
  }

  _save() {
    try { localStorage.setItem('nexusfs_v3', JSON.stringify(this._data)); } catch {}
  }

  _defaultTree() {
    return {
      '/': { t: 'd', c: ['home', 'etc', 'usr', 'tmp', 'var'] },
      '/home': { t: 'd', c: ['user'] },
      '/home/user': { t: 'd', c: ['Documents', 'Downloads', 'Desktop', 'Pictures', 'Projects'] },
      '/home/user/Documents': { t: 'd', c: ['readme.txt', 'notes.txt', 'todo.txt'] },
      '/home/user/Documents/readme.txt': {
        t: 'f',
        d: `NexusOS 3.0.0 Quantum — Welcome!
═══════════════════════════════════════════
A next-generation web-based operating system
built for performance, aesthetics, and power.

Key Features:
  • Full virtual filesystem
  • Multi-window compositor
  • Built-in terminal shell
  • File explorer & text editor
  • System monitor with live metrics
  • App launcher & dock

Open the Terminal and type 'help' to get started.
Enjoy your NexusOS experience!
`
      },
      '/home/user/Documents/notes.txt': {
        t: 'f',
        d: `# My Notes
─────────────────
[2025-01-15] Set up NexusOS - absolutely incredible
[2025-01-16] Learned terminal commands
[2025-01-17] Customized settings - dark neon theme 🔥
[2025-01-18] Built first project in ~/Projects

# Shortcuts
  Super+Space  →  App Launcher
  Right-click  →  Desktop menu
`
      },
      '/home/user/Documents/todo.txt': { t: 'f', d: `TODO List\n─────────\n[ ] Explore NexusOS\n[ ] Open the terminal\n[x] Boot NexusOS for the first time` },
      '/home/user/Downloads': { t: 'd', c: [] },
      '/home/user/Desktop':   { t: 'd', c: [] },
      '/home/user/Pictures':  { t: 'd', c: [] },
      '/home/user/Projects':  { t: 'd', c: ['hello.js'] },
      '/home/user/Projects/hello.js': { t: 'f', d: `// NexusOS Project
// Hello, World!

function greet(name) {
  return \`Hello, \${name}! Welcome to NexusOS.\`;
}

console.log(greet('World'));
` },
      '/etc': { t: 'd', c: ['os-release', 'hostname', 'motd'] },
      '/etc/os-release': { t: 'f', d: `NAME="NexusOS"\nVERSION="3.0.0 Quantum"\nID=nexus\nHOME_URL="https://nexusos.io"\nPRETTY_NAME="NexusOS 3.0.0 Quantum"` },
      '/etc/hostname':   { t: 'f', d: 'nexus-machine' },
      '/etc/motd':       { t: 'f', d: 'Welcome to NexusOS 3.0.0 Quantum — Type "help" for commands.' },
      '/usr':     { t: 'd', c: ['bin', 'share', 'local'] },
      '/usr/bin': { t: 'd', c: [] },
      '/usr/share': { t: 'd', c: [] },
      '/usr/local': { t: 'd', c: [] },
      '/tmp': { t: 'd', c: [] },
      '/var': { t: 'd', c: ['log'] },
      '/var/log': { t: 'd', c: ['boot.log'] },
      '/var/log/boot.log': { t: 'f', d: '[OK] NexusKernel 3.0.0 loaded\n[OK] VFS mounted at /\n[OK] Network stack ready\n[OK] Window compositor started\n[OK] Desktop environment running' },
    };
  }

  // Resolve a path (relative or absolute) given a cwd
  resolve(path, cwd = '/home/user') {
    if (!path || path === '~') return '/home/user';
    if (path.startsWith('~/')) path = '/home/user' + path.slice(1);
    if (path.startsWith('/')) return ('/' + path.replace(/^\/+/, '').replace(/\/+$/, '')).replace(/\/\//g, '/') || '/';
    const parts = cwd.split('/').filter(Boolean);
    path.split('/').forEach(p => {
      if (p === '..' && parts.length) parts.pop();
      else if (p && p !== '.') parts.push(p);
    });
    return '/' + parts.join('/') || '/';
  }

  _node(path) { return this._data[path] || null; }
  _parent(path) { return path === '/' ? null : path.substring(0, path.lastIndexOf('/')) || '/'; }
  _basename(path) { return path.split('/').pop(); }

  exists(path, cwd) { return !!this._node(this.resolve(path, cwd)); }
  isDir(path, cwd)  { const n = this._node(this.resolve(path, cwd)); return n && n.t === 'd'; }
  isFile(path, cwd) { const n = this._node(this.resolve(path, cwd)); return n && n.t === 'f'; }

  ls(path, cwd) {
    const abs = this.resolve(path || '.', cwd);
    const node = this._node(abs);
    if (!node) return { err: `ls: ${path}: No such file or directory` };
    if (node.t === 'f') return { entries: [{ name: this._basename(abs), type: 'f' }] };
    const entries = (node.c || []).map(name => {
      const childAbs = (abs === '/' ? '' : abs) + '/' + name;
      const childNode = this._node(childAbs) || {};
      return { name, type: childNode.t || 'f' };
    });
    return { entries };
  }

  cat(path, cwd) {
    const abs = this.resolve(path, cwd);
    const node = this._node(abs);
    if (!node) return { err: `cat: ${path}: No such file or directory` };
    if (node.t === 'd') return { err: `cat: ${path}: Is a directory` };
    return { content: node.d || '' };
  }

  mkdir(path, cwd) {
    const abs = this.resolve(path, cwd);
    if (this._node(abs)) return { err: `mkdir: cannot create directory '${path}': File exists` };
    const par = this._parent(abs);
    if (!this._node(par)) return { err: `mkdir: cannot create directory '${path}': No such file or directory` };
    this._data[abs] = { t: 'd', c: [] };
    this._data[par].c.push(this._basename(abs));
    this._save();
    return { ok: true };
  }

  write(path, content, cwd) {
    const abs = this.resolve(path, cwd);
    const par = this._parent(abs);
    if (!this._node(par)) return { err: `No such directory: ${par}` };
    const isNew = !this._node(abs);
    this._data[abs] = { t: 'f', d: content };
    if (isNew) {
      if (!this._data[par].c) this._data[par].c = [];
      this._data[par].c.push(this._basename(abs));
    }
    this._save();
    return { ok: true };
  }

  rm(path, cwd) {
    const abs = this.resolve(path, cwd);
    if (!this._node(abs)) return { err: `rm: ${path}: No such file or directory` };
    const par = this._parent(abs);
    this._data[par].c = (this._data[par].c || []).filter(n => n !== this._basename(abs));
    delete this._data[abs];
    this._save();
    return { ok: true };
  }

  getChildren(path, cwd) {
    const abs = this.resolve(path, cwd);
    const node = this._node(abs);
    if (!node || node.t !== 'd') return [];
    return (node.c || []).map(name => {
      const childAbs = (abs === '/' ? '' : abs) + '/' + name;
      const cn = this._node(childAbs) || {};
      return { name, type: cn.t || 'f', path: childAbs };
    });
  }
}

// ════════════════════════════════════════════════════════════
// ProcessManager — simulates running processes
// ════════════════════════════════════════════════════════════
class ProcessManager {
  constructor() {
    this._procs = [];
    this._pid = 1000;
    this._sysProcs = [
      { name: 'kernel',   appId: 'sys' },
      { name: 'compositor', appId: 'sys' },
      { name: 'netd',     appId: 'sys' },
      { name: 'nexusfs',  appId: 'sys' },
    ];
    this._sysProcs.forEach(p => {
      p.pid = this._pid++;
      p.cpu = Math.random() * 6;
      p.mem = 8 + Math.random() * 24;
      p.started = Date.now() - Math.random() * 60000;
      this._procs.push(p);
    });
    setInterval(() => this._tick(), 1200);
  }

  _tick() {
    this._procs.forEach(p => {
      p.cpu = Math.max(0, Math.min(99, p.cpu + (Math.random() - 0.5) * 7));
      p.mem = Math.max(4, Math.min(500, p.mem + (Math.random() - 0.48) * 4));
    });
  }

  start(name, appId) {
    const proc = {
      pid: this._pid++, name, appId,
      cpu: 2 + Math.random() * 20,
      mem: 20 + Math.random() * 80,
      started: Date.now(),
    };
    this._procs.push(proc);
    return proc;
  }

  killByAppId(appId) { this._procs = this._procs.filter(p => p.appId !== appId || p.appId === 'sys'); }
  kill(pid)          { this._procs = this._procs.filter(p => p.pid !== pid); }
  getAll()           { return [...this._procs]; }

  totalCpu() {
    const t = this._procs.reduce((s, p) => s + p.cpu, 0);
    return Math.min(99, t / Math.max(1, this._procs.length) * 3.2);
  }
  totalMem() {
    return this._procs.reduce((s, p) => s + p.mem, 0);
  }
}

// ════════════════════════════════════════════════════════════
// WindowManager — creates, positions, and manages windows
// ════════════════════════════════════════════════════════════
class WindowManager {
  constructor(events) {
    this._ev = events;
    this._wins = new Map();
    this._z = 200;
    this._layer = null;
  }

  init() { this._layer = document.getElementById('windows-layer'); }

  create(opts) {
    const id = genWinId();
    const offset = (this._wins.size % 10) * 28;
    const cfg = {
      id,
      appId:     opts.appId || 'unknown',
      title:     opts.title || 'Window',
      icon:      opts.icon  || '⬡',
      content:   opts.content || '',
      width:     opts.width    || 700,
      height:    opts.height   || 480,
      minWidth:  opts.minWidth  || 320,
      minHeight: opts.minHeight || 200,
      x:         opts.x != null ? opts.x : 80 + offset,
      y:         opts.y != null ? opts.y : 50 + offset,
    };

    const el = this._buildEl(cfg);
    this._layer.appendChild(el);

    const win = { id, el, cfg, state: 'normal', savedBounds: null };
    this._wins.set(id, win);
    this.focus(id);
    this._ev.emit('win:created', win);
    return win;
  }

  _buildEl(cfg) {
    const el = document.createElement('div');
    el.id = cfg.id;
    el.className = 'nexus-win';
    el.style.cssText = `left:${cfg.x}px;top:${cfg.y}px;width:${cfg.width}px;height:${cfg.height}px;`;
    el.innerHTML = `
      <div class="win-titlebar" data-wid="${cfg.id}">
        <span class="win-tb-icon">${cfg.icon}</span>
        <span class="win-tb-title">${cfg.title}</span>
        <div class="win-controls">
          <button class="win-ctl win-close" data-act="close" data-wid="${cfg.id}" title="Close">
            <svg viewBox="0 0 8 8" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M1.5 1.5 6.5 6.5M6.5 1.5 1.5 6.5"/></svg>
          </button>
          <button class="win-ctl win-min" data-act="minimize" data-wid="${cfg.id}" title="Minimize">
            <svg viewBox="0 0 8 8" fill="currentColor"><rect y="3.5" width="8" height="1.5" rx="0.75"/></svg>
          </button>
          <button class="win-ctl win-max" data-act="maximize" data-wid="${cfg.id}" title="Maximize">
            <svg viewBox="0 0 8 8" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="1" y="1" width="6" height="6" rx="1"/></svg>
          </button>
        </div>
      </div>
      <div class="win-content" id="wc_${cfg.id}">${cfg.content}</div>
      <div class="win-resize" data-wid="${cfg.id}"></div>
    `;

    // Titlebar drag
    const tb = el.querySelector('.win-titlebar');
    this._initDrag(tb, cfg.id);

    // Button actions
    el.addEventListener('mousedown', e => {
      const btn = e.target.closest('[data-act]');
      if (!btn) return;
      e.stopPropagation();
      const act = btn.dataset.act, wid = btn.dataset.wid;
      if (act === 'close')    this.close(wid);
      if (act === 'minimize') this.minimize(wid);
      if (act === 'maximize') this.toggleMaximize(wid);
    });

    // Bring to front on click
    el.addEventListener('mousedown', () => this.focus(cfg.id));

    // Resize
    const rh = el.querySelector('.win-resize');
    this._initResize(rh, cfg.id);

    return el;
  }

  _initDrag(handle, wid) {
    let active = false, ox = 0, oy = 0, sl = 0, st = 0;

    handle.addEventListener('mousedown', e => {
      if (e.target.closest('.win-controls')) return;
      const win = this._wins.get(wid);
      if (!win || win.state === 'maximized') return;
      active = true;
      ox = e.clientX; oy = e.clientY;
      sl = win.el.offsetLeft; st = win.el.offsetTop;
      e.preventDefault();
    });

    const move = e => {
      if (!active) return;
      const win = this._wins.get(wid); if (!win) return;
      win.el.style.left = (sl + e.clientX - ox) + 'px';
      win.el.style.top  = Math.max(0, st + e.clientY - oy) + 'px';
    };
    const up = () => { active = false; };

    document.addEventListener('mousemove', move);
    document.addEventListener('mouseup',   up);
  }

  _initResize(handle, wid) {
    let active = false, ox = 0, oy = 0, sw = 0, sh = 0;

    handle.addEventListener('mousedown', e => {
      const win = this._wins.get(wid);
      if (!win || win.state === 'maximized') return;
      active = true;
      ox = e.clientX; oy = e.clientY;
      sw = win.el.offsetWidth; sh = win.el.offsetHeight;
      e.preventDefault(); e.stopPropagation();
    });

    const move = e => {
      if (!active) return;
      const win = this._wins.get(wid); if (!win) return;
      const nw = Math.max(win.cfg.minWidth,  sw + e.clientX - ox);
      const nh = Math.max(win.cfg.minHeight, sh + e.clientY - oy);
      win.el.style.width  = nw + 'px';
      win.el.style.height = nh + 'px';
    };
    const up = () => { active = false; };

    document.addEventListener('mousemove', move);
    document.addEventListener('mouseup',   up);
  }

  focus(wid) {
    const win = this._wins.get(wid); if (!win) return;
    this._wins.forEach(w => w.el.classList.remove('win-focused'));
    win.el.classList.add('win-focused');
    win.el.style.zIndex = ++this._z;
    this._ev.emit('win:focused', win);
  }

  minimize(wid) {
    const win = this._wins.get(wid); if (!win) return;
    win.state = 'minimized';
    win.el.classList.add('win-minimized');
    this._ev.emit('win:minimized', win);
  }

  restore(wid) {
    const win = this._wins.get(wid); if (!win) return;
    win.state = 'normal';
    win.el.classList.remove('win-minimized', 'win-maximized');
    if (win.savedBounds) {
      const b = win.savedBounds;
      win.el.style.left = b.l; win.el.style.top = b.t;
      win.el.style.width = b.w; win.el.style.height = b.h;
    }
    this.focus(wid);
    this._ev.emit('win:restored', win);
  }

  toggleMaximize(wid) {
    const win = this._wins.get(wid); if (!win) return;
    if (win.state === 'maximized') {
      win.state = 'normal';
      win.el.classList.remove('win-maximized');
      if (win.savedBounds) {
        const b = win.savedBounds;
        win.el.style.left = b.l; win.el.style.top = b.t;
        win.el.style.width = b.w; win.el.style.height = b.h;
      }
    } else {
      win.savedBounds = {
        l: win.el.style.left, t: win.el.style.top,
        w: win.el.style.width, h: win.el.style.height,
      };
      win.state = 'maximized';
      win.el.classList.add('win-maximized');
    }
    this._ev.emit('win:state', win);
  }

  close(wid) {
    const win = this._wins.get(wid); if (!win) return;
    win.el.classList.add('win-closing');
    win.el.addEventListener('animationend', () => win.el.remove(), { once: true });
    this._wins.delete(wid);
    this._ev.emit('win:closed', win);
  }

  getAll()          { return [...this._wins.values()]; }
  get(wid)          { return this._wins.get(wid); }
  isRunning(appId)  { return this.getAll().some(w => w.cfg.appId === appId); }
  getByApp(appId)   { return this.getAll().find(w => w.cfg.appId === appId) || null; }
}

// ════════════════════════════════════════════════════════════
// AppRegistry — app definitions store
// ════════════════════════════════════════════════════════════
class AppRegistry {
  constructor()         { this._apps = new Map(); }
  register(app)         { this._apps.set(app.id, app); }
  get(id)               { return this._apps.get(id) || null; }
  getAll()              { return [...this._apps.values()]; }
  search(query)         {
    const q = query.toLowerCase();
    return this.getAll().filter(a =>
      a.name.toLowerCase().includes(q) || (a.keywords || []).some(k => k.includes(q))
    );
  }
}

// ════════════════════════════════════════════════════════════
// NexusKernel — master orchestrator
// ════════════════════════════════════════════════════════════
class NexusKernel {
  constructor() {
    this.events = new EventBus();
    this.fs     = new NexusFS();
    this.wm     = new WindowManager(this.events);
    this.pm     = new ProcessManager();
    this.apps   = new AppRegistry();
    this.version = '3.0.0 Quantum';
  }

  launch(appId) {
    const app = this.apps.get(appId);
    if (!app) { console.warn(`[Nexus] App not found: ${appId}`); return null; }

    // Single-instance: focus existing window
    if (app.single && this.wm.isRunning(appId)) {
      const existing = this.wm.getByApp(appId);
      if (existing) {
        if (existing.state === 'minimized') this.wm.restore(existing.id);
        else this.wm.focus(existing.id);
        return existing;
      }
    }

    const proc = this.pm.start(app.name, appId);
    const content = typeof app.render === 'function' ? app.render(proc, this) : '';

    const win = this.wm.create({
      appId,
      title:     app.name,
      icon:      app.icon,
      content,
      width:     app.w || 720,
      height:    app.h || 500,
      minWidth:  app.minW || 320,
      minHeight: app.minH || 220,
      x:         app.x,
      y:         app.y,
    });

    if (typeof app.init === 'function') {
      requestAnimationFrame(() => app.init(win, proc, this));
    }

    this.events.emit('app:launched', { app, win, proc });
    return win;
  }

  notify(title, message, type = 'info') {
    this.events.emit('notification', { title, message, type, id: Date.now() });
  }

  async boot() {
    const bar    = document.getElementById('boot-bar');
    const status = document.getElementById('boot-status');
    const msgs   = [
      'Loading kernel modules…',
      'Initializing memory subsystem…',
      'Mounting virtual filesystem…',
      'Starting device manager…',
      'Loading display compositor…',
      'Initializing network stack…',
      'Starting window manager…',
      'Loading application layer…',
      'Applying user preferences…',
      'Starting NexusOS…',
    ];

    for (let i = 0; i < msgs.length; i++) {
      status.textContent = msgs[i];
      bar.style.width = ((i + 1) / msgs.length * 100) + '%';
      await delay(180 + Math.random() * 140);
    }

    await delay(400);

    // Transition
    const bootEl = document.getElementById('boot-screen');
    const deskEl = document.getElementById('desktop');
    bootEl.classList.add('boot-out');

    await delay(750);
    bootEl.style.display = 'none';
    deskEl.classList.remove('hidden');
    deskEl.classList.add('desk-in');

    this.wm.init();
    this.events.emit('kernel:ready');

    setTimeout(() => this.notify('NexusOS Ready', `NexusOS ${this.version} loaded successfully.`, 'success'), 800);
  }
}

// ── Utility ────────────────────────────────────────────────
const delay = ms => new Promise(r => setTimeout(r, ms));

// ── Expose global ──────────────────────────────────────────
window.Nexus = new NexusKernel();
