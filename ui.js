/* ════════════════════════════════════════════════════════════
   NEXUSOS — ui.js — Desktop Environment Layer
   ════════════════════════════════════════════════════════════ */

'use strict';

// ════════════════════════════════════════════════════════════
// Boot Canvas — particle field during boot
// ════════════════════════════════════════════════════════════
(function initBootParticles() {
  const canvas = document.getElementById('boot-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let w, h, pts, rafId;

  const resize = () => {
    w = canvas.width  = window.innerWidth;
    h = canvas.height = window.innerHeight;
    pts = Array.from({ length: 80 }, () => ({
      x: Math.random() * w, y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      r: Math.random() * 1.5 + 0.3,
      a: Math.random() * 0.5 + 0.1,
    }));
  };

  const draw = () => {
    ctx.clearRect(0, 0, w, h);
    pts.forEach(p => {
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0) p.x = w;
      if (p.x > w) p.x = 0;
      if (p.y < 0) p.y = h;
      if (p.y > h) p.y = 0;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(0,198,255,${p.a})`;
      ctx.fill();
    });

    // Draw connections
    for (let i = 0; i < pts.length; i++) {
      for (let j = i + 1; j < pts.length; j++) {
        const dx = pts[i].x - pts[j].x;
        const dy = pts[i].y - pts[j].y;
        const d  = Math.sqrt(dx * dx + dy * dy);
        if (d < 100) {
          ctx.beginPath();
          ctx.moveTo(pts[i].x, pts[i].y);
          ctx.lineTo(pts[j].x, pts[j].y);
          ctx.strokeStyle = `rgba(0,198,255,${0.06 * (1 - d / 100)})`;
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
      }
    }
    rafId = requestAnimationFrame(draw);
  };

  resize();
  window.addEventListener('resize', resize);
  draw();

  // Stop when boot screen hides
  const stopParticles = () => { cancelAnimationFrame(rafId); };
  Nexus.events.on('kernel:ready', stopParticles);
})();

// ════════════════════════════════════════════════════════════
// Main UI initialization
// ════════════════════════════════════════════════════════════
Nexus.events.on('kernel:ready', () => {
  initDesktop();
  initTaskbar();
  initDock();
  initLauncher();
  initNotifications();
  initClock();
});

// Start the boot sequence
document.addEventListener('DOMContentLoaded', () => { Nexus.boot(); });

// ════════════════════════════════════════════════════════════
// Desktop — icons, context menu, background
// ════════════════════════════════════════════════════════════
function initDesktop() {
  renderDesktopIcons();
  initContextMenu();
}

function renderDesktopIcons() {
  const container = document.getElementById('desktop-icons');
  const icons = [
    { appId: 'terminal',    label: 'Terminal',        icon: '🖥️' },
    { appId: 'explorer',    label: 'Files',           icon: '📁' },
    { appId: 'editor',      label: 'Text Editor',     icon: '📝' },
    { appId: 'calculator',  label: 'Calculator',      icon: '🔢' },
    { appId: 'sysmon',      label: 'System Monitor',  icon: '📊' },
    { appId: 'settings',    label: 'Settings',        icon: '⚙️' },
  ];

  container.innerHTML = icons.map(ic => `
    <div class="desk-icon" data-app="${ic.appId}" title="${ic.label}">
      <div class="di-icon">${ic.icon}</div>
      <div class="di-name">${ic.label}</div>
    </div>
  `).join('');

  container.addEventListener('dblclick', e => {
    const icon = e.target.closest('.desk-icon');
    if (!icon) return;
    Nexus.launch(icon.dataset.app);
  });

  // Single-click to select
  container.addEventListener('click', e => {
    const icon = e.target.closest('.desk-icon');
    container.querySelectorAll('.desk-icon').forEach(el => el.classList.remove('selected'));
    if (icon) icon.classList.add('selected');
  });

  // Deselect on desktop click
  document.getElementById('desktop').addEventListener('click', e => {
    if (!e.target.closest('.desk-icon')) {
      container.querySelectorAll('.desk-icon').forEach(el => el.classList.remove('selected'));
    }
    closeContextMenu();
  });
}

// ── Context Menu ─────────────────────────────────────────────
function initContextMenu() {
  const menu   = document.getElementById('ctx-menu');
  const list   = document.getElementById('ctx-list');
  const desktop = document.getElementById('desktop');

  desktop.addEventListener('contextmenu', e => {
    if (e.target.closest('.nexus-win') || e.target.closest('#taskbar') || e.target.closest('#dock')) return;
    e.preventDefault();
    showContextMenu(e.clientX, e.clientY);
  });

  function showContextMenu(x, y) {
    const items = [
      { icon: '🖥️',  label: 'Open Terminal',      action: () => Nexus.launch('terminal') },
      { icon: '📁',  label: 'Open Files',          action: () => Nexus.launch('explorer') },
      { sep: true },
      { icon: '🔢',  label: 'Calculator',          action: () => Nexus.launch('calculator') },
      { icon: '📊',  label: 'System Monitor',      action: () => Nexus.launch('sysmon') },
      { sep: true },
      { icon: '⚙️',  label: 'Settings',            action: () => Nexus.launch('settings') },
      { icon: '🔄',  label: 'Reload Desktop',      action: () => { closeContextMenu(); renderDesktopIcons(); } },
    ];

    list.innerHTML = items.map((item, i) => {
      if (item.sep) return '<li class="ctx-sep"></li>';
      return `<li data-idx="${i}"><span class="ctx-ic">${item.icon}</span>${item.label}</li>`;
    }).join('');

    list.querySelectorAll('li[data-idx]').forEach(li => {
      li.addEventListener('click', () => {
        const idx = parseInt(li.dataset.idx);
        closeContextMenu();
        items[idx].action();
      });
    });

    // Position
    const mw = 200, mh = 230;
    const px  = Math.min(x, window.innerWidth  - mw - 8);
    const py  = Math.min(y, window.innerHeight - mh - 8);
    menu.style.left = px + 'px';
    menu.style.top  = py + 'px';
    menu.classList.remove('hidden');
  }

  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeContextMenu(); });
}

function closeContextMenu() {
  document.getElementById('ctx-menu').classList.add('hidden');
}

// ════════════════════════════════════════════════════════════
// Taskbar — running apps, clock
// ════════════════════════════════════════════════════════════
function initTaskbar() {
  const appsBar = document.getElementById('tb-apps');

  Nexus.events.on('win:created', win => {
    const btn = document.createElement('button');
    btn.className   = 'tb-app-btn tb-active';
    btn.id          = `tbBtn_${win.id}`;
    btn.dataset.win = win.id;
    btn.innerHTML   = `<span class="tb-app-ic">${win.cfg.icon}</span><span>${win.cfg.title}</span>`;
    btn.title       = win.cfg.title;

    btn.addEventListener('click', () => {
      const w = Nexus.wm.get(win.id);
      if (!w) return;
      if (w.state === 'minimized') {
        Nexus.wm.restore(win.id);
      } else if (w.el.classList.contains('win-focused')) {
        Nexus.wm.minimize(win.id);
      } else {
        Nexus.wm.focus(win.id);
      }
    });

    appsBar.appendChild(btn);
  });

  Nexus.events.on('win:closed', win => {
    const btn = document.getElementById(`tbBtn_${win.id}`);
    if (btn) btn.remove();
  });

  Nexus.events.on('win:minimized', win => {
    const btn = document.getElementById(`tbBtn_${win.id}`);
    if (btn) { btn.classList.remove('tb-active'); btn.classList.add('tb-minimized'); }
  });

  Nexus.events.on('win:restored', win => {
    const btn = document.getElementById(`tbBtn_${win.id}`);
    if (btn) { btn.classList.remove('tb-minimized'); btn.classList.add('tb-active'); }
  });

  Nexus.events.on('win:focused', win => {
    appsBar.querySelectorAll('.tb-app-btn').forEach(b => b.classList.remove('tb-active'));
    const btn = document.getElementById(`tbBtn_${win.id}`);
    if (btn) { btn.classList.remove('tb-minimized'); btn.classList.add('tb-active'); }
  });
}

// ════════════════════════════════════════════════════════════
// Dock — quick-launch app bar
// ════════════════════════════════════════════════════════════
function initDock() {
  const dockInner = document.getElementById('dock-inner');

  const dockApps = [
    { appId: 'terminal',   icon: '🖥️', label: 'Terminal' },
    { appId: 'explorer',   icon: '📁', label: 'Files' },
    { appId: 'editor',     icon: '📝', label: 'Text Editor' },
    { appId: 'calculator', icon: '🔢', label: 'Calculator' },
    { appId: 'sysmon',     icon: '📊', label: 'System Monitor' },
    { appId: 'settings',   icon: '⚙️', label: 'Settings' },
  ];

  dockInner.innerHTML = dockApps.map(a => `
    <div class="dock-item" data-app="${a.appId}" title="${a.label}">${a.icon}</div>
  `).join('');

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
// Launcher — spotlight-style app search
// ════════════════════════════════════════════════════════════
function initLauncher() {
  const launcher     = document.getElementById('launcher');
  const launcherBtn  = document.getElementById('launcher-btn');
  const input        = document.getElementById('launcher-input');
  const results      = document.getElementById('launcher-results');

  const allApps = () => Nexus.apps.getAll();

  const renderResults = (apps) => {
    if (!apps.length) {
      results.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:24px;color:var(--text-muted);font-size:13px">No apps found</div>';
      return;
    }
    results.innerHTML = apps.map(a => `
      <div class="lnch-app" data-app="${a.id}">
        <div class="lnch-app-icon">${a.icon}</div>
        <div class="lnch-app-name">${a.name}</div>
      </div>
    `).join('');

    results.querySelectorAll('.lnch-app').forEach(item => {
      item.addEventListener('click', () => {
        closeLauncher();
        Nexus.launch(item.dataset.app);
      });
    });
  };

  const openLauncher = () => {
    launcher.classList.remove('hidden');
    input.value = '';
    renderResults(allApps());
    requestAnimationFrame(() => input.focus());
  };

  const closeLauncher = () => {
    launcher.classList.add('hidden');
    input.blur();
  };

  launcherBtn.addEventListener('click', () => {
    launcher.classList.contains('hidden') ? openLauncher() : closeLauncher();
  });

  // Keyboard shortcut: Super+Space or Ctrl+Space
  document.addEventListener('keydown', e => {
    if ((e.metaKey || e.ctrlKey) && e.code === 'Space') {
      e.preventDefault();
      launcher.classList.contains('hidden') ? openLauncher() : closeLauncher();
    }
    if (e.key === 'Escape') closeLauncher();
  });

  input.addEventListener('input', () => {
    const q = input.value.trim();
    renderResults(q ? Nexus.apps.search(q) : allApps());
  });

  // Close on veil click
  launcher.querySelector('.launcher-veil').addEventListener('click', closeLauncher);

  // Prevent panel click from closing
  launcher.querySelector('.launcher-panel').addEventListener('click', e => e.stopPropagation());
}

// ════════════════════════════════════════════════════════════
// Notifications — toast system
// ════════════════════════════════════════════════════════════
function initNotifications() {
  const stack = document.getElementById('notif-stack');

  Nexus.events.on('notification', ({ title, message, type, id }) => {
    const toast = document.createElement('div');
    toast.className = 'notif-toast';
    toast.innerHTML = `
      <div class="notif-dot ${type}"></div>
      <div class="notif-body">
        <div class="notif-title">${title}</div>
        <div class="notif-msg">${message}</div>
      </div>
    `;
    stack.appendChild(toast);

    // Auto-dismiss
    setTimeout(() => {
      toast.classList.add('notif-out');
      toast.addEventListener('animationend', () => toast.remove(), { once: true });
    }, 4000);

    // Click to dismiss early
    toast.addEventListener('click', () => {
      toast.classList.add('notif-out');
      toast.addEventListener('animationend', () => toast.remove(), { once: true });
    });
  });
}

// ════════════════════════════════════════════════════════════
// Clock — live time display in taskbar
// ════════════════════════════════════════════════════════════
function initClock() {
  const timeEl = document.getElementById('tb-time');
  const dateEl = document.getElementById('tb-date');
  const days   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  const tick = () => {
    const now = new Date();
    const h   = String(now.getHours()).padStart(2, '0');
    const m   = String(now.getMinutes()).padStart(2, '0');
    const day = days[now.getDay()];
    const mon = months[now.getMonth()];
    const d   = now.getDate();
    if (timeEl) timeEl.textContent = `${h}:${m}`;
    if (dateEl) dateEl.textContent = `${day} ${mon} ${d}`;
  };

  tick();
  setInterval(tick, 10000);
}
