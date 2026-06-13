/* ── Full-page honeycomb background ── */
const canvas = document.getElementById("hex-canvas");
const ctx = canvas?.getContext?.("2d");

let hexes = [];
let mouse = { x: -9999, y: -9999 };
const HEX_R = 28;
const HEX_H = HEX_R * Math.sqrt(3);

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
        baseAlpha: 0.04 + Math.random() * 0.06,
        phase: Math.random() * Math.PI * 2,
      });
    }
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
  ctx.strokeStyle = `rgba(0, 255, 65, ${alpha})`;
  ctx.lineWidth = 0.8;
  ctx.stroke();
}

function animateBg(time) {
  if (!canvas || !ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (const hex of hexes) {
    const dx = mouse.x - hex.x;
    const dy = mouse.y - hex.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const proximity = Math.max(0, 1 - dist / 180);
    const pulse = 0.5 + 0.5 * Math.sin(time * 0.001 + hex.phase);
    drawHex(hex.x, hex.y, HEX_R - 2, hex.baseAlpha + proximity * 0.25 + pulse * 0.03);
  }
  requestAnimationFrame(animateBg);
}

function resizeCanvas() {
  if (!canvas || !ctx) return;
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  buildGrid();
}

if (canvas && ctx) {
  window.addEventListener("resize", resizeCanvas);
  document.addEventListener("mousemove", (e) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
  });
  resizeCanvas();
  animateBg(0);
}

/* ── Hero particle canvas ── */
const heroCanvas = document.getElementById("hero-canvas");
const heroCtx = heroCanvas?.getContext?.("2d");
let particles = [];

function initHeroParticles() {
  if (!heroCanvas || !heroCtx) return;
  heroCanvas.width = heroCanvas.offsetWidth || 680;
  heroCanvas.height = heroCanvas.offsetHeight || 320;
  particles = [];
  for (let i = 0; i < 60; i++) {
    particles.push({
      x: Math.random() * heroCanvas.width,
      y: Math.random() * heroCanvas.height,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      r: Math.random() * 1.5 + 0.5,
      alpha: Math.random() * 0.5 + 0.1,
    });
  }
}

function drawHeroParticles() {
  if (!heroCanvas || !heroCtx) return;
  const w = heroCanvas.width;
  const h = heroCanvas.height;
  heroCtx.fillStyle = "#060c06";
  heroCtx.fillRect(0, 0, w, h);

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
      if (dist < 80) {
        heroCtx.beginPath();
        heroCtx.strokeStyle = `rgba(0,255,65,${0.12 * (1 - dist / 80)})`;
        heroCtx.lineWidth = 0.5;
        heroCtx.moveTo(p.x, p.y);
        heroCtx.lineTo(q.x, q.y);
        heroCtx.stroke();
      }
    }

    heroCtx.beginPath();
    heroCtx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    heroCtx.fillStyle = `rgba(0,255,65,${p.alpha})`;
    heroCtx.fill();
  }

  requestAnimationFrame(drawHeroParticles);
}

if (heroCanvas && heroCtx) {
  initHeroParticles();
  drawHeroParticles();
  window.addEventListener("resize", initHeroParticles);
}

/* ── Cursor glow ── */
const glow = document.querySelector(".cursor-glow");
if (glow) {
  document.addEventListener("mousemove", (e) => {
    glow.style.left = `${e.clientX}px`;
    glow.style.top = `${e.clientY}px`;
  });
}

/* ── Typing effect ── */
const typeEl = document.getElementById("typewriter");
if (typeEl) {
  const titles = [
    "Obsidian vault synced. Rendering payloads...",
    "Active Directory Operator",
    "Linux PrivEsc Hunter",
    "Bug Bounty Hunter",
    "0xH4rm0ny",
  ];
  let titleIdx = 0;
  let charIdx = 0;
  let deleting = false;

  function typeLoop() {
    const current = titles[titleIdx];
    const display = current.substring(0, charIdx);
    typeEl.innerHTML = `${display}<span class="cursor-blink">|</span>`;

    if (!deleting && charIdx < current.length) {
      charIdx++;
      setTimeout(typeLoop, 45);
    } else if (!deleting && charIdx === current.length) {
      setTimeout(() => {
        deleting = true;
        typeLoop();
      }, 1800);
    } else if (deleting && charIdx > 0) {
      charIdx--;
      setTimeout(typeLoop, 25);
    } else {
      deleting = false;
      titleIdx = (titleIdx + 1) % titles.length;
      setTimeout(typeLoop, 350);
    }
  }

  typeLoop();
}

/* ── Stats count-up ── */
function countUp(el, target, delay = 0) {
  setTimeout(() => {
    let value = 0;
    const step = Math.max(1, Math.ceil(target / 20));
    const timer = setInterval(() => {
      value = Math.min(value + step, target);
      el.textContent = value;
      if (value >= target) clearInterval(timer);
    }, 60);
  }, delay);
}

document.querySelectorAll("[data-count]").forEach((el, index) => {
  countUp(el, parseInt(el.dataset.count, 10) || 0, 900 + index * 200);
});

/* ── Tab switching ── */
document.querySelectorAll(".tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    const target = tab.dataset.target;
    document.querySelectorAll(".tab").forEach((t) => t.classList.toggle("active", t === tab));
    document.querySelectorAll(".hub-section").forEach((section) => {
      section.classList.toggle("active", section.id === `tab-${target}`);
    });
  });
});

/* ── Mini canvas on cards ── */
function drawMiniCanvas(canvas) {
  const seed = parseInt(canvas.dataset.seed, 10) || 1;
  canvas.width = canvas.offsetWidth || 220;
  canvas.height = 90;
  const miniCtx = canvas.getContext("2d");
  const w = canvas.width;
  const h = canvas.height;
  const rng = (n) => {
    const x = Math.sin(seed * 9301 + n * 49297) * 233280;
    return x - Math.floor(x);
  };

  miniCtx.fillStyle = "#050a05";
  miniCtx.fillRect(0, 0, w, h);

  for (let i = 0; i < 12; i++) {
    const x = rng(i) * w;
    const y = rng(i + 12) * h;
    const size = rng(i + 24) * 18 + 6;
    miniCtx.save();
    miniCtx.translate(x, y);
    miniCtx.beginPath();
    for (let k = 0; k < 6; k++) {
      const angle = (Math.PI / 3) * k;
      const px = Math.cos(angle) * size;
      const py = Math.sin(angle) * size;
      k === 0 ? miniCtx.moveTo(px, py) : miniCtx.lineTo(px, py);
    }
    miniCtx.closePath();
    miniCtx.strokeStyle = `rgba(0,255,65,${rng(i + 36) * 0.3 + 0.05})`;
    miniCtx.lineWidth = 0.8;
    miniCtx.stroke();
    miniCtx.restore();
  }

  const lines = [
    "> nmap -sCV target",
    "PORT  STATE SERVICE",
    "22    open  ssh",
    "80    open  http",
    "> python3 exploit.py",
    "[+] Vulnerable!",
    "[+] Shell spawned.",
  ];
  miniCtx.font = "7px monospace";
  miniCtx.fillStyle = "rgba(0,200,50,0.22)";
  lines.forEach((line, i) => miniCtx.fillText(line, 8, 12 + i * 11));
}

document.querySelectorAll(".mini-canvas").forEach((canvas, index) => {
  setTimeout(() => drawMiniCanvas(canvas), 200 + index * 80);
});

/* ── Scroll reveal ── */
const revealEls = document.querySelectorAll(".hero, .section, .hub-section, .card, .writeup-card");
if (revealEls.length) {
  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) entry.target.classList.add("visible");
      });
    },
    { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
  );
  revealEls.forEach((el) => revealObserver.observe(el));
}
