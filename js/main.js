/* ── Enhanced Animated Honeycomb Background ── */
const canvas = document.getElementById("hex-canvas");
const ctx = canvas.getContext("2d");

let hexes = [];
let mouse = { x: -9999, y: -9999 };
let rafId;

const HEX_R = 32;
const HEX_H = HEX_R * Math.sqrt(3);

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  buildGrid();
}

function buildGrid() {
  hexes = [];
  const cols = Math.ceil(canvas.width / (HEX_R * 1.5)) + 3;
  const rows = Math.ceil(canvas.height / HEX_H) + 3;

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const offsetX = row % 2 === 0 ? 0 : HEX_R * 0.75;
      const x = col * HEX_R * 1.5 + offsetX;
      const y = row * HEX_H * 0.5;
      hexes.push({
        x,
        y,
        baseAlpha: 0.04 + Math.random() * 0.07,
        phase: Math.random() * Math.PI * 2,
        size: HEX_R - 3
      });
    }
  }
}

function drawHex(x, y, r, alpha) {
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i - Math.PI / 6;
    const px = x + r * Math.cos(angle);
    const py = y + r * Math.sin(angle);
    i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.strokeStyle = `rgba(0, 255, 65, ${alpha})`;
  ctx.lineWidth = 1.1;
  ctx.stroke();
}

function animateBg(time) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (const hex of hexes) {
    const dx = mouse.x - hex.x;
    const dy = mouse.y - hex.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const proximity = Math.max(0, 1 - dist / 260);
    
    const pulse = Math.sin(time * 0.0015 + hex.phase) * 0.5 + 0.5;
    const alpha = hex.baseAlpha + proximity * 0.45 + pulse * 0.06;

    drawHex(hex.x, hex.y, hex.size, Math.min(0.9, alpha));
  }

  rafId = requestAnimationFrame(animateBg);
}

window.addEventListener("resize", resizeCanvas);
document.addEventListener("mousemove", (e) => {
  mouse.x = e.clientX;
  mouse.y = e.clientY;
});

resizeCanvas();
animateBg(0);

/* ── Strong Cursor Glow ── */
const glow = document.querySelector(".cursor-glow");
if (glow) {
  document.addEventListener("mousemove", (e) => {
    glow.style.left = `${e.clientX}px`;
    glow.style.top = `${e.clientY}px`;
  });
}

/* ── Advanced Typing Effect ── */
const titles = [
  "Penetration Tester",
  "Red Team Operator",
  "Bug Bounty Hunter",
  "CTF Addict",
  "0xH4rm0ny"
];

const typeEl = document.getElementById("typewriter");
let titleIdx = 0;
let charIdx = 0;
let deleting = false;

function typeLoop() {
  if (!typeEl) return;
  const current = titles[titleIdx];
  const display = current.substring(0, charIdx);

  typeEl.innerHTML = `${display}<span class="cursor-blink">█</span>`;

  if (!deleting && charIdx < current.length) {
    charIdx++;
    setTimeout(typeLoop, 65);
  } else if (!deleting && charIdx === current.length) {
    setTimeout(() => { deleting = true; typeLoop(); }, 2200);
  } else if (deleting && charIdx > 0) {
    charIdx--;
    setTimeout(typeLoop, 35);
  } else {
    deleting = false;
    titleIdx = (titleIdx + 1) % titles.length;
    setTimeout(typeLoop, 600);
  }
}

typeLoop();

/* ── Scroll Reveal + Glitch on Scroll ── */
const revealEls = document.querySelectorAll(".hero, .section, .writeup-card");

const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add("visible");
      if (Math.random() > 0.7) {
        entry.target.classList.add("glitch");
        setTimeout(() => entry.target.classList.remove("glitch"), 800);
      }
    }
  });
}, { threshold: 0.2 });

revealEls.forEach(el => revealObserver.observe(el));

/* ── Section Navigation Dots ── */
const navDots = document.querySelectorAll(".nav-dot");
const sections = document.querySelectorAll("[data-section]");

navDots.forEach(dot => {
  dot.addEventListener("click", () => {
    const target = document.getElementById(dot.dataset.target);
    if (target) target.scrollIntoView({ behavior: "smooth" });
  });
});

const sectionObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      navDots.forEach(d => d.classList.toggle("active", d.dataset.target === entry.target.id));
    }
  });
}, { threshold: 0.5 });

sections.forEach(s => sectionObserver.observe(s));

/* ── Random Glitch Effect on Body ── */
function randomGlitch() {
  if (Math.random() > 0.85) {
    document.body.classList.add("glitch");
    setTimeout(() => document.body.classList.remove("glitch"), 600);
  }
}
setInterval(randomGlitch, 8000);