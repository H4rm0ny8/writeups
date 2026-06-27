const motionOk = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
document.documentElement.classList.add("js");

/* ── Animated honeycomb background ── */
const canvas = document.getElementById("hex-canvas");
const ctx = canvas?.getContext?.("2d");

let hexes = [];
let particles = [];
let mouse = { x: -9999, y: -9999 };

const HEX_R = 40;
const HEX_H = HEX_R * Math.sqrt(3);

function resizeCanvas() {
  if (!canvas || !ctx) return;
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  buildGrid();
  initParticles();
}

function buildGrid() {
  if (!canvas || !ctx) return;
  hexes = [];
  const cols = Math.ceil(canvas.width / (HEX_R * 1.5)) + 2;
  const rows = Math.ceil(canvas.height / HEX_H) + 2;

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const offsetX = row % 2 === 0 ? 0 : HEX_R * 0.75;
      hexes.push({
        x: col * HEX_R * 1.5 + offsetX,
        y: row * HEX_H * 0.5,
        baseAlpha: 0.12 + Math.random() * 0.1,
        phase: Math.random() * Math.PI * 2,
      });
    }
  }
}

function initParticles() {
  if (!canvas) return;
  particles = [];
  const count = Math.min(110, Math.floor((canvas.width * canvas.height) / 9000));
  for (let i = 0; i < count; i++) {
    particles.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      r: Math.random() * 2 + 0.8,
      alpha: Math.random() * 0.55 + 0.2,
    });
  }
}

function drawHex(x, y, r, alpha) {
  if (!ctx) return;
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i - Math.PI / 6;
    const px = x + r * Math.cos(angle);
    const py = y + r * Math.sin(angle);
    i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.strokeStyle = `rgba(0, 255, 65, ${Math.min(alpha, 0.95)})`;
  ctx.lineWidth = 1.3;
  ctx.stroke();
}

function animateBg(time) {
  if (!canvas || !ctx) return;
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);

  for (const hex of hexes) {
    const dx = mouse.x - hex.x;
    const dy = mouse.y - hex.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const proximity = Math.max(0, 1 - dist / 280);
    const pulse = 0.5 + 0.5 * Math.sin(time * 0.001 + hex.phase);
    const alpha = hex.baseAlpha + proximity * 0.45 + pulse * 0.1;
    drawHex(hex.x, hex.y, HEX_R - 3, alpha);
  }

  for (let i = 0; i < particles.length; i++) {
    const p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    if (p.x < 0) p.x = w;
    if (p.x > w) p.x = 0;
    if (p.y < 0) p.y = h;
    if (p.y > h) p.y = 0;

    for (let j = i + 1; j < particles.length; j++) {
      const q = particles[j];
      const dx = p.x - q.x;
      const dy = p.y - q.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 120) {
        ctx.beginPath();
        ctx.strokeStyle = `rgba(0,255,65,${0.22 * (1 - dist / 120)})`;
        ctx.lineWidth = 0.8;
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(q.x, q.y);
        ctx.stroke();
      }
    }

    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(0,255,65,${p.alpha})`;
    ctx.fill();
  }

  requestAnimationFrame(animateBg);
}

if (canvas && ctx) {
  window.addEventListener("resize", resizeCanvas);
  document.addEventListener("mousemove", (e) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
  });
  resizeCanvas();
  if (motionOk) animateBg(0);
}

/* ── Cursor glow ── */
const glow = document.querySelector(".cursor-glow");
if (glow) {
  document.addEventListener("mousemove", (e) => {
    glow.style.left = `${e.clientX}px`;
    glow.style.top = `${e.clientY}px`;
  });
}

/* ── Scroll progress ── */
const scrollProgress = document.querySelector(".scroll-progress");
if (scrollProgress) {
  window.addEventListener(
    "scroll",
    () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const pct = max > 0 ? (window.scrollY / max) * 100 : 0;
      scrollProgress.style.width = `${pct}%`;
    },
    { passive: true }
  );
}

/* ── Typing effect ── */
const titles = [
  "Red Team Operator",
  "Active Directory Exploitation",
  "Initial Access Specialist",
  "Privilege Escalation Hunter",
  "Offensive Security Researcher",
];

const typeEl = document.getElementById("typewriter");
let titleIdx = 0;
let charIdx = 0;
let deleting = false;

function typeLoop() {
  if (!typeEl) return;
  const current = titles[titleIdx];
  const display = current.substring(0, charIdx);
  typeEl.innerHTML = `> ${display}<span class="cursor-blink">|</span>`;

  if (!deleting && charIdx < current.length) {
    charIdx++;
    setTimeout(typeLoop, 55);
  } else if (!deleting && charIdx === current.length) {
    setTimeout(() => {
      deleting = true;
      typeLoop();
    }, 1600);
  } else if (deleting && charIdx > 0) {
    charIdx--;
    setTimeout(typeLoop, 30);
  } else {
    deleting = false;
    titleIdx = (titleIdx + 1) % titles.length;
    setTimeout(typeLoop, 400);
  }
}

if (motionOk) typeLoop();

/* ── Status bar ticker ── */
const statusEl = document.getElementById("status-text");
if (statusEl && motionOk) {
  const statusLines = [
    "SESSION: operator@kali ~ #",
    "LOADING exploit modules...",
    "C2 BEACON: CHECK-IN OK",
    "OPSEC: ENABLED",
    "VAULT SYNC: COMPLETE",
    "TARGET ENUM: RUNNING",
  ];
  let statusIdx = 0;
  setInterval(() => {
    statusIdx = (statusIdx + 1) % statusLines.length;
    statusEl.textContent = statusLines[statusIdx];
    statusEl.classList.remove("status-flash");
    void statusEl.offsetWidth;
    statusEl.classList.add("status-flash");
  }, 3200);
}

/* ── Stats count-up ── */
function countUp(el, target, delay = 0) {
  setTimeout(() => {
    let value = 0;
    const step = Math.max(1, Math.ceil(target / 28));
    const timer = setInterval(() => {
      value = Math.min(value + step, target);
      el.textContent = value;
      if (value >= target) {
        clearInterval(timer);
        el.classList.add("stat-pop");
      }
    }, 45);
  }, delay);
}

document.querySelectorAll("[data-count]").forEach((el, index) => {
  countUp(el, parseInt(el.dataset.count, 10) || 0, 600 + index * 200);
});

/* ── Scroll reveal ── */
const revealEls = document.querySelectorAll(".hero, .section, .writeup-card, .panel");

function revealInView() {
  revealEls.forEach((el) => {
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight * 0.92 && rect.bottom > 0) {
      el.classList.add("visible");
    }
  });
}

const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) entry.target.classList.add("visible");
    });
  },
  { threshold: 0.08, rootMargin: "0px 0px -30px 0px" }
);

revealEls.forEach((el) => revealObserver.observe(el));
revealInView();
window.addEventListener("load", revealInView);
window.addEventListener("resize", revealInView);

document.querySelectorAll(".box-card, .writeup-card:not(.box-card)").forEach((card, index) => {
  card.style.transitionDelay = `${(index % 6) * 0.09}s`;
});

/* ── Writeup gallery filters ── */
const filterButtons = document.querySelectorAll(".filter-btn");
const writeupsGrid = document.getElementById("writeups-grid");
const filterEmpty = document.getElementById("filter-empty");

function applyWriteupFilter(filter) {
  if (!writeupsGrid) return;
  const cards = writeupsGrid.querySelectorAll(".box-card");
  let visibleCount = 0;

  cards.forEach((card) => {
    const diff = card.dataset.difficulty || "";
    const os = card.dataset.os || "";
    let show = false;

    if (filter === "all") {
      show = true;
    } else if (filter === "windows" || filter === "linux") {
      show = os === filter;
    } else {
      show = diff === filter;
    }

    card.classList.toggle("is-hidden", !show);
    if (show) visibleCount++;
  });

  if (filterEmpty) {
    filterEmpty.hidden = visibleCount > 0;
  }
}

filterButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    filterButtons.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    applyWriteupFilter(btn.dataset.filter || "all");
  });
});

/* ── Section nav dots ── */
const navDots = document.querySelectorAll(".nav-dot");
const sections = document.querySelectorAll("[data-section]");

navDots.forEach((dot) => {
  dot.addEventListener("click", () => {
    const target = document.getElementById(dot.dataset.target);
    if (target) target.scrollIntoView({ behavior: "smooth" });
  });
});

if (sections.length && navDots.length) {
  const sectionObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          navDots.forEach((d) => d.classList.toggle("active", d.dataset.target === entry.target.id));
        }
      });
    },
    { threshold: 0.4 }
  );
  sections.forEach((s) => sectionObserver.observe(s));
}

/* ── Writeup card 3D tilt ── */
if (motionOk) {
  document.querySelectorAll(".box-card").forEach((card) => {
    card.addEventListener("mousemove", (e) => {
      const rect = card.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      card.style.transform = `translateY(-6px) perspective(600px) rotateY(${x * 6}deg) rotateX(${-y * 6}deg)`;
    });
    card.addEventListener("mouseleave", () => {
      card.style.transform = "";
    });
  });
}

/* ── Code block scan on view ── */
const codeBlocks = document.querySelectorAll(".md-content pre");
if (codeBlocks.length && motionOk) {
  const codeObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("code-active");
          codeObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.3 }
  );
  codeBlocks.forEach((block) => codeObserver.observe(block));
}
