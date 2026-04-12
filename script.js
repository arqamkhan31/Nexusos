/* ═══════════════════════════════════════════
   NEXUSOS — script.js
   All animations, interactions & effects
   ═══════════════════════════════════════════ */

'use strict';

/* ──────────────────────────────────────────
   1. LOADING SCREEN
────────────────────────────────────────── */
const loader       = document.getElementById('loader');
const loaderFill   = document.getElementById('loaderFill');
const loaderText   = document.getElementById('loaderText');

const loadMessages = [
  'INITIALIZING OFFLINE ENGINE...',
  'LOADING AI MODELS...',
  'MOUNTING LOCAL DATABASE...',
  'CALIBRATING MESH NETWORK...',
  'NEXUSOS READY.',
];

let loadProgress = 0;
let msgIndex = 0;

function advanceLoader() {
  loadProgress += Math.random() * 18 + 6;
  if (loadProgress > 100) loadProgress = 100;
  loaderFill.style.width = loadProgress + '%';

  const nextMsg = Math.floor((loadProgress / 100) * (loadMessages.length - 1));
  if (nextMsg !== msgIndex) {
    msgIndex = nextMsg;
    loaderText.textContent = loadMessages[msgIndex];
  }

  if (loadProgress < 100) {
    setTimeout(advanceLoader, Math.random() * 200 + 80);
  } else {
    loaderText.textContent = loadMessages[loadMessages.length - 1];
    setTimeout(() => {
      loader.classList.add('hidden');
      setTimeout(() => { loader.style.display = 'none'; }, 700);
      startPage();
    }, 600);
  }
}

setTimeout(advanceLoader, 200);

/* ──────────────────────────────────────────
   2. PARTICLE CANVAS
────────────────────────────────────────── */
const canvas = document.getElementById('particleCanvas');
const ctx    = canvas.getContext('2d');
let particles = [];
let mouse = { x: -9999, y: -9999 };

function resizeCanvas() {
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

class Particle {
  constructor() { this.reset(); }
  reset() {
    this.x   = Math.random() * canvas.width;
    this.y   = Math.random() * canvas.height;
    this.size = Math.random() * 1.5 + 0.3;
    this.speed = Math.random() * 0.3 + 0.1;
    this.vx  = (Math.random() - 0.5) * this.speed;
    this.vy  = (Math.random() - 0.5) * this.speed;
    this.life = 0;
    this.maxLife = Math.random() * 400 + 200;
    this.alpha = 0;
    this.targetAlpha = Math.random() * 0.4 + 0.1;
  }
  update() {
    this.x  += this.vx;
    this.y  += this.vy;
    this.life++;
    const progress = this.life / this.maxLife;

    // Fade in / out
    if (progress < 0.1) {
      this.alpha = (progress / 0.1) * this.targetAlpha;
    } else if (progress > 0.8) {
      this.alpha = ((1 - progress) / 0.2) * this.targetAlpha;
    } else {
      this.alpha = this.targetAlpha;
    }

    // Mouse repulsion
    const dx = this.x - mouse.x;
    const dy = this.y - mouse.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 100) {
      const force = (100 - dist) / 100;
      this.vx += (dx / dist) * force * 0.4;
      this.vy += (dy / dist) * force * 0.4;
    }

    // Damping
    this.vx *= 0.99;
    this.vy *= 0.99;

    if (this.life >= this.maxLife) this.reset();
    if (this.x < 0 || this.x > canvas.width)  this.vx *= -1;
    if (this.y < 0 || this.y > canvas.height) this.vy *= -1;
  }
  draw() {
    ctx.save();
    ctx.globalAlpha = this.alpha;
    ctx.fillStyle = '#C8FF00';
    ctx.shadowBlur = 4;
    ctx.shadowColor = '#C8FF00';
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function initParticles() {
  particles = [];
  const count = Math.min(Math.floor((window.innerWidth * window.innerHeight) / 8000), 100);
  for (let i = 0; i < count; i++) {
    const p = new Particle();
    p.life = Math.floor(Math.random() * p.maxLife); // stagger starts
    particles.push(p);
  }
}

function drawConnections() {
  for (let i = 0; i < particles.length; i++) {
    for (let j = i + 1; j < particles.length; j++) {
      const dx = particles[i].x - particles[j].x;
      const dy = particles[i].y - particles[j].y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 120) {
        const alpha = ((120 - dist) / 120) * 0.08;
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = '#C8FF00';
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(particles[i].x, particles[i].y);
        ctx.lineTo(particles[j].x, particles[j].y);
        ctx.stroke();
        ctx.restore();
      }
    }
  }
}

function animateParticles() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawConnections();
  particles.forEach(p => { p.update(); p.draw(); });
  requestAnimationFrame(animateParticles);
}

initParticles();
animateParticles();
window.addEventListener('resize', initParticles);

document.addEventListener('mousemove', e => {
  mouse.x = e.clientX;
  mouse.y = e.clientY;
});

/* ──────────────────────────────────────────
   3. CUSTOM CURSOR
────────────────────────────────────────── */
const cursorOuter = document.getElementById('cursorOuter');
const cursorInner = document.getElementById('cursorInner');
let outerX = 0, outerY = 0;
let innerX = 0, innerY = 0;
let curMX = 0, curMY = 0;

document.addEventListener('mousemove', e => {
  curMX = e.clientX;
  curMY = e.clientY;
  cursorInner.style.left = curMX + 'px';
  cursorInner.style.top  = curMY + 'px';
});

function animateCursor() {
  outerX += (curMX - outerX) * 0.12;
  outerY += (curMY - outerY) * 0.12;
  cursorOuter.style.left = outerX + 'px';
  cursorOuter.style.top  = outerY + 'px';
  requestAnimationFrame(animateCursor);
}
animateCursor();

// Hover effect on interactive elements
document.querySelectorAll('a, button, .module-card, .adv-card, .price-card').forEach(el => {
  el.addEventListener('mouseenter', () => cursorOuter.classList.add('hovering'));
  el.addEventListener('mouseleave', () => cursorOuter.classList.remove('hovering'));
});

/* ──────────────────────────────────────────
   4. MAGNETIC BUTTON EFFECT
────────────────────────────────────────── */
document.querySelectorAll('.magnetic').forEach(el => {
  el.addEventListener('mousemove', e => {
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top  + rect.height / 2;
    const dx = (e.clientX - cx) * 0.25;
    const dy = (e.clientY - cy) * 0.25;
    el.style.transform = `translate(${dx}px, ${dy}px)`;
  });
  el.addEventListener('mouseleave', () => {
    el.style.transform = '';
  });
});

/* ──────────────────────────────────────────
   5. NAVBAR SCROLL BEHAVIOR
────────────────────────────────────────── */
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => {
  if (window.scrollY > 60) {
    navbar.classList.add('scrolled');
  } else {
    navbar.classList.remove('scrolled');
  }
}, { passive: true });

/* ──────────────────────────────────────────
   6. HAMBURGER / MOBILE MENU
────────────────────────────────────────── */
const hamburger  = document.getElementById('hamburger');
const mobileMenu = document.getElementById('mobileMenu');

hamburger.addEventListener('click', () => {
  hamburger.classList.toggle('open');
  mobileMenu.classList.toggle('open');
});

mobileMenu.querySelectorAll('a').forEach(a => {
  a.addEventListener('click', () => {
    hamburger.classList.remove('open');
    mobileMenu.classList.remove('open');
  });
});

/* ──────────────────────────────────────────
   7. SCROLL REVEAL
────────────────────────────────────────── */
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const delay = parseInt(entry.target.dataset.delay) || 0;
      setTimeout(() => {
        entry.target.classList.add('visible');
      }, delay);
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

document.querySelectorAll('.reveal-up, .reveal-left, .reveal-right').forEach(el => {
  revealObserver.observe(el);
});

/* ──────────────────────────────────────────
   8. COUNTER ANIMATION
────────────────────────────────────────── */
function animateCounter(el, target, suffix = '') {
  let start = 0;
  const duration = 1400;
  const startTime = performance.now();

  function update(now) {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);
    // Ease out expo
    const eased = 1 - Math.pow(2, -10 * progress);
    const current = Math.floor(eased * target);
    el.textContent = current + suffix;
    if (progress < 1) requestAnimationFrame(update);
    else el.textContent = target + suffix;
  }
  requestAnimationFrame(update);
}

const counterObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const el = entry.target;
      const target = parseInt(el.dataset.count);
      const suffix = el.dataset.suffix || '';
      animateCounter(el, target, suffix);
      counterObserver.unobserve(el);
    }
  });
}, { threshold: 0.5 });

document.querySelectorAll('[data-count]').forEach(el => counterObserver.observe(el));

/* ──────────────────────────────────────────
   9. TERMINAL TYPEWRITER
────────────────────────────────────────── */
const terminalBody = document.getElementById('terminalBody');

const terminalLines = [
  { type: 'prompt', text: 'nexus@local:~$ ', cmd: 'nexus-ai start --model mistral-7b-q4' },
  { type: 'out',    text: 'Loading model weights... (2.4 GB)' },
  { type: 'out',    text: 'Allocating 3.2 GB RAM...' },
  { type: 'ok',     text: '✓ Model loaded in 1.2s — fully on-device' },
  { type: 'out',    text: 'Internet status: ', extra: { class: 't-err', text: 'OFFLINE' } },
  { type: 'out',    text: 'Inference mode: ', extra: { class: 't-ok', text: 'LOCAL CPU/GPU' } },
  { type: 'blank' },
  { type: 'prompt', text: 'you: ', cmd: 'Explain RSI divergence for trading' },
  { type: 'blank' },
  { type: 'ai',     text: 'RSI divergence occurs when price and RSI' },
  { type: 'ai',     text: 'move in opposite directions, signaling' },
  { type: 'ai',     text: 'weakening momentum and potential reversal.' },
  { type: 'blank' },
  { type: 'highlight', text: '→ Bullish: ', extra: { class: 't-out', text: 'price lower low, RSI higher low' } },
  { type: 'highlight', text: '→ Bearish: ', extra: { class: 't-out', text: 'price higher high, RSI lower high' } },
  { type: 'blank' },
  { type: 'prompt', text: 'you: ', cursor: true },
];

let termReady = false;

function buildTerminalLine(lineData) {
  const span = document.createElement('span');
  span.classList.add('t-line');

  if (lineData.type === 'blank') {
    span.innerHTML = '&nbsp;';
    return span;
  }

  if (lineData.type === 'prompt') {
    const promptSpan = document.createElement('span');
    promptSpan.className = 't-prompt';
    promptSpan.textContent = lineData.text;
    span.appendChild(promptSpan);

    if (lineData.cmd) {
      const cmdSpan = document.createElement('span');
      cmdSpan.className = 't-cmd';
      cmdSpan.textContent = lineData.cmd;
      span.appendChild(cmdSpan);
    }
    if (lineData.cursor) {
      const cur = document.createElement('span');
      cur.className = 't-cursor';
      span.appendChild(cur);
    }
    return span;
  }

  const classMap = {
    out: 't-out', ok: 't-ok', err: 't-err',
    ai: 't-out', highlight: 't-highlight',
  };

  const mainSpan = document.createElement('span');
  mainSpan.className = classMap[lineData.type] || 't-out';
  mainSpan.textContent = lineData.text;
  span.appendChild(mainSpan);

  if (lineData.extra) {
    const extraSpan = document.createElement('span');
    extraSpan.className = lineData.extra.class;
    extraSpan.textContent = lineData.extra.text;
    span.appendChild(extraSpan);
  }
  return span;
}

async function runTerminal() {
  terminalBody.innerHTML = '';
  for (let i = 0; i < terminalLines.length; i++) {
    const lineData = terminalLines[i];
    const lineEl = buildTerminalLine(lineData);
    lineEl.style.opacity = '0';
    terminalBody.appendChild(lineEl);

    // Animate in
    await new Promise(r => setTimeout(r, lineData.type === 'blank' ? 80 : 60));
    lineEl.style.transition = 'opacity 0.3s';
    lineEl.style.opacity = '1';

    // Scroll to bottom
    terminalBody.scrollTop = terminalBody.scrollHeight;
  }

  // Loop after pause
  setTimeout(() => {
    if (termReady) runTerminal();
  }, 5000);
}

const termObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting && !termReady) {
      termReady = true;
      runTerminal();
    }
    if (!entry.isIntersecting) {
      termReady = false;
    }
  });
}, { threshold: 0.3 });

if (terminalBody) termObserver.observe(terminalBody);

/* ──────────────────────────────────────────
   10. PARALLAX HERO ELEMENTS
────────────────────────────────────────── */
const heroSection   = document.getElementById('hero');
const heroBgText    = document.querySelector('.hero-bg-text');
const heroGridOverlay = document.querySelector('.hero-grid-overlay');

window.addEventListener('scroll', () => {
  const scrollY = window.scrollY;
  if (scrollY < window.innerHeight * 1.5) {
    if (heroBgText) {
      heroBgText.style.transform = `translateY(${scrollY * 0.3}px) translateX(-${scrollY * 0.02}px)`;
    }
    if (heroGridOverlay) {
      heroGridOverlay.style.transform = `translateY(${scrollY * 0.1}px)`;
    }
  }
}, { passive: true });

/* ──────────────────────────────────────────
   11. CARD TILT EFFECT (3D)
────────────────────────────────────────── */
function addTilt(selector) {
  document.querySelectorAll(selector).forEach(card => {
    card.addEventListener('mousemove', e => {
      const rect = card.getBoundingClientRect();
      const cx = rect.left + rect.width  / 2;
      const cy = rect.top  + rect.height / 2;
      const rx = ((e.clientY - cy) / rect.height) * -8;
      const ry = ((e.clientX - cx) / rect.width)  *  8;
      card.style.transform = `perspective(800px) rotateX(${rx}deg) rotateY(${ry}deg) translateY(-4px)`;
    });
    card.addEventListener('mouseleave', () => {
      card.style.transform = '';
      card.style.transition = 'transform 0.5s cubic-bezier(0.16,1,0.3,1)';
      setTimeout(() => { card.style.transition = ''; }, 500);
    });
  });
}

addTilt('.module-card');
addTilt('.adv-card');
addTilt('.price-card');

/* ──────────────────────────────────────────
   12. SMOOTH ANCHOR SCROLL
────────────────────────────────────────── */
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', e => {
    e.preventDefault();
    const target = document.querySelector(anchor.getAttribute('href'));
    if (target) {
      const offset = 80;
      const top = target.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top, behavior: 'smooth' });
    }
  });
});

/* ──────────────────────────────────────────
   13. ACTIVE NAV LINK (SCROLL SPY)
────────────────────────────────────────── */
const sections   = document.querySelectorAll('section[id]');
const navAnchors = document.querySelectorAll('.nav-links a');

const spyObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      navAnchors.forEach(a => {
        a.style.color = '';
        if (a.getAttribute('href') === '#' + entry.target.id) {
          a.style.color = 'var(--acid)';
        }
      });
    }
  });
}, { threshold: 0.4 });

sections.forEach(s => spyObserver.observe(s));

/* ──────────────────────────────────────────
   14. STAGGERED GRID ITEM ANIMATION
────────────────────────────────────────── */
function staggerGridItems(selector, parent) {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const items = entry.target.querySelectorAll(selector);
        items.forEach((item, i) => {
          item.style.opacity = '0';
          item.style.transform = 'translateY(32px)';
          item.style.transition = `opacity 0.7s ${i * 0.1}s cubic-bezier(0.16,1,0.3,1), transform 0.7s ${i * 0.1}s cubic-bezier(0.16,1,0.3,1)`;
          // Trigger
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              item.style.opacity = '1';
              item.style.transform = 'translateY(0)';
            });
          });
        });
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });

  const container = document.querySelector(parent);
  if (container) observer.observe(container);
}

staggerGridItems('.module-card', '.modules-grid');
staggerGridItems('.adv-card', '.adv-grid');

/* ──────────────────────────────────────────
   15. GLOWING BORDER TRACE ON HOVER (cards)
────────────────────────────────────────── */
document.querySelectorAll('.module-card, .adv-card, .price-card').forEach(card => {
  card.addEventListener('mousemove', e => {
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    card.style.setProperty('--gx', x + 'px');
    card.style.setProperty('--gy', y + 'px');
    card.style.background = `radial-gradient(200px circle at ${x}px ${y}px, rgba(200,255,0,0.04) 0%, transparent 80%), var(--black)`;
  });
  card.addEventListener('mouseleave', () => {
    card.style.background = '';
  });
});

// Highlight card keeps its gradient
document.querySelectorAll('.card-highlight').forEach(card => {
  card.addEventListener('mouseleave', () => {
    card.style.background = 'linear-gradient(145deg, #0B1500 0%, #050505 100%)';
  });
});

/* ──────────────────────────────────────────
   16. TYPED TEXT CYCLING IN HERO EYEBROW
────────────────────────────────────────── */
const cycleWords = ['Offline-First', 'AI-Powered', 'Privacy-First', 'No-Cloud'];
let cycleIndex = 0;
const eyebrowEl = document.querySelector('.hero-eyebrow');

if (eyebrowEl) {
  const wordSpan = document.createElement('span');
  wordSpan.style.cssText = `
    color: var(--acid);
    font-weight: 700;
    transition: opacity 0.4s;
  `;
  wordSpan.textContent = cycleWords[0];

  // Find the text node and replace
  eyebrowEl.childNodes.forEach(node => {
    if (node.nodeType === 3 && node.textContent.trim().length > 0) {
      const parts = node.textContent.split('Offline-First');
      if (parts.length > 1) {
        node.textContent = '';
      }
    }
  });

  setInterval(() => {
    wordSpan.style.opacity = '0';
    setTimeout(() => {
      cycleIndex = (cycleIndex + 1) % cycleWords.length;
      wordSpan.textContent = cycleWords[cycleIndex];
      wordSpan.style.opacity = '1';
    }, 400);
  }, 3000);
}

/* ──────────────────────────────────────────
   17. PAGE-START FUNCTION (called after loader)
────────────────────────────────────────── */
function startPage() {
  // Trigger hero title word animations with delays
  document.querySelectorAll('.title-line').forEach((line, i) => {
    const word = line.querySelector('.title-word');
    if (word) {
      word.style.animationDelay = (i * 120) + 'ms';
      word.style.animationFillMode = 'both';
    }
  });

  // Trigger hero reveals
  setTimeout(() => {
    document.querySelectorAll('.hero .reveal-up').forEach(el => {
      const delay = parseInt(el.dataset.delay) || 0;
      setTimeout(() => el.classList.add('visible'), delay);
    });
    document.querySelectorAll('.hero .reveal-right').forEach(el => {
      const delay = parseInt(el.dataset.delay) || 0;
      setTimeout(() => el.classList.add('visible'), delay);
    });
  }, 200);
}

/* ──────────────────────────────────────────
   18. SECTION BACKGROUND PARALLAX (subtle)
────────────────────────────────────────── */
window.addEventListener('scroll', () => {
  const sy = window.scrollY;
  document.querySelectorAll('.ai-glow-bg, .cta-bg-text').forEach(el => {
    const rect = el.closest('section')?.getBoundingClientRect();
    if (rect && rect.top < window.innerHeight && rect.bottom > 0) {
      const progress = (window.innerHeight - rect.top) / (window.innerHeight + rect.height);
      el.style.transform = `translate(-50%, calc(-50% + ${(progress - 0.5) * 40}px))`;
    }
  });
}, { passive: true });

/* ──────────────────────────────────────────
   19. TICKER PAUSE ON HOVER
────────────────────────────────────────── */
// Already handled in CSS with .ticker-wrap:hover .ticker-track

/* ──────────────────────────────────────────
   20. RIPPLE EFFECT ON BUTTONS
────────────────────────────────────────── */
document.querySelectorAll('.btn-primary, .btn-ghost, .nav-cta, .price-btn').forEach(btn => {
  btn.addEventListener('click', function(e) {
    const rect = btn.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const ripple = document.createElement('span');
    ripple.style.cssText = `
      position: absolute;
      width: 0; height: 0;
      background: rgba(255,255,255,0.2);
      border-radius: 50%;
      left: ${x}px; top: ${y}px;
      transform: translate(-50%, -50%);
      pointer-events: none;
      animation: rippleAnim 0.6s ease-out forwards;
    `;

    // Ensure btn is relatively positioned
    if (getComputedStyle(btn).position === 'static') btn.style.position = 'relative';
    btn.style.overflow = 'hidden';
    btn.appendChild(ripple);
    setTimeout(() => ripple.remove(), 600);
  });
});

// Add ripple keyframe dynamically
const rippleStyle = document.createElement('style');
rippleStyle.textContent = `
  @keyframes rippleAnim {
    to {
      width: 300px;
      height: 300px;
      opacity: 0;
    }
  }
`;
document.head.appendChild(rippleStyle);

/* ──────────────────────────────────────────
   21. DEVICE MOCKUP CHAT ANIMATION
────────────────────────────────────────── */
const chatBubbles = document.querySelectorAll('.chat-bubble:not(.typing-bubble)');
chatBubbles.forEach((bubble, i) => {
  bubble.style.opacity = '0';
  bubble.style.transform = 'translateY(10px)';
  bubble.style.transition = `opacity 0.5s ${i * 0.4 + 0.5}s ease, transform 0.5s ${i * 0.4 + 0.5}s ease`;
});

const deviceObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      chatBubbles.forEach(b => {
        b.style.opacity = '1';
        b.style.transform = 'translateY(0)';
      });
    }
  });
}, { threshold: 0.5 });

const deviceMockup = document.querySelector('.device-mockup');
if (deviceMockup) deviceObserver.observe(deviceMockup);

/* ──────────────────────────────────────────
   22. PERFORMANCE: Reduce motion if preferred
────────────────────────────────────────── */
if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  document.querySelectorAll('*').forEach(el => {
    el.style.animationDuration = '0.001ms';
    el.style.animationIterationCount = '1';
    el.style.transitionDuration = '0.001ms';
  });
}
/* ──────────────────────────────────────────
   23. REAL BUTTON FUNCTIONALITY
────────────────────────────────────────── */

// Download button
document.querySelectorAll('.btn-primary').forEach(btn => {
  btn.addEventListener('click', () => {
    alert("🚀 NexusOS Alpha download coming soon!");
  });
});

// Watch demo
document.querySelectorAll('.btn-ghost').forEach(btn => {
  btn.addEventListener('click', () => {
    window.open("https://youtube.com", "_blank");
  });
});

// Pricing buttons
document.querySelectorAll('.price-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    alert("💳 Payment system coming soon!");
  });
});
