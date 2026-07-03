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

/* ── Tabbed views (Blogs / Writeups) ── */
const topTabs = document.querySelectorAll(".top-tab");
const contentViews = document.querySelectorAll(".content-view");
const subTabs = document.querySelectorAll(".sub-tab");
const filterChips = document.querySelectorAll(".filter-chip");
const searchInputs = document.querySelectorAll("[data-search-scope]");

let activeTopTab = "writeups";
let activeSubBox = "all";
const activeFilters = { difficulty: "all", os: "all", platform: "all" };
const searchQueries = { writeups: "", blogs: "" };

function getActiveView() {
  return document.querySelector(`.content-view[data-view="${activeTopTab}"]`);
}

function applyTabFilters() {
  const view = getActiveView();
  if (!view) return;
  const grid = view.querySelector(".writeups-grid");
  const empty = view.querySelector(".filter-empty");
  if (!grid) return;

  const cards = grid.querySelectorAll(".box-card");
  let visibleCount = 0;
  const queryKey = activeTopTab === "blogs" ? "blogs" : "writeups";
  const normalizedQuery = searchQueries[queryKey].trim().toLowerCase();

  cards.forEach((card) => {
    const postType = card.dataset.postType || "writeup";
    const postBox = card.dataset.postBox || "";
    const postDifficulty = card.dataset.postDifficulty || "";
    const postOs = card.dataset.postOs || "";
    const postPlatform = card.dataset.postPlatform || "";
    const searchBlob = card.dataset.search || "";

    // Top tab = post type match
    let matchesTop = false;
    if (activeTopTab === "writeups") {
      matchesTop = postType === "writeup";
    } else if (activeTopTab === "blogs") {
      matchesTop = postType === "blog";
    } else {
      matchesTop = true;
    }

    // Sub-tab (within WRITEUPS): findings / box / all
    let matchesSub = true;
    if (activeTopTab === "writeups" && activeSubBox !== "all") {
      matchesSub = postBox === activeSubBox;
    }

    // Filter chips: difficulty / OS / platform (only meaningful for writeups)
    let matchesFilters = true;
    if (activeTopTab === "blogs") {
      matchesFilters = true;
    } else {
      if (activeFilters.difficulty !== "all" && postDifficulty !== activeFilters.difficulty) {
        matchesFilters = false;
      }
      if (matchesFilters && activeFilters.os !== "all" && postOs !== activeFilters.os) {
        matchesFilters = false;
      }
      if (
        matchesFilters &&
        activeFilters.platform !== "all" &&
        postPlatform !== activeFilters.platform
      ) {
        matchesFilters = false;
      }
    }

    const matchesSearch =
      normalizedQuery === "" || searchBlob.includes(normalizedQuery);

    const show = matchesTop && matchesSub && matchesFilters && matchesSearch;
    card.classList.toggle("is-hidden", !show);
    if (show) visibleCount++;
  });

  if (empty) {
    empty.hidden = visibleCount > 0;
    empty.textContent = `No ${activeTopTab === "blogs" ? "blogs" : "writeups"} match.`;
  }
}

function setActiveTopTab(tabId) {
  activeTopTab = tabId;
  activeSubBox = "all";
  activeFilters.difficulty = "all";
  activeFilters.os = "all";
  activeFilters.platform = "all";

  topTabs.forEach((t) => {
    const isActive = t.dataset.topTab === tabId;
    t.classList.toggle("active", isActive);
    t.setAttribute("aria-selected", isActive ? "true" : "false");
  });

  contentViews.forEach((v) => {
    v.hidden = v.dataset.view !== tabId;
  });

  // Sync sub-tabs and chips inside the active view
  const view = getActiveView();
  if (view) {
    view.querySelectorAll(".sub-tab").forEach((s) => {
      const isAll = (s.dataset.box || "all") === "all";
      s.classList.toggle("active", isAll);
      s.setAttribute("aria-selected", isAll ? "true" : "false");
    });
    view.querySelectorAll(".filter-chip").forEach((c) => {
      const isAll = c.dataset.filterValue === "all";
      c.classList.toggle("active", isAll);
    });
  }

  applyTabFilters();
}

function setActiveSubBox(box, view) {
  activeSubBox = box;
  view.querySelectorAll(".sub-tab").forEach((s) => {
    const isActive = (s.dataset.box || "all") === box;
    s.classList.toggle("active", isActive);
    s.setAttribute("aria-selected", isActive ? "true" : "false");
  });
  applyTabFilters();
}

function setActiveFilter(filterType, value, view) {
  activeFilters[filterType] = value;
  view.querySelectorAll(`.filter-chip[data-filter-type="${filterType}"]`).forEach((c) => {
    c.classList.toggle("active", c.dataset.filterValue === value);
  });
  applyTabFilters();
}

topTabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    setActiveTopTab(tab.dataset.topTab);
  });
});

subTabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    const view = tab.closest(".content-view");
    if (!view) return;
    setActiveSubBox(tab.dataset.box || "all", view);
  });
});

filterChips.forEach((chip) => {
  chip.addEventListener("click", () => {
    const view = chip.closest(".content-view");
    if (!view) return;
    setActiveFilter(chip.dataset.filterType, chip.dataset.filterValue, view);
  });
});

// Per-scope search input wiring
searchInputs.forEach((input) => {
  const scope = input.dataset.searchScope;
  const clearBtn = document.querySelector(`[data-clear-scope="${scope}"]`);
  input.value = searchQueries[scope] || "";

  input.addEventListener("input", (e) => {
    searchQueries[scope] = e.target.value || "";
    if (clearBtn) clearBtn.hidden = searchQueries[scope].length === 0;
    applyTabFilters();
  });

  input.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      input.value = "";
      searchQueries[scope] = "";
      if (clearBtn) clearBtn.hidden = true;
      applyTabFilters();
    }
  });

  if (clearBtn) {
    clearBtn.addEventListener("click", () => {
      input.value = "";
      input.focus();
      searchQueries[scope] = "";
      clearBtn.hidden = true;
      applyTabFilters();
    });
  }
});

// Initial render
applyTabFilters();

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
    const inner = card.querySelector(".box-card-inner");
    if (!inner) return;
    let rafId = null;
    let pendingEvent = null;

    const applyTilt = (e) => {
      const rect = card.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      inner.style.transform = `translateZ(0) rotateY(${x * 6}deg) rotateX(${-y * 6}deg)`;
      rafId = null;
    };

    const onEnter = () => {
      card.style.transform = "translateZ(0) translateY(-8px)";
      card.style.boxShadow = "0 14px 40px rgba(0, 255, 65, 0.22)";
    };

    card.addEventListener("mouseenter", onEnter);

    card.addEventListener("mousemove", (e) => {
      pendingEvent = e;
      if (rafId !== null) return;
      rafId = requestAnimationFrame(() => applyTilt(pendingEvent));
    });

    card.addEventListener("mouseleave", () => {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      inner.style.transform = "";
      card.style.transform = "";
      card.style.boxShadow = "";
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
