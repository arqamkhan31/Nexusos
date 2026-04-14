'use strict';

/* ════════════════════════════════════════════════════════════
   NEXUSOS 3.1 — apps.js — Full Application Suite w/ Real AI
   ════════════════════════════════════════════════════════════ */

// ── Shared helpers ─────────────────────────────────────────
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
  window._nexusEditorOpen = { path, content };
  kernel.launch('editor');
}

// ════════════════════════════════════════════════════════════
// 1. TERMINAL — Full Shell
// ════════════════════════════════════════════════════════════
Nexus.apps.register({
  id:'terminal', name:'Terminal', icon:'🖥️',
  keywords:['shell','bash','cmd','console','term'],
  w:740, h:500, minW:380, minH:240,

  render(proc) {
    return `<div class="term-app">
      <div class="term-output" id="tOut_${proc.pid}"></div>
      <div class="term-input-row">
        <span class="term-prompt" id="tPrompt_${proc.pid}">user@nexus:~$ </span>
        <input class="term-input" id="tIn_${proc.pid}" type="text" autocomplete="off" spellcheck="false">
      </div>
    </div>`;
  },

  init(win, proc, kernel) {
    const output   = win.el.querySelector(`#tOut_${proc.pid}`);
    const input    = win.el.querySelector(`#tIn_${proc.pid}`);
    const promptEl = win.el.querySelector(`#tPrompt_${proc.pid}`);
    let cwd = '/home/user', history = [], histIdx = -1;

    const updatePrompt = () => {
      promptEl.textContent = `user@nexus:${cwd.replace('/home/user','~')}$ `;
    };
    const printLine = (text, cls = 'term-line') => {
      const d = document.createElement('div');
      d.className = `term-line ${cls}`;
      d.textContent = text;
      output.appendChild(d);
      output.scrollTop = output.scrollHeight;
    };
    const printHTML = (html, cls = 'term-line') => {
      const d = document.createElement('div');
      d.className = `term-line ${cls}`;
      d.innerHTML = html;
      output.appendChild(d);
      output.scrollTop = output.scrollHeight;
    };
    const printBlank = () => printLine('');

    // Welcome
    printHTML(`<span style="color:#8b5cf6">┌──────────────────────────────────────────┐</span>`);
    printHTML(`<span style="color:#8b5cf6">│</span>  <span style="color:#00c6ff;font-weight:700">NexusOS Terminal</span> <span style="color:#4a6888">v3.1.0 Quantum</span>        <span style="color:#8b5cf6">│</span>`);
    printHTML(`<span style="color:#8b5cf6">│</span>  Type <span style="color:#00e676">help</span> for commands. <span style="color:#4a6888">Ctrl+L</span> to clear.  <span style="color:#8b5cf6">│</span>`);
    printHTML(`<span style="color:#8b5cf6">└──────────────────────────────────────────┘</span>`);
    printBlank();

    // Tab-completion state
    let tabMatches = [], tabIdx = 0, tabBase = '';

    const CMDS = {
      help() {
        const cmds = [
          ['ls [path]',         'List directory contents'],
          ['cd [path]',         'Change directory'],
          ['pwd',               'Print working directory'],
          ['cat <file>',        'Show file contents'],
          ['mkdir <dir>',       'Create directory'],
          ['touch <file>',      'Create empty file'],
          ['rm <file>',         'Remove file'],
          ['cp <src> <dst>',    'Copy file'],
          ['mv <src> <dst>',    'Move/rename file'],
          ['echo <text>',       'Print text'],
          ['write <f> <text>',  'Write text to file'],
          ['find <name>',       'Find files by name'],
          ['grep <pat> <file>', 'Search text in file'],
          ['wc <file>',         'Word/line count'],
          ['history',           'Show command history'],
          ['clear',             'Clear terminal'],
          ['date',              'Current date & time'],
          ['whoami',            'Current user'],
          ['hostname',          'Machine hostname'],
          ['uname',             'System info'],
          ['ps',                'Running processes'],
          ['df',                'Disk usage'],
          ['uptime',            'System uptime'],
          ['env',               'Environment variables'],
          ['js <expr>',         'Evaluate JavaScript'],
          ['open <app>',        'Launch NexusOS app'],
          ['neofetch',          'System art + info'],
          ['banner <text>',     'Print big text'],
          ['help',              'Show this help'],
        ];
        printHTML(`<span style="color:#00c6ff;font-weight:700">Available Commands:</span>`);
        cmds.forEach(([cmd, desc]) => {
          printHTML(`  <span style="color:#a78bfa;min-width:180px;display:inline-block">${cmd.padEnd(24)}</span><span style="color:#4a6888">${desc}</span>`);
        });
      },

      ls(args) {
        const path = args[0] || '.';
        const res = kernel.fs.ls(path, cwd);
        if (res.err) { printLine(res.err, 't-err'); return; }
        if (!res.entries.length) { printLine('(empty)', 't-dim'); return; }
        const dirs  = res.entries.filter(e => e.type === 'd');
        const files = res.entries.filter(e => e.type !== 'd');
        let line = '';
        dirs.forEach(e => { line += `<span style="color:#00c6ff;font-weight:600">${e.name}/</span>  `; });
        files.forEach(e => { line += `<span style="color:#cce4f8">${e.name}</span>  `; });
        if (line) printHTML(line);
      },

      cd(args) {
        const t = args[0] || '/home/user';
        const abs = kernel.fs.resolve(t, cwd);
        if (!kernel.fs.isDir(abs)) { printLine(`cd: ${t}: No such directory`, 't-err'); return; }
        cwd = abs; updatePrompt();
      },

      pwd() { printLine(cwd, 't-out'); },

      cat(args) {
        if (!args[0]) { printLine('cat: missing operand', 't-err'); return; }
        const r = kernel.fs.cat(args[0], cwd);
        if (r.err) { printLine(r.err, 't-err'); return; }
        r.content.split('\n').forEach(l => printLine(l, 't-out'));
      },

      mkdir(args) {
        if (!args[0]) { printLine('mkdir: missing operand', 't-err'); return; }
        const r = kernel.fs.mkdir(args[0], cwd);
        if (r.err) printLine(r.err, 't-err');
        else printLine(`Directory created: ${args[0]}`, 't-suc');
      },

      touch(args) {
        if (!args[0]) { printLine('touch: missing operand', 't-err'); return; }
        const r = kernel.fs.write(args[0], '', cwd);
        if (r.err) printLine(r.err, 't-err');
      },

      rm(args) {
        if (!args[0]) { printLine('rm: missing operand', 't-err'); return; }
        const r = kernel.fs.rm(args[0], cwd);
        if (r.err) printLine(r.err, 't-err');
        else printLine(`Removed: ${args[0]}`, 't-dim');
      },

      cp(args) {
        if (!args[1]) { printLine('cp: missing operand', 't-err'); return; }
        const r = kernel.fs.cat(args[0], cwd);
        if (r.err) { printLine(r.err, 't-err'); return; }
        const w = kernel.fs.write(args[1], r.content, cwd);
        if (w.err) printLine(w.err, 't-err');
        else printLine(`${args[0]} → ${args[1]}`, 't-suc');
      },

      mv(args) {
        if (!args[1]) { printLine('mv: missing operand', 't-err'); return; }
        const r = kernel.fs.cat(args[0], cwd);
        if (r.err) { printLine(r.err, 't-err'); return; }
        kernel.fs.write(args[1], r.content, cwd);
        kernel.fs.rm(args[0], cwd);
        printLine(`${args[0]} → ${args[1]}`, 't-suc');
      },

      echo(args) { printLine(args.join(' '), 't-out'); },

      write(args) {
        if (args.length < 2) { printLine('write: write <file> <text…>', 't-err'); return; }
        const r = kernel.fs.write(args[0], args.slice(1).join(' '), cwd);
        if (r.err) printLine(r.err, 't-err');
        else printLine(`Written to ${args[0]}`, 't-suc');
      },

      find(args) {
        if (!args[0]) { printLine('find: missing pattern', 't-err'); return; }
        const pat = args[0].toLowerCase();
        const search = (path) => {
          const children = kernel.fs.getChildren(path);
          children.forEach(c => {
            if (c.name.toLowerCase().includes(pat)) printLine(c.path, 't-out');
            if (c.type === 'd') search(c.path);
          });
        };
        search('/');
      },

      grep(args) {
        if (args.length < 2) { printLine('grep: grep <pattern> <file>', 't-err'); return; }
        const [pat, file] = args;
        const r = kernel.fs.cat(file, cwd);
        if (r.err) { printLine(r.err, 't-err'); return; }
        const re = new RegExp(pat, 'gi');
        let found = false;
        r.content.split('\n').forEach((line, i) => {
          if (re.test(line)) {
            const hl = line.replace(re, m => `\x1b[${m}\x1b]`);
            printHTML(`<span style="color:#4a6888">${String(i+1).padStart(3)}:</span> ${line.replace(re, `<span style="color:#ffbb00;font-weight:700">$&</span>`)}`);
            found = true;
          }
        });
        if (!found) printLine('(no matches)', 't-dim');
      },

      wc(args) {
        if (!args[0]) { printLine('wc: missing file', 't-err'); return; }
        const r = kernel.fs.cat(args[0], cwd);
        if (r.err) { printLine(r.err, 't-err'); return; }
        const lines = r.content.split('\n').length;
        const words = r.content.split(/\s+/).filter(Boolean).length;
        const chars = r.content.length;
        printHTML(`  <span style="color:#00c6ff">${lines}</span> lines  <span style="color:#a78bfa">${words}</span> words  <span style="color:#cce4f8">${chars}</span> chars  <span style="color:#4a6888">${args[0]}</span>`);
      },

      history() {
        if (!history.length) { printLine('(no history)', 't-dim'); return; }
        history.slice().reverse().slice(0, 30).forEach((cmd, i) => {
          printHTML(`  <span style="color:#4a6888">${String(i+1).padStart(3)}</span>  ${cmd}`);
        });
      },

      clear() { output.innerHTML = ''; },
      date()  { printLine(new Date().toString(), 't-out'); },
      whoami(){ printLine('user', 't-out'); },

      hostname() {
        const r = kernel.fs.cat('/etc/hostname');
        printLine(r.content || 'nexus-machine', 't-out');
      },

      uname(args) {
        const full = args.includes('-a');
        printLine(full
          ? 'NexusOS nexus-machine 3.1.0-quantum #1 SMP x86_64 GNU/Linux'
          : 'NexusOS', 't-out');
      },

      ps() {
        printHTML(`  <span style="color:#00c6ff">PID   NAME              CPU%   MEM(MB)</span>`);
        printLine('  ─────────────────────────────────────', 't-dim');
        kernel.pm.getAll().forEach(p => {
          printHTML(`  <span style="color:#a78bfa">${String(p.pid).padStart(5)}</span>  <span style="color:#cce4f8">${p.name.padEnd(16)}</span>  <span style="color:#00c6ff">${p.cpu.toFixed(1).padStart(5)}%</span>  <span style="color:#4a6888">${p.mem.toFixed(0).padStart(6)}MB</span>`);
        });
      },

      df() {
        printHTML(`<span style="color:#00c6ff">Filesystem     Size    Used    Avail    Use%</span>`);
        printLine('──────────────────────────────────────────', 't-dim');
        printLine('/dev/nexfs      100G    4.2G    95.8G     4%', 't-out');
        printLine('tmpfs           8.0G      0B     8.0G     0%', 't-out');
      },

      uptime() {
        const now = new Date();
        printLine(`up ${Math.floor(now.getSeconds()/60)}m, 1 user,  load average: ${(Math.random()*1.5).toFixed(2)}, ${(Math.random()).toFixed(2)}, ${(Math.random()).toFixed(2)}`, 't-out');
      },

      env() {
        const vars = [
          ['USER','user'], ['HOME','/home/user'], ['SHELL','/bin/nexsh'],
          ['TERM','nexterm-256color'], ['LANG','en_US.UTF-8'],
          ['PATH','/usr/bin:/usr/local/bin:/bin'],
          ['EDITOR','nexedit'], ['OS','NexusOS 3.1.0'],
        ];
        vars.forEach(([k,v]) => printHTML(`<span style="color:#a78bfa">${k}</span>=<span style="color:#00c6ff">${v}</span>`));
      },

      js(args) {
        if (!args.length) { printLine('js: js <expression>', 't-err'); return; }
        const expr = args.join(' ');
        try {
          // eslint-disable-next-line no-eval
          const result = Function('"use strict"; return (' + expr + ')')();
          printHTML(`<span style="color:#4a6888">← </span><span style="color:#00e676">${JSON.stringify(result, null, 2)}</span>`);
        } catch(e) {
          printLine(`JS Error: ${e.message}`, 't-err');
        }
      },

      open(args) {
        const id = args[0];
        if (!id) { printLine('open: open <app-id>', 't-err'); return; }
        const app = kernel.apps.get(id);
        if (!app) { printLine(`open: unknown app: ${id}`, 't-err'); return; }
        kernel.launch(id);
        printLine(`Launched: ${app.name}`, 't-suc');
      },

      neofetch() {
        const art = [
          '    _   __                          ____  _____',
          '   / | / /__  _  ____  _______     / __ \\/ ___/',
          '  /  |/ / _ \\| |/_/ / / / ___/    / / / /\\__ \\ ',
          ' / /|  /  __/>  </ /_/ (__  )    / /_/ /___/ / ',
          '/_/ |_/\\___/_/|_|\\__,_/____/    \\____//____/  ',
        ];
        art.forEach(l => printLine(l, 't-art'));
        printBlank();
        const info = [
          ['OS',         `NexusOS ${kernel.version}`],
          ['Kernel',     'NexusKernel 3.1.0-quantum'],
          ['Shell',      'nexsh 2.1.0'],
          ['Resolution', `${screen.width}×${screen.height}`],
          ['WM',         'NexusWM Compositor v2'],
          ['AI',         'Claude Sonnet — Active'],
          ['Processes',  String(kernel.pm.getAll().length)],
          ['Memory',     `${kernel.pm.totalMem().toFixed(0)} MB`],
        ];
        info.forEach(([k,v]) => printHTML(`  <span style="color:#00c6ff;font-weight:700;min-width:110px;display:inline-block">${k}:</span><span style="color:#cce4f8">${v}</span>`));
        printBlank();
      },

      banner(args) {
        const text = (args.join(' ') || 'NEXUS').toUpperCase().slice(0, 10);
        const lines = ['','','','',''];
        const FONT = {
          'A':['┌─┐','├─┤','┘ └'],'B':['┌┐','├┤','└┘'],'C':['┌─','│ ','└─'],'D':['┌┐','││','└┘'],
          'E':['┌─','├─','└─'],'F':['┌─','├─','│ '],'G':['┌─','│─','└─'],'H':['┐ ┌','├─┤','┘ └'],
          'I':['─┬─',' │ ','─┴─'],'J':['─┐','  │','└─┘'],'K':['┐ ┌','├─┤','┘ └'],'L':['│ ','│ ','└─'],
          'M':['┌─┌','│ │','┘ └'],'N':['┌┐ ','│└┐','┘ └'],'O':['┌─┐','│ │','└─┘'],'P':['┌─┐','├─┘','│  '],
          'Q':['┌─┐','│ │','└─▪'],'R':['┌─┐','├┬┘','┘└ '],'S':['┌─','└─┐','─┘'],'T':['─┬─',' │ ',' └ '],
          'U':['┐ ┌','│ │','└─┘'],'V':['┐ ┌','│ │',' └ '],'W':['┐ ┐','│ │','└┘└'],'X':['┐ ┌',' ╳ ','┘ └'],
          'Y':['┐ ┌',' ┼ ',' ┘ '],'Z':['─┐',' ╱','└─'],' ':['   ','   ','   '],
        };
        [...text].forEach(ch => {
          const rows = FONT[ch] || FONT[' '];
          rows.forEach((r, i) => { lines[i] = (lines[i] || '') + r + ' '; });
        });
        lines.filter(Boolean).forEach(l => printLine(l, 't-art'));
      },
    };

    input.addEventListener('keydown', e => {
      if (e.key === 'Tab') {
        e.preventDefault();
        const val = input.value;
        const parts = val.trimStart().split(' ');
        const last = parts[parts.length - 1];

        if (tabBase !== last) {
          tabBase = last;
          tabIdx  = 0;
          const children = kernel.fs.getChildren(cwd).map(c => c.name);
          tabMatches = children.filter(n => n.startsWith(last));
        }
        if (tabMatches.length) {
          const match = tabMatches[tabIdx % tabMatches.length];
          parts[parts.length - 1] = match;
          input.value = parts.join(' ');
          tabIdx++;
        }
        return;
      }
      tabBase = ''; tabIdx = 0; tabMatches = [];

      if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (histIdx < history.length - 1) { histIdx++; input.value = history[histIdx] || ''; }
        return;
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        histIdx--; input.value = histIdx >= 0 ? history[histIdx] : '';
        return;
      }
      if (e.ctrlKey && e.key === 'l') { e.preventDefault(); CMDS.clear(); return; }
      if (e.ctrlKey && e.key === 'c') {
        e.preventDefault();
        printLine('^C', 't-err');
        input.value = '';
        return;
      }

      if (e.key !== 'Enter') return;
      const raw = input.value.trim();
      input.value = '';
      histIdx = -1;
      if (raw) history.unshift(raw);

      const short = cwd.replace('/home/user', '~');
      printHTML(`<span style="color:#4a6888">user@nexus</span><span style="color:#cce4f8">:</span><span style="color:#a78bfa">${short}</span><span style="color:#cce4f8">$</span> ${raw}`);

      if (!raw) return;
      const parts = raw.match(/(?:[^\s"']+|"[^"]*"|'[^']*')+/g) || [];
      const cmd = parts[0].toLowerCase();
      const args = parts.slice(1).map(a => a.replace(/^['"]|['"]$/g, ''));

      if (CMDS[cmd]) {
        try { CMDS[cmd](args); }
        catch(err) { printLine(`Error: ${err.message}`, 't-err'); }
      } else {
        printLine(`nexsh: command not found: ${cmd}  (try 'help')`, 't-err');
      }
    });

    win.el.addEventListener('click', () => input.focus());
    input.focus();
  },
});

// ════════════════════════════════════════════════════════════
// 2. BROWSER — Real iframe browser
// ════════════════════════════════════════════════════════════
Nexus.apps.register({
  id:'browser', name:'Browser', icon:'🌐',
  keywords:['web','internet','browse','http','url','website'],
  w:960, h:640, minW:480, minH:360,

  render(proc) {
    const bookmarks = [
      { label:'Google',    url:'https://www.google.com',     ic:'🔍' },
      { label:'DuckDuckGo',url:'https://duckduckgo.com',     ic:'🦆' },
      { label:'Wikipedia', url:'https://en.wikipedia.org',   ic:'📖' },
      { label:'GitHub',    url:'https://github.com',         ic:'🐙' },
      { label:'YouTube',   url:'https://www.youtube.com',    ic:'▶️' },
      { label:'MDN',       url:'https://developer.mozilla.org', ic:'📚' },
    ];
    const bmHtml = bookmarks.map(b =>
      `<div class="bm-item" data-url="${b.url}"><span class="bm-ic">${b.ic}</span>${b.label}</div>`
    ).join('');

    return `<div class="browser-app">
      <div class="browser-toolbar">
        <button class="br-nav-btn" id="brBack_${proc.pid}" disabled title="Back">‹</button>
        <button class="br-nav-btn" id="brFwd_${proc.pid}"  disabled title="Forward">›</button>
        <button class="br-nav-btn" id="brRefresh_${proc.pid}" title="Refresh">↻</button>
        <button class="br-nav-btn" id="brHome_${proc.pid}" title="Home">⌂</button>
        <div class="browser-addressbar">
          <span class="br-lock" id="brLock_${proc.pid}">🔒</span>
          <input class="br-url" id="brUrl_${proc.pid}" type="text"
            value="https://duckduckgo.com" placeholder="Enter URL or search…" spellcheck="false">
          <button class="br-go" id="brGo_${proc.pid}" title="Go">→</button>
        </div>
      </div>
      <div class="browser-bookmarks" id="brBm_${proc.pid}">${bmHtml}</div>
      <div class="browser-content">
        <div class="br-loading" id="brLoad_${proc.pid}"></div>
        <iframe class="browser-iframe" id="brFrame_${proc.pid}"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-top-navigation"
          src="https://duckduckgo.com" title="Browser"></iframe>
        <div class="browser-blocked hidden" id="brBlocked_${proc.pid}">
          <div class="blocked-icon">🚫</div>
          <div class="blocked-title">Page Blocked by Browser</div>
          <div class="blocked-msg" id="brBlockedMsg_${proc.pid}">
            This website uses security headers that prevent embedding.
            You can open it in a new tab instead.
          </div>
          <button class="blocked-open" id="brOpen_${proc.pid}">Open in New Tab ↗</button>
        </div>
      </div>
    </div>`;
  },

  init(win, proc, kernel) {
    const frame     = win.el.querySelector(`#brFrame_${proc.pid}`);
    const urlInput  = win.el.querySelector(`#brUrl_${proc.pid}`);
    const backBtn   = win.el.querySelector(`#brBack_${proc.pid}`);
    const fwdBtn    = win.el.querySelector(`#brFwd_${proc.pid}`);
    const refreshBtn= win.el.querySelector(`#brRefresh_${proc.pid}`);
    const homeBtn   = win.el.querySelector(`#brHome_${proc.pid}`);
    const goBtn     = win.el.querySelector(`#brGo_${proc.pid}`);
    const loadBar   = win.el.querySelector(`#brLoad_${proc.pid}`);
    const lockEl    = win.el.querySelector(`#brLock_${proc.pid}`);
    const blocked   = win.el.querySelector(`#brBlocked_${proc.pid}`);
    const blockedMsg= win.el.querySelector(`#brBlockedMsg_${proc.pid}`);
    const openBtn   = win.el.querySelector(`#brOpen_${proc.pid}`);
    const bmsEl     = win.el.querySelector(`#brBm_${proc.pid}`);

    let navHistory = ['https://duckduckgo.com'], navIdx = 0;
    let currentUrl = 'https://duckduckgo.com';
    const HOME = 'https://duckduckgo.com';

    const BLOCKED_HOSTS = ['google.com','youtube.com','facebook.com','twitter.com','instagram.com','x.com','reddit.com','linkedin.com','amazon.com','netflix.com'];

    const isLikelyBlocked = (url) => {
      try {
        const h = new URL(url).hostname.replace('www.','');
        return BLOCKED_HOSTS.some(b => h.includes(b));
      } catch { return false; }
    };

    const navigate = (rawUrl) => {
      let url = rawUrl.trim();
      // Smart URL handling
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        if (url.includes('.') && !url.includes(' ')) url = 'https://' + url;
        else url = `https://duckduckgo.com/?q=${encodeURIComponent(url)}`;
      }
      currentUrl = url;
      urlInput.value = url;

      // Lock icon
      lockEl.textContent = url.startsWith('https://') ? '🔒' : '🔓';
      lockEl.style.color  = url.startsWith('https://') ? 'var(--success)' : 'var(--warning)';

      // Push nav history
      navHistory = navHistory.slice(0, navIdx + 1);
      navHistory.push(url); navIdx = navHistory.length - 1;
      backBtn.disabled = navIdx <= 0;
      fwdBtn.disabled  = true;

      // Show loading bar
      loadBar.classList.add('active');

      // Check if likely blocked
      if (isLikelyBlocked(url)) {
        frame.style.display = 'none';
        blocked.classList.remove('hidden');
        blockedMsg.textContent = `${new URL(url).hostname} blocks embedding via X-Frame-Options. Click below to open it in a new tab.`;
        openBtn.onclick = () => window.open(url, '_blank');
        loadBar.classList.remove('active');
        return;
      }

      blocked.classList.add('hidden');
      frame.style.display = 'block';

      frame.onerror = () => {
        loadBar.classList.remove('active');
        blocked.classList.remove('hidden');
        frame.style.display = 'none';
        blockedMsg.textContent = `Could not load ${url}. The site may block embedding or require authentication.`;
        openBtn.onclick = () => window.open(url, '_blank');
      };

      frame.onload = () => {
        loadBar.classList.remove('active');
        // Try to read title (only works same-origin)
        try {
          const title = frame.contentDocument?.title;
          if (title) win.el.querySelector('.win-tb-title').textContent = title;
        } catch {}
        win.el.querySelector('.win-tb-title').textContent = `Browser — ${new URL(url).hostname}`;
      };

      try { frame.src = url; }
      catch(e) { loadBar.classList.remove('active'); }

      // Timeout fallback for blocked detection
      setTimeout(() => {
        loadBar.classList.remove('active');
        try {
          frame.contentWindow.document.title; // throws cross-origin
        } catch {
          // cross-origin is expected and fine
        }
      }, 8000);
    };

    goBtn.addEventListener('click', () => navigate(urlInput.value));
    urlInput.addEventListener('keydown', e => { if (e.key === 'Enter') navigate(urlInput.value); });

    backBtn.addEventListener('click', () => {
      if (navIdx > 0) {
        navIdx--;
        currentUrl = navHistory[navIdx];
        urlInput.value = currentUrl;
        backBtn.disabled = navIdx <= 0;
        fwdBtn.disabled  = navIdx >= navHistory.length - 1;
        navigate(currentUrl);
        navHistory = navHistory.slice(0, navIdx + 1); // revert push
        navIdx = navHistory.length - 1;
      }
    });
    fwdBtn.addEventListener('click', () => {
      if (navIdx < navHistory.length - 1) {
        navIdx++;
        currentUrl = navHistory[navIdx];
        urlInput.value = currentUrl;
        backBtn.disabled = navIdx <= 0;
        fwdBtn.disabled  = navIdx >= navHistory.length - 1;
        frame.src = currentUrl;
      }
    });
    refreshBtn.addEventListener('click', () => { frame.src = currentUrl; loadBar.classList.add('active'); });
    homeBtn.addEventListener('click', () => navigate(HOME));

    bmsEl.addEventListener('click', e => {
      const item = e.target.closest('.bm-item');
      if (item) navigate(item.dataset.url);
    });
  },
});

// ════════════════════════════════════════════════════════════
// 3. AI CHAT — Real Claude API
// ════════════════════════════════════════════════════════════
Nexus.apps.register({
  id:'ai', name:'NexusAI', icon:'🤖',
  keywords:['ai','chat','claude','assistant','gpt','nexusai'],
  w:680, h:560, minW:400, minH:340,

  render(proc) {
    return `<div class="ai-app">
      <div class="ai-header">
        <div class="ai-avatar">✦</div>
        <div>
          <div class="ai-name">NexusAI</div>
          <div class="ai-status">Powered by Claude</div>
        </div>
        <button class="ai-new-btn" id="aiNew_${proc.pid}">+ New Chat</button>
      </div>
      <div class="ai-messages" id="aiMsgs_${proc.pid}">
        <div class="ai-msg ai-msg-ai">
          <div class="ai-msg-avatar">✦</div>
          <div class="ai-bubble">Hello! I'm NexusAI, built into NexusOS and powered by Claude. I can help you with coding, writing, analysis, answering questions, and much more. What can I do for you today?</div>
        </div>
      </div>
      <div class="ai-input-row">
        <textarea class="ai-textarea" id="aiInput_${proc.pid}" rows="1"
          placeholder="Message NexusAI… (Enter to send, Shift+Enter for newline)"></textarea>
        <button class="ai-send" id="aiSend_${proc.pid}" title="Send">➤</button>
      </div>
    </div>`;
  },

  init(win, proc, kernel) {
    const messagesEl = win.el.querySelector(`#aiMsgs_${proc.pid}`);
    const input      = win.el.querySelector(`#aiInput_${proc.pid}`);
    const sendBtn    = win.el.querySelector(`#aiSend_${proc.pid}`);
    const newBtn     = win.el.querySelector(`#aiNew_${proc.pid}`);

    let chatHistory = [];
    let thinking = false;

    // Auto-resize textarea
    input.addEventListener('input', () => {
      input.style.height = 'auto';
      input.style.height = Math.min(input.scrollHeight, 120) + 'px';
    });

    const addMessage = (role, content) => {
      const msgEl = document.createElement('div');
      msgEl.className = `ai-msg ${role === 'user' ? 'user-msg' : 'ai-msg-ai'}`;
      const avatar = role === 'user' ? '👤' : '✦';
      const escaped = content.replace(/</g,'&lt;').replace(/>/g,'&gt;');
      // Basic markdown: **bold**, `code`, ```blocks```
      const md = escaped
        .replace(/```([\s\S]*?)```/g, '<pre style="background:rgba(0,0,0,.4);border:1px solid var(--border);border-radius:6px;padding:8px;margin:4px 0;font-family:\'JetBrains Mono\',monospace;font-size:11.5px;overflow-x:auto;white-space:pre-wrap">$1</pre>')
        .replace(/`([^`]+)`/g, '<code style="background:rgba(0,0,0,.4);padding:1px 5px;border-radius:4px;font-family:\'JetBrains Mono\',monospace;font-size:12px;color:#a78bfa">$1</code>')
        .replace(/\*\*([^*]+)\*\*/g, '<strong style="color:var(--text)">$1</strong>')
        .replace(/\*([^*]+)\*/g, '<em>$1</em>')
        .replace(/\n/g, '<br>');
      msgEl.innerHTML = `
        <div class="ai-msg-avatar">${avatar}</div>
        <div class="ai-bubble">${md}</div>
      `;
      messagesEl.appendChild(msgEl);
      messagesEl.scrollTop = messagesEl.scrollHeight;
      return msgEl;
    };

    const showTyping = () => {
      const el = document.createElement('div');
      el.className = 'ai-msg ai-msg-ai';
      el.id = `aiTyping_${proc.pid}`;
      el.innerHTML = `<div class="ai-msg-avatar">✦</div><div class="ai-bubble ai-typing"><div class="ai-dot"></div><div class="ai-dot"></div><div class="ai-dot"></div></div>`;
      messagesEl.appendChild(el);
      messagesEl.scrollTop = messagesEl.scrollHeight;
    };
    const hideTyping = () => {
      const el = win.el.querySelector(`#aiTyping_${proc.pid}`);
      if (el) el.remove();
    };

    const sendMessage = async () => {
      const text = input.value.trim();
      if (!text || thinking) return;

      thinking = true;
      sendBtn.disabled = true;
      input.value = '';
      input.style.height = 'auto';

      addMessage('user', text);
      chatHistory.push({ role: 'user', content: text });

      showTyping();

      try {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 1024,
            system: `You are NexusAI, an intelligent assistant built into NexusOS — a sleek, futuristic web-based operating system. You have a helpful, knowledgeable, and slightly tech-forward personality. You help users with coding, writing, analysis, and general questions. Keep responses clear and well-formatted. You can use markdown formatting.`,
            messages: chatHistory,
          }),
        });

        const data = await response.json();
        hideTyping();

        if (data.error) {
          addMessage('assistant', `⚠️ API Error: ${data.error.message}`);
        } else {
          const reply = data.content?.[0]?.text || '(no response)';
          chatHistory.push({ role: 'assistant', content: reply });
          addMessage('assistant', reply);
          kernel.notify('NexusAI', reply.slice(0, 80) + (reply.length > 80 ? '…' : ''), 'ai');
        }
      } catch(err) {
        hideTyping();
        addMessage('assistant', `⚠️ Connection error: ${err.message}\n\nMake sure you are running NexusOS in an environment with API access.`);
      }

      thinking = false;
      sendBtn.disabled = false;
      input.focus();
    };

    sendBtn.addEventListener('click', sendMessage);
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
    });
    newBtn.addEventListener('click', () => {
      chatHistory = [];
      messagesEl.innerHTML = '';
      addMessage('assistant', 'New conversation started. How can I help you?');
    });

    // Focus input
    requestAnimationFrame(() => input.focus());
  },
});

// ════════════════════════════════════════════════════════════
// 4. FILE EXPLORER
// ════════════════════════════════════════════════════════════
Nexus.apps.register({
  id:'explorer', name:'Files', icon:'📁',
  keywords:['file','folder','browse','directory'],
  w:800, h:540, minW:400, minH:280,

  render(proc) {
    return `<div class="exp-app">
      <div class="exp-sidebar">
        <div class="exp-sb-title">Places</div>
        <div class="exp-sb-item" data-path="/home/user">        <span class="exp-sb-ic">🏠</span> Home</div>
        <div class="exp-sb-item" data-path="/home/user/Documents"><span class="exp-sb-ic">📄</span> Documents</div>
        <div class="exp-sb-item" data-path="/home/user/Downloads"><span class="exp-sb-ic">📥</span> Downloads</div>
        <div class="exp-sb-item" data-path="/home/user/Desktop">  <span class="exp-sb-ic">🖥️</span> Desktop</div>
        <div class="exp-sb-item" data-path="/home/user/Pictures"> <span class="exp-sb-ic">🖼️</span> Pictures</div>
        <div class="exp-sb-item" data-path="/home/user/Projects"> <span class="exp-sb-ic">💼</span> Projects</div>
        <div class="exp-sb-item" data-path="/">                   <span class="exp-sb-ic">💾</span> Root (/)</div>
      </div>
      <div class="exp-main">
        <div class="exp-toolbar">
          <button class="exp-nav-btn" id="expBack_${proc.pid}" disabled>‹</button>
          <button class="exp-nav-btn" id="expFwd_${proc.pid}"  disabled>›</button>
          <div class="exp-breadcrumb" id="expCrumb_${proc.pid}"></div>
        </div>
        <div class="exp-files" id="expFiles_${proc.pid}"></div>
      </div>
    </div>`;
  },

  init(win, proc, kernel) {
    const filesEl = win.el.querySelector(`#expFiles_${proc.pid}`);
    const crumbEl = win.el.querySelector(`#expCrumb_${proc.pid}`);
    const backBtn = win.el.querySelector(`#expBack_${proc.pid}`);
    const fwdBtn  = win.el.querySelector(`#expFwd_${proc.pid}`);
    let cwd = '/home/user', navHistory = [cwd], navIdx = 0;

    const iconFor = (name, type) => {
      if (type === 'd') return '📁';
      const ext = name.split('.').pop().toLowerCase();
      if (['txt','md','log','ini','cfg'].includes(ext)) return '📄';
      if (['js','ts','py','sh','json','html','css','jsx','vue'].includes(ext)) return '📝';
      if (['png','jpg','jpeg','gif','svg','webp','ico'].includes(ext)) return '🖼️';
      if (['mp4','mov','avi','mkv'].includes(ext)) return '🎬';
      if (['mp3','wav','ogg','flac'].includes(ext)) return '🎵';
      if (['zip','tar','gz','7z'].includes(ext)) return '📦';
      return '📃';
    };

    const updateCrumb = () => {
      const segments = [{ label:'/', path:'/' }];
      let built = '';
      cwd.split('/').filter(Boolean).forEach(p => { built += '/'+p; segments.push({ label:p, path:built }); });
      crumbEl.innerHTML = segments.map((s,i) =>
        `<span class="exp-crumb" data-path="${s.path}">${s.label}</span>${i < segments.length-1 ? '<span class="exp-crumb-sep"> / </span>' : ''}`
      ).join('');
      crumbEl.querySelectorAll('.exp-crumb').forEach(el =>
        el.addEventListener('click', () => navigate(el.dataset.path))
      );
    };

    const renderFiles = () => {
      const children = kernel.fs.getChildren(cwd);
      filesEl.innerHTML = '';
      if (!children.length) { filesEl.innerHTML = '<div class="exp-empty">Folder is empty</div>'; updateCrumb(); return; }
      children.sort((a,b) => (a.type==='d'?0:1)-(b.type==='d'?0:1) || a.name.localeCompare(b.name));
      children.forEach(({ name, type, path }) => {
        const item = document.createElement('div');
        item.className = 'exp-item';
        item.innerHTML = `<div class="exp-item-icon">${iconFor(name, type)}</div><div class="exp-item-name">${name}</div>`;
        if (type === 'd') item.addEventListener('dblclick', () => navigate(path));
        else item.addEventListener('dblclick', () => {
          const r = kernel.fs.cat(path);
          if (r.content != null) openInEditor(path, r.content, kernel);
        });
        filesEl.appendChild(item);
      });
      updateCrumb();
      backBtn.disabled = navIdx <= 0;
      fwdBtn.disabled  = navIdx >= navHistory.length - 1;
    };

    const navigate = path => {
      if (!kernel.fs.isDir(path)) return;
      navHistory = navHistory.slice(0, navIdx+1);
      navHistory.push(path); navIdx = navHistory.length-1;
      cwd = path; renderFiles();
      win.el.querySelectorAll('.exp-sb-item').forEach(el => el.classList.toggle('active', el.dataset.path === cwd));
    };

    backBtn.addEventListener('click', () => { if (navIdx>0) { navIdx--; cwd=navHistory[navIdx]; renderFiles(); }});
    fwdBtn.addEventListener('click',  () => { if (navIdx<navHistory.length-1) { navIdx++; cwd=navHistory[navIdx]; renderFiles(); }});
    win.el.querySelectorAll('.exp-sb-item').forEach(el => el.addEventListener('click', () => navigate(el.dataset.path)));
    renderFiles();
  },
});

// ════════════════════════════════════════════════════════════
// 5. TEXT EDITOR
// ════════════════════════════════════════════════════════════
Nexus.apps.register({
  id:'editor', name:'Text Editor', icon:'📝',
  keywords:['text','edit','code','write','notepad'],
  w:780, h:540, minW:380, minH:260,

  render(proc) {
    return `<div class="editor-app">
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
    </div>`;
  },

  init(win, proc, kernel) {
    const ta       = win.el.querySelector(`#edTa_${proc.pid}`);
    const filename = win.el.querySelector(`#edFilename_${proc.pid}`);
    const status   = win.el.querySelector(`#edStatus_${proc.pid}`);
    const nums     = win.el.querySelector(`#edNums_${proc.pid}`);
    const newBtn   = win.el.querySelector(`#edNew_${proc.pid}`);
    const saveBtn  = win.el.querySelector(`#edSave_${proc.pid}`);
    const openBtn  = win.el.querySelector(`#edOpen_${proc.pid}`);
    let currentPath = null, saved = true;

    const updateLines = () => {
      const count = (ta.value.match(/\n/g)||[]).length + 1;
      nums.innerHTML = Array.from({length:count},(_,i)=>`<div class="ed-line-num">${i+1}</div>`).join('');
    };
    const markSaved = s => {
      saved = s;
      filename.classList.toggle('unsaved', !s);
      status.textContent = s ? '' : '● unsaved';
    };
    const setFile = (path, content) => {
      currentPath = path;
      ta.value = content || '';
      filename.textContent = path ? path.split('/').pop() : 'Untitled';
      markSaved(true); updateLines();
    };

    if (window._nexusEditorOpen) {
      const { path, content } = window._nexusEditorOpen;
      delete window._nexusEditorOpen;
      setFile(path, content);
    }

    ta.addEventListener('input', () => { markSaved(false); updateLines(); });
    ta.addEventListener('scroll', () => { nums.scrollTop = ta.scrollTop; });
    newBtn.addEventListener('click', () => { if (!saved && !confirm('Discard unsaved changes?')) return; setFile(null,''); });
    saveBtn.addEventListener('click', () => {
      if (!currentPath) {
        const n = prompt('Save as:', 'untitled.txt'); if (!n) return;
        currentPath = kernel.fs.resolve(n, '/home/user');
        filename.textContent = n.split('/').pop();
      }
      const r = kernel.fs.write(currentPath, ta.value);
      if (r.err) { kernel.notify('Save Error', r.err, 'error'); return; }
      markSaved(true); kernel.notify('Saved', currentPath.split('/').pop(), 'success');
    });
    openBtn.addEventListener('click', () => {
      const n = prompt('Open file:', 'Documents/readme.txt'); if (!n) return;
      const path = kernel.fs.resolve(n, '/home/user');
      const r = kernel.fs.cat(path);
      if (r.err) { kernel.notify('Open Error', r.err, 'error'); return; }
      setFile(path, r.content);
    });
    ta.addEventListener('keydown', e => {
      if (e.key === 'Tab') {
        e.preventDefault();
        const s = ta.selectionStart, end = ta.selectionEnd;
        ta.value = ta.value.substring(0,s) + '  ' + ta.value.substring(end);
        ta.selectionStart = ta.selectionEnd = s+2;
        markSaved(false); updateLines();
      }
    });
    updateLines();
  },
});

// ════════════════════════════════════════════════════════════
// 6. CALCULATOR
// ════════════════════════════════════════════════════════════
Nexus.apps.register({
  id:'calculator', name:'Calculator', icon:'🔢',
  keywords:['calc','math','compute'],
  single:true, w:320, h:490, minW:280, minH:400,

  render(proc) {
    const btns = [
      ['AC','fn'],['±','fn'],['%','fn'],['÷','op'],
      ['7',''],  ['8',''],  ['9',''],  ['×','op'],
      ['4',''],  ['5',''],  ['6',''],  ['−','op'],
      ['1',''],  ['2',''],  ['3',''],  ['+','op'],
      ['0','zero'],['.',''],['=','eq'],
    ];
    const html = btns.map(([l,c]) =>
      `<button class="calc-btn${c?` cb-${c}`:''}" data-val="${l}">${l}</button>`
    ).join('');
    return `<div class="calc-app">
      <div class="calc-display">
        <div class="calc-expr" id="cExpr_${proc.pid}"></div>
        <div class="calc-current" id="cCur_${proc.pid}">0</div>
      </div>
      <div class="calc-grid">${html}</div>
    </div>`;
  },

  init(win, proc) {
    const exprEl = win.el.querySelector(`#cExpr_${proc.pid}`);
    const curEl  = win.el.querySelector(`#cCur_${proc.pid}`);
    const grid   = win.el.querySelector('.calc-grid');
    let cur = '0', prev = null, op = null, justEvaled = false;
    const setDisp = v => { const s = String(v); curEl.textContent = s.length>10?parseFloat(v).toPrecision(8):s; };
    const setExpr = e => { exprEl.textContent = e; };
    const evaluate = (a,b,o) => {
      if (o==='+') return parseFloat((a+b).toPrecision(12));
      if (o==='−') return parseFloat((a-b).toPrecision(12));
      if (o==='×') return parseFloat((a*b).toPrecision(12));
      if (o==='÷') return b===0 ? 'Error' : parseFloat((a/b).toPrecision(12));
      return b;
    };
    grid.addEventListener('click', e => {
      const btn = e.target.closest('[data-val]'); if (!btn) return;
      const v = btn.dataset.val;
      if (v==='AC') { cur='0'; prev=null; op=null; justEvaled=false; setDisp('0'); setExpr(''); return; }
      if (v==='±')  { cur=String(parseFloat(cur)*-1||0); setDisp(cur); return; }
      if (v==='%')  { cur=String(parseFloat(cur)/100); setDisp(cur); return; }
      if (['+','−','×','÷'].includes(v)) {
        if (op && !justEvaled) { const r=evaluate(parseFloat(prev),parseFloat(cur),op); cur=String(r); prev=String(r); }
        else prev=cur;
        op=v; justEvaled=false; setExpr(`${prev} ${v}`); cur='0'; return;
      }
      if (v==='=') {
        if (!op||prev===null) return;
        const r=evaluate(parseFloat(prev),parseFloat(cur),op);
        setExpr(`${prev} ${op} ${cur} =`); cur=String(r); op=null; prev=null; justEvaled=true; setDisp(cur); return;
      }
      if (v==='.') { if (justEvaled){cur='0';justEvaled=false;} if(!cur.includes('.')) cur+='.'; setDisp(cur); return; }
      if (justEvaled){cur=v;justEvaled=false;} else cur=cur==='0'?v:cur+v;
      if (cur.length>12) cur=cur.slice(0,12);
      setDisp(cur);
    });
  },
});

// ════════════════════════════════════════════════════════════
// 7. SETTINGS
// ════════════════════════════════════════════════════════════
Nexus.apps.register({
  id:'settings', name:'Settings', icon:'⚙️',
  keywords:['config','preferences','theme','wallpaper','appearance'],
  single:true, w:720, h:520, minW:460, minH:300,

  render(proc) {
    const wallpapers = [
      { id:'space',   bg:'linear-gradient(135deg,#050912,#0a1540,#050912)',   label:'Deep Space' },
      { id:'aurora',  bg:'linear-gradient(135deg,#042a2b,#0c4a3a,#1a1040)',   label:'Aurora' },
      { id:'sunset',  bg:'linear-gradient(135deg,#1a0a28,#3d1060,#6b0f2c)',   label:'Nebula' },
      { id:'ocean',   bg:'linear-gradient(135deg,#021628,#0a3060,#041428)',   label:'Deep Ocean' },
      { id:'forest',  bg:'linear-gradient(135deg,#050f0a,#0a2518,#050f0a)',   label:'Forest' },
      { id:'volcano', bg:'linear-gradient(135deg,#100804,#3a1a06,#1a0808)',   label:'Volcanic' },
      { id:'ice',     bg:'linear-gradient(135deg,#060c18,#0c1c38,#080e20)',   label:'Arctic' },
      { id:'crimson', bg:'linear-gradient(135deg,#0c0208,#2a0420,#0c0208)',   label:'Crimson' },
    ];
    const accents = [
      {id:'cyan',val:'#00c6ff'},{id:'green',val:'#00e676'},
      {id:'purple',val:'#a855f7'},{id:'orange',val:'#ff7043'},
      {id:'pink',val:'#f472b6'},{id:'yellow',val:'#fbbf24'},
      {id:'red',val:'#ef4444'},{id:'teal',val:'#2dd4bf'},
    ];
    const wpHtml = wallpapers.map(w =>
      `<div class="wp-swatch${w.id==='space'?' wp-active':''}" data-wp="${w.id}" style="background:${w.bg}" title="${w.label}"></div>`
    ).join('');
    const colHtml = accents.map(a =>
      `<div class="color-swatch${a.id==='cyan'?' col-active':''}" data-col="${a.id}" data-val="${a.val}" style="background:${a.val}" title="${a.id}"></div>`
    ).join('');
    return `<div class="settings-app">
      <div class="settings-nav">
        <div class="settings-nav-title">Settings</div>
        <div class="settings-nav-item active" data-panel="wallpaper"><span class="sn-ic">🖼️</span> Wallpaper</div>
        <div class="settings-nav-item" data-panel="theme"><span class="sn-ic">🎨</span> Appearance</div>
        <div class="settings-nav-item" data-panel="system"><span class="sn-ic">💻</span> System Info</div>
        <div class="settings-nav-item" data-panel="about"><span class="sn-ic">✦</span> About</div>
      </div>
      <div class="settings-content">
        <div class="settings-panel active" data-panel="wallpaper">
          <div class="settings-h2">Wallpaper</div>
          <div class="settings-section"><div class="settings-h3">Presets</div><div class="wp-grid" id="wpGrid_${proc.pid}">${wpHtml}</div></div>
        </div>
        <div class="settings-panel" data-panel="theme">
          <div class="settings-h2">Appearance</div>
          <div class="settings-section"><div class="settings-h3">Accent Color</div><div class="color-grid" id="colGrid_${proc.pid}">${colHtml}</div></div>
        </div>
        <div class="settings-panel" data-panel="system">
          <div class="settings-h2">System Information</div>
          <div class="settings-section">
            ${[
              ['OS','NexusOS 3.1.0 Quantum AI Edition'],
              ['Kernel','NexusKernel 3.1.0'],
              ['AI Engine','Claude Sonnet (Anthropic)'],
              ['Browser','NexusBrowser v1.0 (iframe engine)'],
              ['Architecture','x86_64 (web)'],
              ['Screen',`${screen.width}×${screen.height} @${window.devicePixelRatio||1}x`],
              ['Language',navigator.language||'en-US'],
              ['Platform',navigator.platform||'Web'],
            ].map(([k,v])=>`<div class="sysinfo-row"><div class="sysinfo-key">${k}</div><div class="sysinfo-val">${v}</div></div>`).join('')}
          </div>
        </div>
        <div class="settings-panel" data-panel="about">
          <div class="settings-h2">About NexusOS</div>
          <div class="settings-section" style="text-align:center;padding:20px 0">
            <div style="font-size:64px;margin-bottom:12px">⬡</div>
            <div style="font-family:'Orbitron',sans-serif;font-size:22px;color:var(--accent);margin-bottom:6px">NexusOS</div>
            <div style="color:var(--text-dim);font-size:13px;margin-bottom:16px">Version 3.1.0 Quantum AI Edition</div>
            <div style="color:var(--text-dim);font-size:12px;line-height:1.8;max-width:320px;margin:0 auto">
              A fully-featured web-based operating system with real AI integration,
              live browser, virtual filesystem, multi-window compositor, and full terminal.
              Built with vanilla JS — no frameworks required.
            </div>
          </div>
        </div>
      </div>
    </div>`;
  },

  init(win, proc, kernel) {
    win.el.querySelectorAll('.settings-nav-item').forEach(item => {
      item.addEventListener('click', () => {
        win.el.querySelectorAll('.settings-nav-item').forEach(i=>i.classList.remove('active'));
        win.el.querySelectorAll('.settings-panel').forEach(p=>p.classList.remove('active'));
        item.classList.add('active');
        win.el.querySelector(`.settings-panel[data-panel="${item.dataset.panel}"]`).classList.add('active');
      });
    });
    const wpGrid = win.el.querySelector(`#wpGrid_${proc.pid}`);
    if (wpGrid) wpGrid.addEventListener('click', e => {
      const sw = e.target.closest('.wp-swatch'); if (!sw) return;
      wpGrid.querySelectorAll('.wp-swatch').forEach(s=>s.classList.remove('wp-active'));
      sw.classList.add('wp-active');
      const dbg = document.getElementById('desk-bg');
      dbg.style.background = sw.style.background;
      document.querySelectorAll('.bg-blob').forEach(b=>{ b.style.opacity='0'; setTimeout(()=>b.style.opacity='1',400); });
      kernel.notify('Wallpaper', `Changed to "${sw.title}"`, 'info');
    });
    const colGrid = win.el.querySelector(`#colGrid_${proc.pid}`);
    if (colGrid) colGrid.addEventListener('click', e => {
      const sw = e.target.closest('.color-swatch'); if (!sw) return;
      colGrid.querySelectorAll('.color-swatch').forEach(s=>s.classList.remove('col-active'));
      sw.classList.add('col-active');
      document.documentElement.style.setProperty('--accent', sw.dataset.val);
      kernel.notify('Accent Color', `Set to ${sw.title}`, 'info');
    });
  },
});

// ════════════════════════════════════════════════════════════
// 8. SYSTEM MONITOR
// ════════════════════════════════════════════════════════════
Nexus.apps.register({
  id:'sysmon', name:'System Monitor', icon:'📊',
  keywords:['system','monitor','performance','process','cpu','ram'],
  single:true, w:680, h:520, minW:400, minH:300,

  render(proc) {
    return `<div class="sysmon-app">
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
          <div class="stat-value" id="smProc_${proc.pid}">0 <span>running</span></div>
          <div class="stat-bar-track"><div class="stat-bar-fill" id="smProcBar_${proc.pid}" style="width:30%"></div></div>
        </div>
      </div>
      <div class="sysmon-procs">
        <div class="proc-table-head"><span>PID</span><span>Name</span><span>CPU%</span><span>Mem(MB)</span></div>
        <div class="proc-table-body" id="smProcList_${proc.pid}"></div>
      </div>
    </div>`;
  },

  init(win, proc, kernel) {
    const cpuEl  = win.el.querySelector(`#smCpu_${proc.pid}`);
    const cpuBar = win.el.querySelector(`#smCpuBar_${proc.pid}`);
    const memEl  = win.el.querySelector(`#smMem_${proc.pid}`);
    const memBar = win.el.querySelector(`#smMemBar_${proc.pid}`);
    const procEl = win.el.querySelector(`#smProc_${proc.pid}`);
    const listEl = win.el.querySelector(`#smProcList_${proc.pid}`);
    const MAX_MEM = 512; let alive = true;

    const tick = () => {
      if (!alive || !win.el.isConnected) { alive=false; return; }
      const procs = kernel.pm.getAll();
      const cpu = kernel.pm.totalCpu();
      const mem = kernel.pm.totalMem();
      cpuEl.innerHTML  = `${cpu.toFixed(1)} <span>%</span>`;
      cpuBar.style.width = `${Math.min(100,cpu)}%`;
      memEl.innerHTML  = `${mem.toFixed(0)} <span>MB</span>`;
      memBar.style.width = `${Math.min(100,mem/MAX_MEM*100)}%`;
      procEl.innerHTML = `${procs.length} <span>running</span>`;
      listEl.innerHTML = procs.sort((a,b)=>b.cpu-a.cpu).map(p=>`
        <div class="proc-row">
          <span class="proc-pid">${p.pid}</span>
          <span class="proc-name">${p.name}</span>
          <span class="proc-cpu">${p.cpu.toFixed(1)}%</span>
          <span class="proc-mem">${p.mem.toFixed(0)}</span>
        </div>`).join('');
      setTimeout(tick, 1000);
    };
    kernel.events.on('win:closed', w => { if (w.id===win.id) alive=false; });
    tick();
  },
});
