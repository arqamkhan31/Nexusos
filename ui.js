'use strict';
/* ════════════════════════════════════════════════════════════
   NEXUSOS 3.1 — ui.js — Desktop Environment + Search + Dock
   ════════════════════════════════════════════════════════════ */

// ── Boot particle field ───────────────────────────────────
(function initBootParticles() {
  const canvas = document.getElementById('boot-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let w, h, pts, rafId;

  const resize = () => {
    w = canvas.width  = window.innerWidth;
    h = canvas.height = window.innerHeight;
    pts = Array.from({ length: 90 }, () => ({
      x: Math.random()*w, y: Math.random()*h,
      vx: (Math.random()-.5)*.35, vy: (Math.random()-.5)*.35,
      r: Math.random()*1.6+.3, a: Math.random()*.5+.1,
    }));
  };

  const draw = () => {
    ctx.clearRect(0,0,w,h);
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i];
      p.x += p.vx; p.y += p.vy;
      if (p.x<0) p.x=w; if (p.x>w) p.x=0;
      if (p.y<0) p.y=h; if (p.y>h) p.y=0;
      ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2);
      ctx.fillStyle = `rgba(0,198,255,${p.a})`; ctx.fill();
      for (let j = i+1; j < pts.length; j++) {
        const q = pts[j];
        const dx=p.x-q.x, dy=p.y-q.y, d=Math.sqrt(dx*dx+dy*dy);
        if (d<110) {
          ctx.beginPath(); ctx.moveTo(p.x,p.y); ctx.lineTo(q.x,q.y);
          ctx.strokeStyle=`rgba(0,198,255,${.06*(1-d/110)})`; ctx.lineWidth=.5; ctx.stroke();
        }
      }
    }
    rafId = requestAnimationFrame(draw);
  };

  resize(); window.addEventListener('resize', resize); draw();
  Nexus.events.on('kernel:ready', () => cancelAnimationFrame(rafId));
})();

// ── Main init ─────────────────────────────────────────────
Nexus.events.on('kernel:ready', () => {
  initDesktop();
  initTaskbar();
  initTaskbarSearch();
  initDock();
  initLauncher();
  initNotifications();
  initClock();
  initAITray();
});

document.addEventListener('DOMContentLoaded', () => { Nexus.boot(); });

// ════════════════════════════════════════════════════════════
// DESKTOP — icons + context menu
// ════════════════════════════════════════════════════════════
function initDesktop() {
  renderDesktopIcons();
  initContextMenu();
}

function renderDesktopIcons() {
  const container = document.getElementById('desktop-icons');
  const icons = [
    { appId:'terminal',   label:'Terminal',       icon:'🖥️' },
    { appId:'browser',    label:'Browser',        icon:'🌐' },
    { appId:'ai',         label:'NexusAI',        icon:'🤖' },
    { appId:'explorer',   label:'Files',          icon:'📁' },
    { appId:'editor',     label:'Text Editor',    icon:'📝' },
    { appId:'calculator', label:'Calculator',     icon:'🔢' },
    { appId:'sysmon',     label:'System Monitor', icon:'📊' },
    { appId:'settings',   label:'Settings',       icon:'⚙️' },
  ];
  container.innerHTML = icons.map(ic =>
    `<div class="desk-icon" data-app="${ic.appId}" title="${ic.label}">
       <div class="di-icon">${ic.icon}</div>
       <div class="di-name">${ic.label}</div>
     </div>`
  ).join('');

  container.addEventListener('dblclick', e => {
    const icon = e.target.closest('.desk-icon');
    if (icon) Nexus.launch(icon.dataset.app);
  });
  container.addEventListener('click', e => {
    container.querySelectorAll('.desk-icon').forEach(el => el.classList.remove('selected'));
    const icon = e.target.closest('.desk-icon');
    if (icon) icon.classList.add('selected');
  });
  document.getElementById('desktop').addEventListener('click', e => {
    if (!e.target.closest('.desk-icon')) {
      container.querySelectorAll('.desk-icon').forEach(el => el.classList.remove('selected'));
    }
    closeContextMenu();
  });
}

// ── Context menu ─────────────────────────────────────────
function initContextMenu() {
  const menu    = document.getElementById('ctx-menu');
  const list    = document.getElementById('ctx-list');
  const desktop = document.getElementById('desktop');

  desktop.addEventListener('contextmenu', e => {
    if (e.target.closest('.nexus-win') || e.target.closest('#taskbar') || e.target.closest('#dock')) return;
    e.preventDefault();
    const items = [
      { icon:'🌐', label:'Open Browser',       action:() => Nexus.launch('browser') },
      { icon:'🤖', label:'NexusAI Assistant',  action:() => Nexus.launch('ai') },
      { icon:'🖥️', label:'Open Terminal',      action:() => Nexus.launch('terminal') },
      { icon:'📁', label:'Open Files',         action:() => Nexus.launch('explorer') },
      { sep:true },
      { icon:'🔢', label:'Calculator',         action:() => Nexus.launch('calculator') },
      { icon:'📊', label:'System Monitor',     action:() => Nexus.launch('sysmon') },
      { sep:true },
      { icon:'⚙️', label:'Settings',          action:() => Nexus.launch('settings') },
      { icon:'🔄', label:'Refresh Desktop',   action:() => { closeContextMenu(); renderDesktopIcons(); } },
    ];

    list.innerHTML = items.map((item,i) =>
      item.sep ? `<li class="ctx-sep"></li>` :
      `<li data-idx="${i}"><span class="ctx-ic">${item.icon}</span>${item.label}</li>`
    ).join('');

    list.querySelectorAll('li[data-idx]').forEach(li => {
      li.addEventListener('click', () => { closeContextMenu(); items[parseInt(li.dataset.idx)].action(); });
    });

    const px = Math.min(e.clientX, window.innerWidth-200);
    const py = Math.min(e.clientY, window.innerHeight-280);
    menu.style.left = px+'px'; menu.style.top = py+'px';
    menu.classList.remove('hidden');
  });

  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeContextMenu(); });
}
function closeContextMenu() { document.getElementById('ctx-menu').classList.add('hidden'); }

// ════════════════════════════════════════════════════════════
// TASKBAR — running app buttons
// ════════════════════════════════════════════════════════════
function initTaskbar() {
  const appsBar = document.getElementById('tb-apps');

  Nexus.events.on('win:created', win => {
    const btn = document.createElement('button');
    btn.className = 'tb-app-btn tb-active';
    btn.id = `tbBtn_${win.id}`;
    btn.innerHTML = `<span class="tb-app-ic">${win.cfg.icon}</span><span style="overflow:hidden;text-overflow:ellipsis">${win.cfg.title}</span>`;
    btn.title = win.cfg.title;
    btn.addEventListener('click', () => {
      const w = Nexus.wm.get(win.id); if (!w) return;
      if (w.state === 'minimized') Nexus.wm.restore(win.id);
      else if (w.el.classList.contains('win-focused')) Nexus.wm.minimize(win.id);
      else Nexus.wm.focus(win.id);
    });
    appsBar.appendChild(btn);
  });

  Nexus.events.on('win:closed',    win => { document.getElementById(`tbBtn_${win.id}`)?.remove(); });
  Nexus.events.on('win:minimized', win => {
    const b = document.getElementById(`tbBtn_${win.id}`);
    if (b) { b.classList.remove('tb-active'); b.classList.add('tb-minimized'); }
  });
  Nexus.events.on('win:restored',  win => {
    const b = document.getElementById(`tbBtn_${win.id}`);
    if (b) { b.classList.remove('tb-minimized'); b.classList.add('tb-active'); }
  });
  Nexus.events.on('win:focused',   win => {
    appsBar.querySelectorAll('.tb-app-btn').forEach(b => b.classList.remove('tb-active'));
    const b = document.getElementById(`tbBtn_${win.id}`);
    if (b) { b.classList.remove('tb-minimized'); b.classList.add('tb-active'); }
  });
}

// ════════════════════════════════════════════════════════════
// TASKBAR SEARCH — global search: apps + files + web
// ════════════════════════════════════════════════════════════
function initTaskbarSearch() {
  const input    = document.getElementById('tb-search');
  const dropdown = document.getElementById('tb-search-results');
  let debounce   = null;

  const show = () => dropdown.classList.remove('hidden');
  const hide = () => { dropdown.classList.add('hidden'); dropdown.innerHTML = ''; };

  const search = (query) => {
    dropdown.innerHTML = '';
    if (!query.trim()) { hide(); return; }

    const q = query.toLowerCase();
    let html = '';

    // ── Apps ──
    const apps = Nexus.apps.search(q);
    if (apps.length) {
      html += `<div class="ts-section-label">Apps</div>`;
      apps.slice(0,4).forEach(a => {
        html += `<div class="ts-result" data-type="app" data-id="${a.id}">
          <span class="ts-ic">${a.icon}</span>${a.name}
          <span class="ts-sub">Launch</span>
        </div>`;
      });
    }

    // ── Files ──
    const fileResults = [];
    const searchFiles = (path) => {
      try {
        const children = Nexus.fs.getChildren(path);
        children.forEach(c => {
          if (c.name.toLowerCase().includes(q)) fileResults.push(c);
          if (c.type === 'd' && fileResults.length < 8) searchFiles(c.path);
        });
      } catch {}
    };
    searchFiles('/home/user');

    if (fileResults.length) {
      html += `<div class="ts-section-label">Files</div>`;
      fileResults.slice(0,4).forEach(f => {
        const icon = f.type === 'd' ? '📁' : '📄';
        html += `<div class="ts-result" data-type="file" data-path="${f.path}" data-ftype="${f.type}">
          <span class="ts-ic">${icon}</span>${f.name}
          <span class="ts-sub">${f.path.replace('/home/user','~').split('/').slice(0,-1).join('/')}/</span>
        </div>`;
      });
    }

    // ── Web search ──
    html += `<div class="ts-result ts-web" data-type="web" data-query="${encodeURIComponent(query)}">
      <span class="ts-ic">🌐</span>Search the web for "<strong>${query}</strong>"
      <span class="ts-sub">Browser</span>
    </div>`;

    dropdown.innerHTML = html;
    show();

    dropdown.querySelectorAll('.ts-result').forEach(row => {
      row.addEventListener('click', () => {
        const type = row.dataset.type;
        hide(); input.value = '';
        if (type === 'app') {
          Nexus.launch(row.dataset.id);
        } else if (type === 'file') {
          if (row.dataset.ftype === 'd') {
            window._nexusExpPath = row.dataset.path;
            Nexus.launch('explorer');
          } else {
            const r = Nexus.fs.cat(row.dataset.path);
            if (r.content != null) openInEditor(row.dataset.path, r.content, Nexus);
          }
        } else if (type === 'web') {
          const w = Nexus.launch('browser');
          if (w) {
            // Pass query to browser
            setTimeout(() => {
              const urlInput = w.el.querySelector('.br-url');
              if (urlInput) {
                urlInput.value = `https://duckduckgo.com/?q=${row.dataset.query}`;
                urlInput.dispatchEvent(new KeyboardEvent('keydown', { key:'Enter', bubbles:true }));
              }
            }, 200);
          }
        }
      });
    });
  };

  input.addEventListener('input', () => {
    clearTimeout(debounce);
    debounce = setTimeout(() => search(input.value), 120);
  });

  input.addEventListener('focus', () => { if (input.value.trim()) show(); });

  document.addEventListener('mousedown', e => {
    if (!e.target.closest('.tb-search-wrap')) hide();
  });

  input.addEventListener('keydown', e => {
    if (e.key === 'Escape') { hide(); input.blur(); }
    if (e.key === 'Enter' && input.value.trim()) {
      // Open browser with search
      const w = Nexus.launch('browser');
      hide(); input.value = '';
    }
  });
}

// ════════════════════════════════════════════════════════════
// DOCK — quick launch
// ════════════════════════════════════════════════════════════
function initDock() {
  const dockInner = document.getElementById('dock-inner');
  const dockApps = [
    { appId:'browser',    icon:'🌐', label:'Browser' },
    { appId:'terminal',   icon:'🖥️', label:'Terminal' },
    { appId:'ai',         icon:'🤖', label:'NexusAI' },
    { appId:'explorer',   icon:'📁', label:'Files' },
    { appId:'editor',     icon:'📝', label:'Text Editor' },
    { appId:'calculator', icon:'🔢', label:'Calculator' },
    { appId:'sysmon',     icon:'📊', label:'System Monitor' },
    { appId:'settings',   icon:'⚙️', label:'Settings' },
  ];

  dockInner.innerHTML = dockApps.map(a =>
    `<div class="dock-item" data-app="${a.appId}" title="${a.label}">${a.icon}</div>`
  ).join('');

  dockInner.addEventListener('click', e => {
    const item = e.target.closest('.dock-item'); if (!item) return;
    Nexus.launch(item.dataset.app);
  });

  const updateRunning = () => {
    dockInner.querySelectorAll('.dock-item').forEach(item => {
      item.classList.toggle('dock-running', Nexus.wm.isRunning(item.dataset.app));
    });
  };
  Nexus.events.on('win:created', updateRunning);
  Nexus.events.on('win:closed',  updateRunning);
}

// ════════════════════════════════════════════════════════════
// LAUNCHER — spotlight-style Ctrl+Space
// ════════════════════════════════════════════════════════════
function initLauncher() {
  const launcher  = document.getElementById('launcher');
  const btn       = document.getElementById('launcher-btn');
  const input     = document.getElementById('launcher-input');
  const results   = document.getElementById('launcher-results');
  const webRow    = document.getElementById('launcher-web-row');
  const webQuery  = document.getElementById('launcher-web-query');

  const open = () => {
    launcher.classList.remove('hidden');
    input.value = '';
    renderAll();
    requestAnimationFrame(() => input.focus());
  };
  const close = () => { launcher.classList.add('hidden'); input.blur(); };

  const renderAll = () => {
    webRow.classList.add('hidden');
    const apps = Nexus.apps.getAll();
    results.innerHTML = apps.map(a => `
      <div class="lnch-app" data-app="${a.id}">
        <div class="lnch-app-icon">${a.icon}</div>
        <div class="lnch-app-name">${a.name}</div>
      </div>`).join('');
    attachLaunchClicks();
  };

  const attachLaunchClicks = () => {
    results.querySelectorAll('.lnch-app').forEach(item => {
      item.addEventListener('click', () => { close(); Nexus.launch(item.dataset.app); });
    });
  };

  btn.addEventListener('click', () => launcher.classList.contains('hidden') ? open() : close());

  document.addEventListener('keydown', e => {
    if ((e.metaKey || e.ctrlKey) && e.code === 'Space') { e.preventDefault(); launcher.classList.contains('hidden') ? open() : close(); }
    if (e.key === 'Escape') close();
  });

  input.addEventListener('input', () => {
    const q = input.value.trim();
    if (!q) { renderAll(); return; }

    const apps = Nexus.apps.search(q);
    webRow.classList.remove('hidden');
    webQuery.textContent = `"${q}"`;

    results.innerHTML = apps.length
      ? apps.map(a => `<div class="lnch-app" data-app="${a.id}"><div class="lnch-app-icon">${a.icon}</div><div class="lnch-app-name">${a.name}</div></div>`).join('')
      : `<div style="grid-column:1/-1;text-align:center;padding:20px;color:var(--text-muted);font-size:13px">No apps found</div>`;
    attachLaunchClicks();
  });

  webRow.addEventListener('click', () => {
    const q = input.value.trim(); close();
    const w = Nexus.launch('browser');
    if (w) setTimeout(() => {
      const urlInput = w.el.querySelector('.br-url');
      if (urlInput) {
        urlInput.value = `https://duckduckgo.com/?q=${encodeURIComponent(q)}`;
        urlInput.dispatchEvent(new KeyboardEvent('keydown', { key:'Enter', bubbles:true }));
      }
    }, 200);
  });

  launcher.querySelector('.launcher-veil').addEventListener('click', close);
  launcher.querySelector('.launcher-panel').addEventListener('click', e => e.stopPropagation());
}

// ════════════════════════════════════════════════════════════
// NOTIFICATIONS
// ════════════════════════════════════════════════════════════
function initNotifications() {
  const stack = document.getElementById('notif-stack');
  Nexus.events.on('notification', ({ title, message, type }) => {
    const toast = document.createElement('div');
    toast.className = 'notif-toast';
    toast.innerHTML = `
      <div class="notif-dot ${type}"></div>
      <div class="notif-body">
        <div class="notif-title">${title}</div>
        <div class="notif-msg">${message.slice(0,100)}${message.length>100?'…':''}</div>
      </div>`;
    stack.appendChild(toast);
    setTimeout(() => {
      toast.classList.add('notif-out');
      toast.addEventListener('animationend', () => toast.remove(), { once:true });
    }, type === 'ai' ? 5000 : 4000);
    toast.addEventListener('click', () => {
      toast.classList.add('notif-out');
      toast.addEventListener('animationend', () => toast.remove(), { once:true });
    });
  });
}

// ════════════════════════════════════════════════════════════
// CLOCK
// ════════════════════════════════════════════════════════════
function initClock() {
  const timeEl = document.getElementById('tb-time');
  const dateEl = document.getElementById('tb-date');
  const DAYS   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  const tick = () => {
    const n = new Date();
    if (timeEl) timeEl.textContent = `${String(n.getHours()).padStart(2,'0')}:${String(n.getMinutes()).padStart(2,'0')}`;
    if (dateEl) dateEl.textContent = `${DAYS[n.getDay()]} ${MONTHS[n.getMonth()]} ${n.getDate()}`;
  };
  tick(); setInterval(tick, 10000);
}

// ════════════════════════════════════════════════════════════
// AI TRAY BUTTON — quick-launch NexusAI
// ════════════════════════════════════════════════════════════
function initAITray() {
  const btn = document.getElementById('ai-tray-btn');
  if (!btn) return;
  btn.addEventListener('click', () => Nexus.launch('ai'));

  // Pulse effect when AI responds
  Nexus.events.on('notification', ({ type }) => {
    if (type === 'ai') {
      btn.style.color = 'var(--accent-ai)';
      btn.style.filter = 'drop-shadow(0 0 6px var(--accent-ai))';
      setTimeout(() => { btn.style.filter = ''; }, 3000);
    }
  });
}

// Helper: openInEditor re-export for global use
window.openInEditor = function(path, content, kernel) {
  const edWin = kernel.wm.getByApp('editor');
  if (edWin) {
    kernel.wm.focus(edWin.id);
    const ta = edWin.el.querySelector('.ed-textarea');
    const fn = edWin.el.querySelector('.ed-filename');
    if (ta) { ta.value = content; }
    if (fn) fn.textContent = path.split('/').pop();
    return;
  }
  window._nexusEditorOpen = { path, content };
  kernel.launch('editor');
};
