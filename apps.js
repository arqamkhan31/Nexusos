/* ════════════════════════════════════════════════════════════
   NEXUSOS — apps.js — Built-in Application Suite
   ════════════════════════════════════════════════════════════ */

'use strict';

// ════════════════════════════════════════════════════════════
// TERMINAL
// ════════════════════════════════════════════════════════════
Nexus.apps.register({
  id: 'terminal', name: 'Terminal', icon: '🖥️',
  keywords: ['shell', 'bash', 'cmd', 'console', 'term'],
  w: 720, h: 480, minW: 380, minH: 240,

  render(proc) {
    return `
      <div class="term-app">
        <div class="term-output" id="tOut_${proc.pid}"></div>
        <div class="term-input-row">
          <span class="term-prompt" id="tPrompt_${proc.pid}">user@nexus:~$ </span>
          <input class="term-input" id="tIn_${proc.pid}" type="text"
            autocomplete="off" spellcheck="false" autocorrect="off">
        </div>
      </div>
    `;
  },

  init(win, proc, kernel) {
    const output   = win.el.querySelector(`#tOut_${proc.pid}`);
    const input    = win.el.querySelector(`#tIn_${proc.pid}`);
    const promptEl = win.el.querySelector(`#tPrompt_${proc.pid}`);

    let cwd     = '/home/user';
    let history = [];
    let histIdx = -1;

    const updatePrompt = () => {
      const short = cwd.replace('/home/user', '~');
      promptEl.textContent = `user@nexus:${short}$ `;
    };

    const print = (text, cls = 'term-line') => {
      const line = document.createElement('div');
      line.className = cls;
      line.textContent = text;
      output.appendChild(line);
      output.scrollTop = output.scrollHeight;
    };
    const printHTML = (html, cls = 'term-line') => {
      const line = document.createElement('div');
      line.className = cls;
      line.innerHTML = html;
      output.appendChild(line);
      output.scrollTop = output.scrollHeight;
    };

    // Welcome message
    print('NexusOS Terminal — v3.0.0 Quantum', 't-info term-line');
    print('Type "help" for available commands.', 't-dim term-line');
    print('', 'term-line');

    const CMDS = {
      help() {
        const cmds = [
          ['ls [path]',    'List directory contents'],
          ['cd [path]',    'Change directory'],
          ['pwd',          'Print working directory'],
          ['cat <file>',   'Show file contents'],
          ['mkdir <dir>',  'Create directory'],
          ['touch <file>', 'Create empty file'],
          ['rm <path>',    'Remove file or directory'],
          ['echo <text>',  'Print text to output'],
          ['clear',        'Clear terminal'],
          ['date',         'Show current date & time'],
          ['whoami',       'Print current user'],
          ['ps',           'List running processes'],
          ['neofetch',     'System information'],
          ['help',         'Show this help'],
        ];
        print('Available commands:', 't-info term-line');
        cmds.forEach(([cmd, desc]) => {
          printHTML(`  <span style="color:#00c6ff;min-width:140px;display:inline-block">${cmd}</span><span style="color:#4a6888">${desc}</span>`);
        });
      },
      ls(args) {
        const res = kernel.fs.ls(args[0] || '.', cwd);
        if (res.err) { print(res.err, 't-err term-line'); return; }
        if (!res.entries.length) { print('(empty directory)', 't-dim term-line'); return; }
        const dirs  = res.entries.filter(e => e.type === 'd').map(e => e.name + '/');
        const files = res.entries.filter(e => e.type !== 'd').map(e => e.name);
        if (dirs.length)  printHTML(dirs.map(d => `<span style="color:#00c6ff">${d}</span>`).join('  '));
        if (files.length) print(files.join('  '), 't-out term-line');
      },
      cd(args) {
        const target = args[0] || '/home/user';
        const abs = kernel.fs.resolve(target, cwd);
        if (!kernel.fs.isDir(abs)) {
          print(`cd: ${target}: No such directory`, 't-err term-line'); return;
        }
        cwd = abs;
        updatePrompt();
      },
      pwd() { print(cwd, 't-out term-line'); },
      cat(args) {
        if (!args[0]) { print('cat: missing operand', 't-err term-line'); return; }
        const res = kernel.fs.cat(args[0], cwd);
        if (res.err) { print(res.err, 't-err term-line'); return; }
        res.content.split('\n').forEach(l => print(l, 't-out term-line'));
      },
      mkdir(args) {
        if (!args[0]) { print('mkdir: missing operand', 't-err term-line'); return; }
        const r = kernel.fs.mkdir(args[0], cwd);
        if (r.err) print(r.err, 't-err term-line');
      },
      touch(args) {
        if (!args[0]) { print('touch: missing operand', 't-err term-line'); return; }
        const r = kernel.fs.write(args[0], '', cwd);
        if (r.err) print(r.err, 't-err term-line');
      },
      rm(args) {
        if (!args[0]) { print('rm: missing operand', 't-err term-line'); return; }
        const r = kernel.fs.rm(args[0], cwd);
        if (r.err) print(r.err, 't-err term-line');
      },
      echo(args) { print(args.join(' '), 't-out term-line'); },
      clear() { output.innerHTML = ''; },
      pwd() { print(cwd, 't-out term-line'); },
      date() { print(new Date().toString(), 't-out term-line'); },
      whoami() { print('user', 't-out term-line'); },
      ps() {
        print('  PID  NAME              CPU%   MEM(MB)', 't-info term-line');
        print('  ──────────────────────────────────────', 't-dim term-line');
        kernel.pm.getAll().forEach(p => {
          const pid  = String(p.pid).padStart(5);
          const name = p.name.padEnd(16);
          const cpu  = p.cpu.toFixed(1).padStart(6);
          const mem  = p.mem.toFixed(0).padStart(6);
          print(`  ${pid}  ${name}  ${cpu}%  ${mem}MB`, 't-out term-line');
        });
      },
      neofetch() {
        const art = [
          '    _   __                          ____  _____',
          '   / | / /__  _  ____  _______     / __ \\/ ___/',
          '  /  |/ / _ \\\\| |/_/ / / / ___/    / / / /\\__ \\',
          ' / /|  /  __/>  </ /_/ (__  )    / /_/ /___/ /',
          '/_/ |_/\\___/_/|_|\\__,_/____/    \\____//____/',
        ];
        art.forEach(l => print(l, 't-art term-line'));
        print('', 'term-line');
        const res = window.screen;
        const info = [
          ['OS',         `NexusOS ${kernel.version}`],
          ['Kernel',     'NexusKernel 3.0.0'],
          ['Shell',      'nexsh 2.1.0'],
          ['Resolution', `${res.width}x${res.height}`],
          ['WM',         'NexusWM Compositor'],
          ['Processes',  String(kernel.pm.getAll().length)],
          ['Memory',     `${kernel.pm.totalMem().toFixed(0)} MB`],
          ['Uptime',     '0d 0h 1m'],
        ];
        info.forEach(([k, v]) => {
          printHTML(`  <span style="color:#00c6ff;font-weight:700;min-width:110px;display:inline-block">${k}:</span><span style="color:#cce4f8">${v}</span>`);
        });
        print('', 'term-line');
      },
    };

    input.addEventListener('keydown', e => {
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (histIdx < history.length - 1) { histIdx++; input.value = history[histIdx] || ''; }
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (histIdx > -1) { histIdx--; input.value = histIdx >= 0 ? history[histIdx] : ''; }
      } else if (e.key === 'Enter') {
        const raw = input.value.trim();
        input.value = '';
        histIdx = -1;

        if (raw) history.unshift(raw);

        const short = cwd.replace('/home/user', '~');
        print(`user@nexus:${short}$ ${raw}`, 't-cmd term-line');

        if (!raw) return;
        const parts = raw.match(/(?:[^\s"']+|"[^"]*"|'[^']*')+/g) || [];
        const cmd   = parts[0].toLowerCase();
        const args  = parts.slice(1).map(a => a.replace(/^['"]|['"]$/g, ''));

        if (CMDS[cmd]) {
          try { CMDS[cmd](args); } catch (err) { print(String(err), 't-err term-line'); }
        } else {
          print(`nexsh: command not found: ${cmd}`, 't-err term-line');
        }
      }
    });

    // Auto-focus when window is clicked
    win.el.addEventListener('click', () => input.focus());
    input.focus();
    updatePrompt();
  },
});

// ════════════════════════════════════════════════════════════
// FILE EXPLORER
// ════════════════════════════════════════════════════════════
Nexus.apps.register({
  id: 'explorer', name: 'Files', icon: '📁',
  keywords: ['file', 'folder', 'browse', 'directory', 'explorer'],
  w: 780, h: 520, minW: 400, minH: 280,

  render(proc) {
    return `
      <div class="exp-app">
        <div class="exp-sidebar">
          <div class="exp-sb-title">Places</div>
          <div class="exp-sb-item" data-path="/home/user"><span class="exp-sb-ic">🏠</span> Home</div>
          <div class="exp-sb-item" data-path="/home/user/Documents"><span class="exp-sb-ic">📄</span> Documents</div>
          <div class="exp-sb-item" data-path="/home/user/Downloads"><span class="exp-sb-ic">📥</span> Downloads</div>
          <div class="exp-sb-item" data-path="/home/user/Desktop"><span class="exp-sb-ic">🖥️</span> Desktop</div>
          <div class="exp-sb-item" data-path="/home/user/Pictures"><span class="exp-sb-ic">🖼️</span> Pictures</div>
          <div class="exp-sb-item" data-path="/home/user/Projects"><span class="exp-sb-ic">💼</span> Projects</div>
          <div class="exp-sb-item" data-path="/"><span class="exp-sb-ic">💾</span> Root</div>
        </div>
        <div class="exp-main">
          <div class="exp-toolbar">
            <button class="exp-nav-btn" id="expBack_${proc.pid}" disabled>‹</button>
            <button class="exp-nav-btn" id="expFwd_${proc.pid}"  disabled>›</button>
            <div class="exp-breadcrumb" id="expCrumb_${proc.pid}"></div>
          </div>
          <div class="exp-files" id="expFiles_${proc.pid}"></div>
        </div>
      </div>
    `;
  },

  init(win, proc, kernel) {
    const filesEl = win.el.querySelector(`#expFiles_${proc.pid}`);
    const crumbEl = win.el.querySelector(`#expCrumb_${proc.pid}`);
    const backBtn = win.el.querySelector(`#expBack_${proc.pid}`);
    const fwdBtn  = win.el.querySelector(`#expFwd_${proc.pid}`);

    let cwd = '/home/user';
    let navHistory = [cwd];
    let navIdx     = 0;

    const iconFor = (name, type) => {
      if (type === 'd') return '📁';
      const ext = name.split('.').pop().toLowerCase();
      if (['txt','md','log'].includes(ext)) return '📄';
      if (['js','ts','py','sh','json','html','css'].includes(ext)) return '📝';
      if (['png','jpg','jpeg','gif','svg','webp'].includes(ext)) return '🖼️';
      return '📃';
    };

    const updateCrumb = () => {
      const parts = cwd === '/' ? [''] : cwd.split('/');
      const segments = [{ label: '/', path: '/' }];
      let built = '';
      cwd.split('/').filter(Boolean).forEach(p => {
        built += '/' + p;
        segments.push({ label: p, path: built });
      });
      crumbEl.innerHTML = segments.map((s, i) =>
        `<span class="exp-crumb" data-path="${s.path}">${s.label}</span>${i < segments.length - 1 ? '<span class="exp-crumb-sep"> / </span>' : ''}`
      ).join('');
      crumbEl.querySelectorAll('.exp-crumb').forEach(el => {
        el.addEventListener('click', () => navigate(el.dataset.path));
      });
    };

    const renderFiles = () => {
      const children = kernel.fs.getChildren(cwd);
      filesEl.innerHTML = '';
      if (!children.length) {
        filesEl.innerHTML = '<div class="exp-empty">This folder is empty</div>';
        return;
      }
      // Sort: dirs first, then files
      children.sort((a, b) => (a.type === 'd' ? 0 : 1) - (b.type === 'd' ? 0 : 1) || a.name.localeCompare(b.name));
      children.forEach(({ name, type, path }) => {
        const item = document.createElement('div');
        item.className = 'exp-item';
        item.innerHTML = `<div class="exp-item-icon">${iconFor(name, type)}</div><div class="exp-item-name">${name}</div>`;
        if (type === 'd') {
          item.addEventListener('dblclick', () => navigate(path));
        } else {
          item.addEventListener('dblclick', () => {
            const res = kernel.fs.cat(path);
            if (res.content != null) openInEditor(path, res.content, kernel);
          });
        }
        filesEl.appendChild(item);
      });
      updateCrumb();
      backBtn.disabled = navIdx <= 0;
      fwdBtn.disabled  = navIdx >= navHistory.length - 1;
    };

    const navigate = path => {
      if (!kernel.fs.isDir(path)) return;
      navHistory = navHistory.slice(0, navIdx + 1);
      navHistory.push(path);
      navIdx = navHistory.length - 1;
      cwd = path;
      renderFiles();

      win.el.querySelectorAll('.exp-sb-item').forEach(el => {
        el.classList.toggle('active', el.dataset.path === cwd);
      });
    };

    backBtn.addEventListener('click', () => {
      if (navIdx > 0) { navIdx--; cwd = navHistory[navIdx]; renderFiles(); }
    });
    fwdBtn.addEventListener('click', () => {
      if (navIdx < navHistory.length - 1) { navIdx++; cwd = navHistory[navIdx]; renderFiles(); }
    });

    win.el.querySelectorAll('.exp-sb-item').forEach(el => {
      el.addEventListener('click', () => navigate(el.dataset.path));
    });

    renderFiles();
  },
});

// ── helper: open file in editor ─────────────────────────────
function openInEditor(path, content, kernel) {
  const edWin = kernel.wm.getByApp('editor');
  if (edWin) {
    kernel.wm.focus(edWin.id);
    const ta = edWin.el.querySelector('.ed-textarea');
    const fn = edWin.el.querySelector('.ed-filename');
    if (ta) { ta.value = content; ta.dataset.path = path; }
    if (fn) fn.textContent = path.split('/').pop();
    return;
  }
  // launch with file pre-loaded (use a temp global hack)
  window._nexusEditorOpen = { path, content };
  kernel.launch('editor');
}

// ════════════════════════════════════════════════════════════
// TEXT EDITOR
// ════════════════════════════════════════════════════════════
Nexus.apps.register({
  id: 'editor', name: 'Text Editor', icon: '📝',
  keywords: ['text', 'edit', 'code', 'write', 'notepad'],
  w: 760, h: 520, minW: 380, minH: 260,

  render(proc) {
    return `
      <div class="editor-app">
        <div class="editor-toolbar">
          <button class="ed-btn" id="edNew_${proc.pid}">New</button>
          <button class="ed-btn" id="edSave_${proc.pid}">Save</button>
          <button class="ed-btn" id="edOpen_${proc.pid}">Open…</button>
          <div class="ed-filename" id="edFilename_${proc.pid}">Untitled</div>
          <span style="font-size:11px;color:var(--text-dim);font-family:'JetBrains Mono',monospace" id="edStatus_${proc.pid}"></span>
        </div>
        <div class="editor-body">
          <div class="ed-line-nums" id="edNums_${proc.pid}"><div class="ed-line-num">1</div></div>
          <textarea class="ed-textarea" id="edTa_${proc.pid}" spellcheck="false" wrap="off"></textarea>
        </div>
      </div>
    `;
  },

  init(win, proc, kernel) {
    const ta       = win.el.querySelector(`#edTa_${proc.pid}`);
    const filenameEl = win.el.querySelector(`#edFilename_${proc.pid}`);
    const statusEl = win.el.querySelector(`#edStatus_${proc.pid}`);
    const numsEl   = win.el.querySelector(`#edNums_${proc.pid}`);
    const newBtn   = win.el.querySelector(`#edNew_${proc.pid}`);
    const saveBtn  = win.el.querySelector(`#edSave_${proc.pid}`);
    const openBtn  = win.el.querySelector(`#edOpen_${proc.pid}`);

    let currentPath = null;
    let saved = true;

    const updateLines = () => {
      const count = (ta.value.match(/\n/g) || []).length + 1;
      numsEl.innerHTML = Array.from({ length: count }, (_, i) =>
        `<div class="ed-line-num">${i + 1}</div>`
      ).join('');
    };

    const markSaved = (s) => {
      saved = s;
      filenameEl.classList.toggle('unsaved', !s);
      statusEl.textContent = s ? '' : '● unsaved';
    };

    const setFile = (path, content) => {
      currentPath = path;
      ta.value = content || '';
      filenameEl.textContent = path ? path.split('/').pop() : 'Untitled';
      markSaved(true);
      updateLines();
    };

    // Check for pre-loaded file
    if (window._nexusEditorOpen) {
      const { path, content } = window._nexusEditorOpen;
      delete window._nexusEditorOpen;
      setFile(path, content);
    }

    ta.addEventListener('input', () => { markSaved(false); updateLines(); });
    ta.addEventListener('scroll', () => { numsEl.scrollTop = ta.scrollTop; });

    newBtn.addEventListener('click', () => {
      if (!saved && !confirm('Discard unsaved changes?')) return;
      setFile(null, '');
    });

    saveBtn.addEventListener('click', () => {
      if (!currentPath) {
        const name = prompt('Save as (path from /home/user/):', 'untitled.txt');
        if (!name) return;
        currentPath = kernel.fs.resolve(name, '/home/user');
        filenameEl.textContent = name.split('/').pop();
      }
      const r = kernel.fs.write(currentPath, ta.value);
      if (r.err) { kernel.notify('Save Error', r.err, 'error'); return; }
      markSaved(true);
      kernel.notify('File Saved', `Saved: ${currentPath.split('/').pop()}`, 'success');
    });

    openBtn.addEventListener('click', () => {
      const name = prompt('Open file (path from /home/user/):', 'Documents/readme.txt');
      if (!name) return;
      const path = kernel.fs.resolve(name, '/home/user');
      const res  = kernel.fs.cat(path);
      if (res.err) { kernel.notify('Open Error', res.err, 'error'); return; }
      setFile(path, res.content);
    });

    ta.addEventListener('keydown', e => {
      if (e.key === 'Tab') {
        e.preventDefault();
        const s = ta.selectionStart, end = ta.selectionEnd;
        ta.value = ta.value.substring(0, s) + '  ' + ta.value.substring(end);
        ta.selectionStart = ta.selectionEnd = s + 2;
        markSaved(false); updateLines();
      }
    });

    updateLines();
  },
});

// ════════════════════════════════════════════════════════════
// CALCULATOR
// ════════════════════════════════════════════════════════════
Nexus.apps.register({
  id: 'calculator', name: 'Calculator', icon: '🔢',
  keywords: ['calc', 'math', 'compute'],
  single: true, w: 320, h: 490, minW: 280, minH: 400,

  render(proc) {
    const btns = [
      ['AC','t-fn','AC'], ['±','t-fn','NEG'], ['%','t-fn','PCT'], ['÷','t-op','÷'],
      ['7','','7'],       ['8','','8'],       ['9','','9'],       ['×','t-op','×'],
      ['4','','4'],       ['5','','5'],       ['6','','6'],       ['−','t-op','−'],
      ['1','','1'],       ['2','','2'],       ['3','','3'],       ['+','t-op','+'],
      ['0','t-zero cb-zero','0'], ['.','','.'],  ['=','t-eq','='],
    ];
    const btnHtml = btns.map(([label, cls, val]) =>
      `<button class="calc-btn ${cls ? 'cb-' + cls.replace('t-','') : ''}" data-val="${val}">${label}</button>`
    ).join('');
    return `
      <div class="calc-app">
        <div class="calc-display">
          <div class="calc-expr" id="cExpr_${proc.pid}"></div>
          <div class="calc-current" id="cCur_${proc.pid}">0</div>
        </div>
        <div class="calc-grid" id="cGrid_${proc.pid}">${btnHtml}</div>
      </div>
    `;
  },

  init(win, proc) {
    const exprEl = win.el.querySelector(`#cExpr_${proc.pid}`);
    const curEl  = win.el.querySelector(`#cCur_${proc.pid}`);
    const grid   = win.el.querySelector(`#cGrid_${proc.pid}`);

    let cur = '0', prev = null, op = null, justEvaled = false;

    const setDisplay = (val) => {
      const str = String(val);
      curEl.textContent = str.length > 10 ? parseFloat(val).toPrecision(8) : str;
    };
    const setExpr = (e) => { exprEl.textContent = e; };

    grid.addEventListener('click', e => {
      const btn = e.target.closest('[data-val]');
      if (!btn) return;
      const val = btn.dataset.val;

      if (val === 'AC') {
        cur = '0'; prev = null; op = null; justEvaled = false;
        setDisplay('0'); setExpr(''); return;
      }
      if (val === 'NEG') {
        cur = String(parseFloat(cur) * -1 || 0);
        setDisplay(cur); return;
      }
      if (val === 'PCT') {
        cur = String(parseFloat(cur) / 100);
        setDisplay(cur); return;
      }
      if (['+','−','×','÷'].includes(val)) {
        if (op && !justEvaled) {
          const r = evaluate(parseFloat(prev), parseFloat(cur), op);
          cur = String(r); prev = String(r);
        } else {
          prev = cur;
        }
        op = val; justEvaled = false;
        setExpr(`${prev} ${val}`);
        setDisplay(cur);
        cur = '0';
        return;
      }
      if (val === '=') {
        if (!op || prev === null) return;
        const r = evaluate(parseFloat(prev), parseFloat(cur), op);
        setExpr(`${prev} ${op} ${cur} =`);
        cur = String(r); op = null; prev = null; justEvaled = true;
        setDisplay(cur); return;
      }
      if (val === '.') {
        if (justEvaled) { cur = '0'; justEvaled = false; }
        if (!cur.includes('.')) cur += '.';
        setDisplay(cur); return;
      }
      // Digit
      if (justEvaled) { cur = val; justEvaled = false; }
      else cur = cur === '0' ? val : cur + val;
      if (cur.length > 12) cur = cur.slice(0, 12);
      setDisplay(cur);
    });

    function evaluate(a, b, op) {
      if (op === '+') return round(a + b);
      if (op === '−') return round(a - b);
      if (op === '×') return round(a * b);
      if (op === '÷') return b === 0 ? 'Error' : round(a / b);
      return b;
    }
    function round(n) {
      if (typeof n !== 'number' || !isFinite(n)) return n;
      return parseFloat(n.toPrecision(12));
    }
  },
});

// ════════════════════════════════════════════════════════════
// SETTINGS
// ════════════════════════════════════════════════════════════
Nexus.apps.register({
  id: 'settings', name: 'Settings', icon: '⚙️',
  keywords: ['config', 'preferences', 'theme', 'wallpaper'],
  single: true, w: 720, h: 500, minW: 460, minH: 300,

  render(proc) {
    const wallpapers = [
      { id: 'space',   bg: 'linear-gradient(135deg,#050912 0%,#0a1540 50%,#050912 100%)', label: 'Deep Space' },
      { id: 'aurora',  bg: 'linear-gradient(135deg,#042a2b 0%,#0c4a3a 40%,#1a1040 100%)', label: 'Aurora' },
      { id: 'sunset',  bg: 'linear-gradient(135deg,#1a0a28 0%,#3d1060 40%,#6b0f2c 100%)', label: 'Nebula' },
      { id: 'ocean',   bg: 'linear-gradient(135deg,#021628 0%,#0a3060 50%,#041428 100%)', label: 'Deep Ocean' },
      { id: 'forest',  bg: 'linear-gradient(135deg,#050f0a 0%,#0a2518 50%,#050f0a 100%)', label: 'Forest' },
      { id: 'volcano', bg: 'linear-gradient(135deg,#100804 0%,#3a1a06 50%,#1a0808 100%)', label: 'Volcanic' },
      { id: 'ice',     bg: 'linear-gradient(135deg,#060c18 0%,#0c1c38 50%,#080e20 100%)', label: 'Arctic' },
      { id: 'blood',   bg: 'linear-gradient(135deg,#0c0208 0%,#2a0420 50%,#0c0208 100%)', label: 'Crimson' },
    ];
    const accents = [
      { id: 'cyan',    val: '#00c6ff' },
      { id: 'green',   val: '#00e676' },
      { id: 'purple',  val: '#a855f7' },
      { id: 'orange',  val: '#ff7043' },
      { id: 'pink',    val: '#f472b6' },
      { id: 'yellow',  val: '#fbbf24' },
      { id: 'red',     val: '#ef4444' },
      { id: 'teal',    val: '#2dd4bf' },
    ];

    const wpHtml = wallpapers.map(w =>
      `<div class="wp-swatch ${w.id === 'space' ? 'wp-active' : ''}" data-wp="${w.id}" style="background:${w.bg}" title="${w.label}"></div>`
    ).join('');
    const colHtml = accents.map(a =>
      `<div class="color-swatch ${a.id === 'cyan' ? 'col-active' : ''}" data-col="${a.id}" data-val="${a.val}" style="background:${a.val}" title="${a.id}"></div>`
    ).join('');

    return `
      <div class="settings-app">
        <div class="settings-nav">
          <div class="settings-nav-title">Settings</div>
          <div class="settings-nav-item active" data-panel="wallpaper"><span class="sn-ic">🖼️</span> Wallpaper</div>
          <div class="settings-nav-item" data-panel="theme"><span class="sn-ic">🎨</span> Appearance</div>
          <div class="settings-nav-item" data-panel="system"><span class="sn-ic">💻</span> System Info</div>
        </div>
        <div class="settings-content">
          <!-- Wallpaper Panel -->
          <div class="settings-panel active" data-panel="wallpaper">
            <div class="settings-h2">Wallpaper</div>
            <div class="settings-section">
              <div class="settings-h3">Presets</div>
              <div class="wp-grid" id="wpGrid_${proc.pid}">${wpHtml}</div>
            </div>
          </div>
          <!-- Theme Panel -->
          <div class="settings-panel" data-panel="theme">
            <div class="settings-h2">Appearance</div>
            <div class="settings-section">
              <div class="settings-h3">Accent Color</div>
              <div class="color-grid" id="colGrid_${proc.pid}">${colHtml}</div>
            </div>
          </div>
          <!-- System Panel -->
          <div class="settings-panel" data-panel="system">
            <div class="settings-h2">System Information</div>
            <div class="settings-section">
              ${[
                ['OS Name',     'NexusOS 3.0.0 Quantum'],
                ['Kernel',      'NexusKernel 3.0.0'],
                ['Architecture','x86_64'],
                ['Shell',       'nexsh 2.1.0'],
                ['Browser',     navigator.userAgent.match(/(Chrome|Firefox|Safari)\/[\d.]+/)?.[0] || navigator.appVersion.slice(0,30)],
                ['Screen',      `${screen.width}×${screen.height} @ ${window.devicePixelRatio || 1}x`],
                ['Language',    navigator.language || 'en-US'],
                ['Platform',    navigator.platform || 'Linux x86_64'],
              ].map(([k,v]) =>
                `<div class="sysinfo-row"><div class="sysinfo-key">${k}</div><div class="sysinfo-val">${v}</div></div>`
              ).join('')}
            </div>
          </div>
        </div>
      </div>
    `;
  },

  init(win, proc, kernel) {
    // Nav switching
    win.el.querySelectorAll('.settings-nav-item').forEach(item => {
      item.addEventListener('click', () => {
        win.el.querySelectorAll('.settings-nav-item').forEach(i => i.classList.remove('active'));
        win.el.querySelectorAll('.settings-panel').forEach(p => p.classList.remove('active'));
        item.classList.add('active');
        const target = item.dataset.panel;
        win.el.querySelector(`.settings-panel[data-panel="${target}"]`).classList.add('active');
      });
    });

    // Wallpaper swatches
    const wpGrid = win.el.querySelector(`#wpGrid_${proc.pid}`);
    if (wpGrid) {
      wpGrid.addEventListener('click', e => {
        const sw = e.target.closest('.wp-swatch'); if (!sw) return;
        wpGrid.querySelectorAll('.wp-swatch').forEach(s => s.classList.remove('wp-active'));
        sw.classList.add('wp-active');
        const bg = sw.style.background;
        document.getElementById('desk-bg').style.setProperty('--custom-bg', bg);
        const blobs = document.querySelectorAll('.bg-blob');
        blobs.forEach(b => b.style.opacity = '0');
        const dbg = document.getElementById('desk-bg');
        dbg.style.background = bg;
        // Fade back blobs
        setTimeout(() => blobs.forEach(b => b.style.opacity = '1'), 300);
        kernel.notify('Wallpaper Changed', `Wallpaper updated to "${sw.title}"`, 'info');
      });
    }

    // Accent colors
    const colGrid = win.el.querySelector(`#colGrid_${proc.pid}`);
    if (colGrid) {
      colGrid.addEventListener('click', e => {
        const sw = e.target.closest('.color-swatch'); if (!sw) return;
        colGrid.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('col-active'));
        sw.classList.add('col-active');
        document.documentElement.style.setProperty('--accent', sw.dataset.val);
        kernel.notify('Accent Changed', `Accent color set to ${sw.title}`, 'info');
      });
    }
  },
});

// ════════════════════════════════════════════════════════════
// SYSTEM MONITOR
// ════════════════════════════════════════════════════════════
Nexus.apps.register({
  id: 'sysmon', name: 'System Monitor', icon: '📊',
  keywords: ['system', 'monitor', 'performance', 'process', 'cpu', 'ram'],
  single: true, w: 680, h: 520, minW: 400, minH: 300,

  render(proc) {
    return `
      <div class="sysmon-app">
        <div class="sysmon-stats" id="smStats_${proc.pid}">
          <div class="stat-card">
            <div class="stat-label">CPU Usage</div>
            <div class="stat-value" id="smCpu_${proc.pid}">0 <span>%</span></div>
            <div class="stat-bar-track"><div class="stat-bar-fill" id="smCpuBar_${proc.pid}" style="width:0%"></div></div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Memory</div>
            <div class="stat-value" id="smMem_${proc.pid}">0 <span>MB</span></div>
            <div class="stat-bar-track"><div class="stat-bar-fill" id="smMemBar_${proc.pid}" style="width:0%"></div></div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Processes</div>
            <div class="stat-value" id="smProc_${proc.pid}">0 <span>total</span></div>
            <div class="stat-bar-track"><div class="stat-bar-fill" id="smProcBar_${proc.pid}" style="width:30%"></div></div>
          </div>
        </div>
        <div class="sysmon-procs">
          <div class="proc-table-head">
            <span>PID</span><span>Name</span><span>CPU%</span><span>Mem(MB)</span>
          </div>
          <div class="proc-table-body" id="smProcList_${proc.pid}"></div>
        </div>
      </div>
    `;
  },

  init(win, proc, kernel) {
    const cpuEl    = win.el.querySelector(`#smCpu_${proc.pid}`);
    const cpuBar   = win.el.querySelector(`#smCpuBar_${proc.pid}`);
    const memEl    = win.el.querySelector(`#smMem_${proc.pid}`);
    const memBar   = win.el.querySelector(`#smMemBar_${proc.pid}`);
    const procEl   = win.el.querySelector(`#smProc_${proc.pid}`);
    const procBar  = win.el.querySelector(`#smProcBar_${proc.pid}`);
    const listEl   = win.el.querySelector(`#smProcList_${proc.pid}`);
    const MAX_MEM  = 512;

    let alive = true;
    const tick = () => {
      if (!alive || !win.el.isConnected) { alive = false; return; }
      const procs = kernel.pm.getAll();
      const cpu   = kernel.pm.totalCpu();
      const mem   = kernel.pm.totalMem();

      cpuEl.innerHTML  = `${cpu.toFixed(1)} <span>%</span>`;
      cpuBar.style.width = `${Math.min(100, cpu)}%`;
      memEl.innerHTML  = `${mem.toFixed(0)} <span>MB</span>`;
      memBar.style.width = `${Math.min(100, mem / MAX_MEM * 100)}%`;
      procEl.innerHTML = `${procs.length} <span>total</span>`;
      procBar.style.width = `${Math.min(100, procs.length / 20 * 100)}%`;

      listEl.innerHTML = procs
        .sort((a, b) => b.cpu - a.cpu)
        .map(p => `
          <div class="proc-row">
            <span class="proc-pid">${p.pid}</span>
            <span class="proc-name">${p.name}</span>
            <span class="proc-cpu">${p.cpu.toFixed(1)}%</span>
            <span class="proc-mem">${p.mem.toFixed(0)}</span>
          </div>
        `).join('');

      setTimeout(tick, 1000);
    };

    kernel.events.on('win:closed', w => { if (w.id === win.id) alive = false; });
    tick();
  },
});
