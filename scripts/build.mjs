import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const CONTENT = path.join(ROOT, "content");
const OUT = path.join(ROOT, "_site");

const WRITEUP_CATEGORIES = {
  "active-directory": "Directory Exploitation (AD)",
  linux: "Linux Targets",
  windows: "Windows Targets",
  misc: "Misc Targets",
  findings: "Findings",
  "infinity learning": "Infinity Learning",
};

function writeupCategoryKey(rawCategory) {
  return String(rawCategory || "misc")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "misc";
}

function writeupCategoryLabel(rawCategory) {
  const key = writeupCategoryKey(rawCategory);
  if (WRITEUP_CATEGORIES[key]) return WRITEUP_CATEGORIES[key];
  // Fallback: humanize the raw category (Title Case)
  return String(rawCategory || "Misc")
    .trim()
    .split(/[\s-_]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

// Map any writeup category to one of two top-level tabs:
//   - "findings" (security research writeups)
//   - "box"      (anything else: linux/windows/AD/CTF labs)
function writeupBoxKey(rawCategory) {
  const key = writeupCategoryKey(rawCategory);
  return key === "findings" ? "findings" : "box";
}

function writeupBoxLabel(rawCategory) {
  return writeupBoxKey(rawCategory) === "findings" ? "Findings" : "Boxes";
}

const BLOG_CATEGORIES = {
  general: "General",
  "red-team": "Red Team",
  "blue-team": "Blue Team",
  tools: "Tools & Automation",
  notes: "Notes",
};

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function slugify(value) {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeDifficulty(value) {
  const raw = String(value ?? "").trim();
  if (!raw || /^-+$/.test(raw)) return "medium";
  return raw;
}

function normalizeOs(value) {
  const raw = String(value ?? "").trim();
  if (!raw || /^-+$/.test(raw)) return "";
  return raw;
}

function formatCardDate(value) {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  return raw.length >= 7 ? raw.slice(0, 7) : raw;
}

function cardInitials(title) {
  const words = String(title || "??")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  return String(title || "??").slice(0, 2).toUpperCase();
}

function buildAvatarSvg(initials) {
  const label = escapeHtml(initials);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" role="img" aria-hidden="true">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0a140a"/>
      <stop offset="100%" stop-color="#122412"/>
    </linearGradient>
  </defs>
  <rect width="64" height="64" rx="32" fill="url(#bg)"/>
  <circle cx="32" cy="32" r="28" fill="none" stroke="#00ff41" stroke-opacity="0.35" stroke-width="1.5"/>
  <text x="32" y="38" text-anchor="middle" font-family="Consolas, monospace" font-size="18" font-weight="700" fill="#00ff41">${label}</text>
</svg>`;
}

function defaultCoverPath(depth) {
  return `${"../".repeat(depth)}assets/default.png`;
}

function resolveWriteupMedia(post, sourceDir, outDir, meta, avatarFile, coverFile) {
  const baseUrl = `posts/writeups/${meta.category}/${meta.slug}`;

  if (avatarFile && fs.existsSync(path.join(sourceDir, avatarFile))) {
    post.avatarPageUrl = avatarFile;
  } else {
    const generated = "avatar.svg";
    const generatedPath = path.join(outDir, generated);
    if (!fs.existsSync(generatedPath)) {
      fs.writeFileSync(generatedPath, buildAvatarSvg(cardInitials(post.title)));
    }
    post.avatarPageUrl = generated;
  }
  post.avatarUrl = `${baseUrl}/${post.avatarPageUrl}`;

  post.coverUrl =
    coverFile && fs.existsSync(path.join(sourceDir, coverFile)) ? coverFile : "";
}

function parseFrontmatter(raw) {
  if (!raw.startsWith("---")) return { data: {}, content: raw };

  const end = raw.indexOf("\n---", 3);
  if (end === -1) return { data: {}, content: raw };

  const yamlBlock = raw.slice(4, end).trim();
  const content = raw.slice(end + 4).trim();
  const data = {};
  let currentKey = null;

  for (const line of yamlBlock.split("\n")) {
    const cleanLine = line.replace(/\r$/, "");
    const listItem = cleanLine.match(/^\s+-\s+(.+)$/);
    if (listItem) {
      if (!currentKey) continue;
      if (!Array.isArray(data[currentKey])) data[currentKey] = [];
      data[currentKey].push(listItem[1].trim().replace(/^["']|["']$/g, ""));
      continue;
    }

    const match = cleanLine.match(/^([\w-]+):\s*(.*)$/);
    if (!match) continue;

    currentKey = match[1];
    const value = match[2].trim();

    if (value === "") {
      data[currentKey] = [];
      continue;
    }

    if (value === "true") data[currentKey] = true;
    else if (value === "false") data[currentKey] = false;
    else data[currentKey] = value.replace(/^["']|["']$/g, "");
  }

  return { data, content };
}

function inlineMarkdown(text) {
  const parts = [];
  const pattern = /!\[([^\]]*)\]\(([^)]+)\)|\[([^\]]+)\]\(([^)]+)\)|`([^`]+)`|\*\*([^*]+)\*\*/g;
  let last = 0;
  let match;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > last) parts.push(escapeHtml(text.slice(last, match.index)));
    if (match[1] !== undefined) {
      parts.push(`<img alt="${escapeHtml(match[1])}" src="${escapeHtml(match[2])}" />`);
    } else if (match[3]) {
      parts.push(`<a href="${escapeHtml(match[4])}">${escapeHtml(match[3])}</a>`);
    } else if (match[5]) {
      parts.push(`<code>${escapeHtml(match[5])}</code>`);
    } else if (match[6]) {
      parts.push(`<strong>${escapeHtml(match[6])}</strong>`);
    }
    last = pattern.lastIndex;
  }

  if (last < text.length) parts.push(escapeHtml(text.slice(last)));
  return parts.join("");
}

function markdownToHtml(markdown) {
  const lines = markdown.split("\n");
  let html = "";
  let inCode = false;
  let inList = false;
  let inBlockquote = false;
  let codeBuffer = [];

  const closeList = () => {
    if (inList) {
      html += "</ul>\n";
      inList = false;
    }
  };

  const closeBlockquote = () => {
    if (inBlockquote) {
      html += "</blockquote>\n";
      inBlockquote = false;
    }
  };

  const isTableRow = (line) => line.trim().startsWith("|") && line.trim().endsWith("|");

  const renderTable = (startIndex) => {
    const rows = [];
    let index = startIndex;
    while (index < lines.length && isTableRow(lines[index])) {
      rows.push(
        lines[index]
          .trim()
          .slice(1, -1)
          .split("|")
          .map((cell) => cell.trim())
      );
      index++;
    }

    if (rows.length < 2) return { html: "", nextIndex: startIndex };

    const bodyRows = rows.slice(2);
    let tableHtml = "<table><thead><tr>";
    rows[0].forEach((cell) => {
      tableHtml += `<th>${inlineMarkdown(cell)}</th>`;
    });
    tableHtml += "</tr></thead><tbody>";
    bodyRows.forEach((row) => {
      tableHtml += "<tr>";
      row.forEach((cell) => {
        tableHtml += `<td>${inlineMarkdown(cell)}</td>`;
      });
      tableHtml += "</tr>";
    });
    tableHtml += "</tbody></table>\n";
    return { html: tableHtml, nextIndex: index };
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (trimmed.startsWith("<") && !trimmed.startsWith("<!--")) {
      closeList();
      closeBlockquote();
      html += `${line}\n`;
      continue;
    }

    if (line.startsWith("```")) {
      closeList();
      closeBlockquote();
      if (!inCode) {
        inCode = true;
        codeBuffer = [];
      } else {
        inCode = false;
        html += `<pre><code>${escapeHtml(codeBuffer.join("\n"))}</code></pre>\n`;
      }
      continue;
    }

    if (inCode) {
      codeBuffer.push(line);
      continue;
    }

    if (/^---+$/.test(trimmed)) {
      closeList();
      closeBlockquote();
      html += "<hr />\n";
      continue;
    }

    if (isTableRow(line)) {
      closeList();
      closeBlockquote();
      const table = renderTable(i);
      html += table.html;
      i = table.nextIndex - 1;
      continue;
    }

    if (trimmed.startsWith(">")) {
      closeList();
      const quoteText = trimmed.replace(/^>\s?/, "");
      if (!inBlockquote) {
        html += "<blockquote>\n";
        inBlockquote = true;
      }
      html += `<p>${inlineMarkdown(quoteText)}</p>\n`;
      continue;
    }

    closeBlockquote();

    if (line.startsWith("# ")) {
      closeList();
      html += `<h1>${inlineMarkdown(line.slice(2))}</h1>\n`;
      continue;
    }
    if (line.startsWith("## ")) {
      closeList();
      html += `<h2>${inlineMarkdown(line.slice(3))}</h2>\n`;
      continue;
    }
    if (line.startsWith("### ")) {
      closeList();
      html += `<h3>${inlineMarkdown(line.slice(4))}</h3>\n`;
      continue;
    }

    if (line.startsWith("- ") || line.startsWith("* ")) {
      if (!inList) {
        html += "<ul>\n";
        inList = true;
      }
      html += `<li>${inlineMarkdown(line.slice(2))}</li>\n`;
      continue;
    }

    if (!trimmed) {
      closeList();
      continue;
    }

    closeList();
    html += `<p>${inlineMarkdown(line)}</p>\n`;
  }

  closeList();
  closeBlockquote();
  if (inCode) {
    html += `<pre><code>${escapeHtml(codeBuffer.join("\n"))}</code></pre>\n`;
  }

  return html;
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function emptyDir(dir) {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
  fs.mkdirSync(dir, { recursive: true });
}

function copyDir(src, dest) {
  if (!fs.existsSync(src)) return;
  ensureDir(dest);
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const from = path.join(src, entry.name);
    const to = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(from, to);
    else fs.copyFileSync(from, to);
  }
}

function walkMarkdownFiles(dir, files = []) {
  if (!fs.existsSync(dir)) return files;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkMarkdownFiles(full, files);
    else if (entry.name.endsWith(".md")) files.push(full);
  }
  return files;
}

function inferMeta(filePath, data) {
  const rel = path.relative(CONTENT, filePath).replace(/\\/g, "/");
  const parts = rel.split("/");
  const fileName = path.basename(filePath, ".md");
  const parentDir = parts.length > 1 ? parts[parts.length - 2] : "misc";

  const type = data.type || (parts[0] === "blogs" ? "blog" : "writeup");
  const category = data.category || (type === "blog" ? parts[1] || "general" : parts[1] || parentDir || "misc");
  const slug = data.slug || slugify(fileName === "index" ? parentDir : fileName);

  return { type, category, slug, rel, fileName, parentDir };
}

function copyPostAssets(sourceFile, outputDir) {
  const sourceDir = path.dirname(sourceFile);
  ensureDir(outputDir);

  for (const entry of fs.readdirSync(sourceDir, { withFileTypes: true })) {
    if (!entry.isFile()) continue;
    if (entry.name.endsWith(".md")) continue;
    fs.copyFileSync(path.join(sourceDir, entry.name), path.join(outputDir, entry.name));
  }

  for (const folder of ["assets", "images"]) {
    const assetPath = path.join(sourceDir, folder);
    if (fs.existsSync(assetPath)) {
      copyDir(assetPath, path.join(outputDir, folder));
    }
  }
}

function pageShell({ title, body, depth, navDots = "", pageClass = "" }) {
  const css = `${"../".repeat(depth)}css/style.css`;
  const js = `${"../".repeat(depth)}js/main.js`;
  const mainClass = pageClass ? `page ${pageClass}` : "page";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(title)} | H4rm0ny Hub</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;700&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="${css}" />
</head>
<body class="scanlines">
  <div class="scroll-progress" aria-hidden="true"></div>
  <div class="vignette" aria-hidden="true"></div>
  <div class="scan-line" aria-hidden="true"></div>
  <canvas id="hex-canvas" aria-hidden="true"></canvas>
  <div class="cursor-glow" aria-hidden="true"></div>
  ${navDots}
  <main class="${mainClass}">
    ${body}
    <footer>
      <span class="hex-dot" aria-hidden="true"></span>
      H4rm0ny Content Hub &copy; ${new Date().getFullYear()}
      <span class="hex-dot" aria-hidden="true"></span>
    </footer>
  </main>
  <script type="module" src="${js}"></script>
</body>
</html>`;
}

function renderWriteupHeroBadge(post) {
  if (post.avatarPageUrl) {
    return `<div class="hero-avatar-wrap"><img class="hero-avatar" src="${escapeHtml(post.avatarPageUrl)}" alt="" loading="eager" /></div>`;
  }
  return `<div class="hero-avatar-wrap hero-avatar-fallback"><span class="hero-avatar-initials">${escapeHtml(cardInitials(post.title))}</span></div>`;
}

function renderWriteupPage(post, htmlBody) {
  const depth = 4;
  const metaLine = [post.difficulty, post.os, post.platform, post.date].filter(Boolean).join(" • ");
  

  const body = `
    <p class="back-link"><a href="../../../../index.html">← cd ../hub</a></p>
    <header class="hero writeup-hero visible" id="hero" data-section>
      <div class="hero-inner">
        ${renderWriteupHeroBadge(post)}
        <h1 class="hero-name">${escapeHtml(post.title)}</h1>
        <p class="hero-title">${escapeHtml(metaLine || "Offensive security writeup")}</p>
        ${post.summary ? `<p class="hero-summary">${escapeHtml(post.summary)}</p>` : ""}
      </div>
    </header>

    <section class="section visible" id="content" data-section>
      <div class="section-header">
        <div class="section-hex" aria-hidden="true"></div>
        <h2 class="section-title"><span>//</span> WRITEUP</h2>
      </div>
      <article class="panel md-content">${htmlBody}</article>
    </section>`;

  return pageShell({ title: post.title, body, depth: 4, pageClass: "writeup-page" });
}

function renderBlogPage(post, htmlBody) {
  const hasCover = Boolean(post.coverUrl);
  const heroClass = hasCover ? "hero writeup-hero has-cover visible" : "hero visible";
  

  const coverBg = hasCover
    ? `<div class="writeup-hero-bg" style="background-image:url('${escapeHtml(post.coverUrl)}')" aria-hidden="true"></div>`
    : "";

  const body = `
    <header class="${heroClass}" id="hero" data-section>
      ${coverBg}
      ${hasCover ? `<div class="writeup-hero-scrim" aria-hidden="true"></div>` : ""}
      <div class="hero-inner">
        <div class="hero-hex-wrap">
          <div class="hero-hex" aria-hidden="true">
            <span class="hero-hex-inner">LOG</span>
          </div>
        </div>
        <h1 class="hero-name">${escapeHtml(post.title)}</h1>
        <p class="hero-title">${escapeHtml(post.date || "")}${post.category ? ` â€¢ ${post.category}` : ""}</p>
        ${post.summary ? `<p class="hero-summary">${escapeHtml(post.summary)}</p>` : ""}
      </div>
    </header>

    <section class="section visible" id="content" data-section>
      <div class="section-header">
        <div class="section-hex" aria-hidden="true"></div>
        <h2 class="section-title"><span>//</span> BLOG</h2>
      </div>
      <article class="panel md-content">${htmlBody}</article>
    </section>`;

  return pageShell({ title: post.title, body, depth: 3, pageClass: "writeup-page" });
}

function renderWriteupCard(post) {
  const diff = slugify(normalizeDifficulty(post.difficulty));
  const osSlug = slugify(normalizeOs(post.os) || "other");
  const osLabel = normalizeOs(post.os) || "N/A";
  const diffLabel = normalizeDifficulty(post.difficulty);
  const dateLabel = formatCardDate(post.date);
  const tags = (post.tags || [])
    .slice(0, 6)
    .map((tag) => `<span class="box-tag">${escapeHtml(tag)}</span>`)
    .join("");

  // Build a compact search index from every searchable field
  const searchBlob = [
    post.title,
    post.summary,
    post.initialAccess,
    post.privesc,
    post.platform,
    post.category,
    (post.tags || []).join(" "),
    post.os,
    post.difficulty,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const avatarInner = post.avatarUrl
    ? `<img class="box-avatar-img" src="${escapeHtml(post.avatarUrl)}" alt="" loading="lazy" />`
    : `<span class="box-avatar-initials">${escapeHtml(cardInitials(post.title))}</span>`;

  const summaryBlock = post.summary
    ? `<p class="box-summary">${escapeHtml(post.summary)}</p>`
    : "";

  return `
    <a href="${escapeHtml(post.url)}" class="box-card writeup-card diff-${escapeHtml(diff)}"
      data-difficulty="${escapeHtml(diff)}" data-os="${escapeHtml(osSlug)}" data-category="${escapeHtml(slugify(post.category))}"
      data-tags="${escapeHtml((post.tags || []).join(","))}"
      data-platform="${escapeHtml((post.platform || "").toLowerCase())}"
      data-summary="${escapeHtml((post.summary || "").toLowerCase())}"
      data-initial-access="${escapeHtml((post.initialAccess || "").toLowerCase())}"
      data-privesc="${escapeHtml((post.privesc || "").toLowerCase())}"
      data-search="${escapeHtml(searchBlob)}">
      <div class="box-card-inner">
        <div class="box-card-head">
          <div class="box-avatar">${avatarInner}</div>
          <h3 class="box-title">${escapeHtml(post.title)}</h3>
          <span class="box-diff ${escapeHtml(diff)}">${escapeHtml(diffLabel.toUpperCase())}</span>
        </div>
        <div class="box-card-meta">
          <span class="box-os"><span class="os-dot ${escapeHtml(osSlug)}" aria-hidden="true"></span>${escapeHtml(osLabel)}</span>
          <span class="box-date">${escapeHtml(dateLabel)}</span>
        </div>
        ${summaryBlock}
        <div class="box-tags">${tags}</div>
      </div>
      <div class="box-accent diff-${escapeHtml(diff)}" aria-hidden="true"></div>
    </a>`;
}

function renderBlogCard(post) {
  const tags = (post.tags || [])
    .slice(0, 5)
    .map((tag) => `<span class="box-tag">${escapeHtml(tag)}</span>`)
    .join("");
  const dateLabel = formatCardDate(post.date);

  const summaryBlock = post.summary
    ? `<p class="box-summary">${escapeHtml(post.summary)}</p>`
    : "";

  return `
    <a href="${escapeHtml(post.url)}" class="box-card writeup-card blog-card diff-medium" data-difficulty="blog" data-os="blog">
      <div class="box-card-inner">
        <div class="box-card-head">
          <div class="box-avatar"><span class="box-avatar-initials">BL</span></div>
          <h3 class="box-title">${escapeHtml(post.title)}</h3>
          <span class="box-diff blog">BLOG</span>
        </div>
        <div class="box-card-meta">
          <span class="box-os"><span class="os-dot blog" aria-hidden="true"></span>${escapeHtml(BLOG_CATEGORIES[post.category] || post.category)}</span>
          <span class="box-date">${escapeHtml(dateLabel)}</span>
        </div>
        ${summaryBlock}
        <div class="box-tags">${tags}</div>
      </div>
      <div class="box-accent diff-medium" aria-hidden="true"></div>
    </a>`;
}

function renderHub(writeups, blogs) {
  const blogGroups = {};
  for (const post of blogs) {
    if (!blogGroups[post.category]) blogGroups[post.category] = [];
    blogGroups[post.category].push(post);
  }

  // Group writeups by category (preserving order of first appearance)
  const writeupGroups = {};
  const categoryOrder = [];
  for (const post of writeups) {
    const key = writeupCategoryKey(post.category);
    if (!writeupGroups[key]) {
      writeupGroups[key] = [];
      categoryOrder.push(key);
    }
    writeupGroups[key].push(post);
  }

  // ── Tabs navigation ──
  // Top-level tabs: Writeups first (default), then Blogs.
  // Order matters: topTabs[0] is the default tab on initial render + refresh.
  const topTabs = [];
  if (writeups.length) topTabs.push({ id: "writeups", label: "WRITEUPS" });
  if (blogs.length) topTabs.push({ id: "blogs", label: "BLOGS" });

  // If neither has content, fall back to a single placeholder
  if (!topTabs.length) topTabs.push({ id: "empty", label: "NO CONTENT" });

  // Sub-tabs per top tab (categories)
  const writeupSubTabs = categoryOrder.map((key) => ({
    id: `writeup-${key}`,
    category: key,
    label: writeupCategoryLabel(writeupGroups[key][0].category),
  }));
  const blogSubTabs = Object.keys(blogGroups).map((key) => ({
    id: `blog-${key}`,
    category: key,
    label: BLOG_CATEGORIES[key] || key,
  }));

  // Auto-generate chips from writeup data
  const seenDifficulties = new Set();
  const seenOs = new Set();
  const seenPlatforms = new Set();
  for (const post of writeups) {
    if (post.difficulty) {
      const key = slugify(normalizeDifficulty(post.difficulty));
      if (key && key !== "medium") seenDifficulties.add(key);
      else if (key === "medium") seenDifficulties.add(key);
    }
    const osKey = slugify(normalizeOs(post.os) || "");
    if (osKey && osKey !== "other") seenOs.add(osKey);
    if (post.platform && post.platform.trim() && post.platform !== "---") {
      const platKey = slugify(post.platform);
      if (platKey) seenPlatforms.add(platKey);
    }
  }

  const difficultyOrder = ["easy", "medium", "hard", "insane"];
  const osOrder = ["linux", "windows"];
  const platformList = Array.from(seenPlatforms).sort();

  const difficultyChips = [
    { id: "all-difficulty", label: "ALL", value: "all" },
    ...difficultyOrder
      .filter((d) => seenDifficulties.has(d))
      .map((d) => ({ id: d, label: d.toUpperCase(), value: d })),
  ];

  const osChips = [
    { id: "all-os", label: "ALL", value: "all" },
    ...osOrder
      .filter((o) => seenOs.has(o))
      .map((o) => ({ id: `os-${o}`, label: o.toUpperCase(), value: o })),
    ...Array.from(seenOs)
      .filter((o) => !osOrder.includes(o))
      .map((o) => ({ id: `os-${o}`, label: o.toUpperCase(), value: o })),
  ];

  const platformChips = [
    { id: "all-platform", label: "ALL", value: "all" },
    ...platformList.map((p) => ({
      id: `platform-${p}`,
      label: p.replace(/-/g, " ").toUpperCase(),
      value: p,
    })),
  ];

  const navItems = [
    { id: "hero", label: "Dashboard" },
    { id: "writeups-area", label: "Writeups" },
  ];
  if (blogs.length) navItems.push({ id: "blogs-area", label: "Cyber Blogs" });

  const navDots = `
  <nav class="nav-dots" aria-label="Section navigation">
    ${navItems
      .map(
        (item, idx) =>
          `<button class="nav-dot${idx === 0 ? " active" : ""}" data-target="${item.id}" aria-label="${escapeHtml(item.label)}"></button>`
      )
      .join("\n    ")}
  </nav>`;

  // Top-level tab bar (always visible above the content)
  const topTabsHtml = `
    <nav class="top-tabs" role="tablist" aria-label="Content type">
      ${topTabs
        .map(
          (t, idx) =>
            `<button type="button" class="top-tab${idx === 0 ? " active" : ""}" role="tab" data-top-tab="${escapeHtml(t.id)}" aria-selected="${idx === 0 ? "true" : "false"}">${escapeHtml(t.label)}</button>`
        )
        .join("\n      ")}
    </nav>`;

  // Sub-tabs bar for WRITEUPS view (Findings / Boxes only)
  const writeupSubTabsHtml =
    writeups.length
      ? `
    <nav class="sub-tabs" role="tablist" aria-label="Writeup type">
      <button type="button" class="sub-tab active" role="tab" data-sub-tab="writeup-all-boxes" data-box="all" aria-selected="true">ALL</button>
      <button type="button" class="sub-tab" role="tab" data-sub-tab="writeup-findings" data-box="findings" aria-selected="false">FINDINGS</button>
      <button type="button" class="sub-tab" role="tab" data-sub-tab="writeup-boxes" data-box="box" aria-selected="false">BOXES</button>
    </nav>`
      : "";

  // Sub-tabs bar for BLOGS view
  const blogSubTabsHtml =
    blogSubTabs.length > 1
      ? `
    <nav class="sub-tabs" role="tablist" aria-label="Blog categories">
      <button type="button" class="sub-tab active" role="tab" data-sub-tab="blog-all-categories" data-category="all" aria-selected="true">ALL</button>
      ${blogSubTabs
        .map(
          (t) =>
            `<button type="button" class="sub-tab" role="tab" data-sub-tab="${escapeHtml(t.id)}" data-category="${escapeHtml(t.category)}" aria-selected="false">${escapeHtml(t.label.toUpperCase())}</button>`
        )
        .join("\n      ")}
    </nav>`
      : "";

  // Filter chips: difficulty + OS + platform (only for writeups/all views)
  const renderChipGroup = (chips, filterType, ariaLabel) =>
    chips.length > 1
      ? `
    <div class="filter-chip-group" data-filter-type="${filterType}" role="toolbar" aria-label="${escapeHtml(ariaLabel)}">
      <span class="filter-chip-label">${escapeHtml(ariaLabel)}</span>
      <div class="filter-chip-row">
        ${chips
          .map(
            (c, idx) =>
              `<button type="button" class="filter-chip${idx === 0 ? " active" : ""}" data-filter-type="${escapeHtml(filterType)}" data-filter-value="${escapeHtml(c.value)}">${escapeHtml(c.label)}</button>`
          )
          .join("\n        ")}
      </div>
    </div>`
      : "";

  const writeupChipsHtml =
    writeups.length
      ? `<div class="filter-chip-groups">${[
          renderChipGroup(difficultyChips, "difficulty", "DIFFICULTY"),
          renderChipGroup(osChips, "os", "OS"),
          renderChipGroup(platformChips, "platform", "PLATFORM"),
        ]
          .filter(Boolean)
          .join("")}</div>`
      : "";

  const searchBar = (scopeId) => `
    <div class="writeup-search" role="search">
      <input type="search" id="writeup-search-input-${scopeId}" data-search-scope="${scopeId}" placeholder="grep -ri 'cve, wordpress, privesc, ssh...'" autocomplete="off" spellcheck="false" aria-label="Search writeups by name, CVE, tag, or content" />
      <button type="button" id="writeup-search-clear-${scopeId}" data-clear-scope="${scopeId}" class="search-clear" aria-label="Clear search" hidden>*</button>
    </div>`;

  // Render cards with data attributes so JS can show/hide based on tabs + filters
  const renderCardsFor = (posts, type) =>
    posts
      .map((p) => {
        const cardHtml = type === "blog" ? renderBlogCard(p) : renderWriteupCard(p);
        return cardHtml.replace(
          /class="(box-card writeup-card[^"]*)"/,
          `class="$1" data-post-type="${type}" data-post-category="${escapeHtml(writeupCategoryKey(p.category))}" data-post-box="${escapeHtml(writeupBoxKey(p.category))}" data-post-difficulty="${escapeHtml(slugify(normalizeDifficulty(p.difficulty)))}" data-post-os="${escapeHtml(slugify(normalizeOs(p.os) || ""))}" data-post-platform="${escapeHtml(slugify(p.platform || ""))}"`
        );
      })
      .join("\n");

  const allWriteupCards = renderCardsFor(writeups, "writeup");
  const allBlogCards = renderCardsFor(blogs, "blog");

  // ── WRITEUPS view container (no wallet, plain grid + inline sub-tabs) ──
  // Default active tab: BLOGS (per the build's topTabs[0]). Inactive view is
  // hidden via the `hidden` attribute AND the missing `.visible` class so
  // the `.section.visible { display: block }` CSS rule doesn't override it.
  const writeupViewClass = topTabs[0]?.id === "writeups" ? "section visible content-view" : "section content-view";
  const writeupView = `
    <section class="${writeupViewClass}" id="view-writeups" data-view="writeups" data-section${topTabs[0]?.id === "writeups" ? "" : " hidden"}>
      ${searchBar("writeups")}
      ${writeupChipsHtml}
      <div class="writeups-grid box-grid" id="writeups-grid-writeups">${allWriteupCards}</div>
      <p class="filter-empty" hidden>No writeups match this filter.</p>
    </section>`;

  // ── BLOGS view container ──
  const blogView = blogs.length
    ? `
    <section class="section ${topTabs[0]?.id === "blogs" ? "visible" : ""} content-view" id="view-blogs" data-view="blogs" data-section${topTabs[0]?.id === "blogs" ? "" : " hidden"}>
      ${searchBar("blogs")}
      <div class="writeups-grid box-grid" id="writeups-grid-blogs">${allBlogCards}</div>
      <p class="filter-empty" hidden>No blogs match this filter.</p>
    </section>`
    : "";

  const writeupSection = `${writeupView}${blogView}`;

  const body = `
    <header class="hero visible" id="hero" data-section>
      <div class="hero-inner">
        <div class="hero-gif-wrap">
          <img class="hero-gif" src="assets/avatar.gif" alt="" loading="eager" />
        </div>
        <h1 class="hero-name">H4rm0ny Content Hub</h1>
        <p class="hero-title" id="typewriter" aria-live="polite">> Initializing operator session...</p>

        <div class="panel stats-container">
          <div class="stat-box">
            <div class="stat-value" data-count="${writeups.length}">0</div>
            <div class="stat-label">WRITEUPS</div>
          </div>
          <div class="stat-box">
            <div class="stat-value" data-count="${blogs.length}">0</div>
            <div class="stat-label">BLOG POSTS</div>
          </div>
          <div class="stat-box">
            <div class="stat-value" data-count="${navItems.length}">0</div>
            <div class="stat-label">SECTIONS</div>
          </div>
        </div>

        <div class="status-bar" aria-live="polite">
          <span class="status-dot" aria-hidden="true"></span>
          <span id="status-text">SESSION: operator@kali ~ #</span>
        </div>

        <p class="hub-note">
          <a href="https://h4rm0ny8.github.io/profile/" target="_blank" rel="noopener noreferrer" style="color: var(--green);">> Profile</a>
          <span style="opacity:0.5"> | Hacking is an art. </span>
        </p>
      </div>
    </header>
    ${topTabsHtml}
    ${writeupSection}`;

  return pageShell({ title: "H4rm0ny Content Hub", body, depth: 0, navDots });
}

function build() {
  emptyDir(OUT);
  copyDir(path.join(ROOT, "css"), path.join(OUT, "css"));
  copyDir(path.join(ROOT, "js"), path.join(OUT, "js"));
  const assetsSrc = path.join(ROOT, "assets");
  if (fs.existsSync(assetsSrc)) copyDir(assetsSrc, path.join(OUT, "assets"));
  fs.copyFileSync(path.join(ROOT, ".nojekyll"), path.join(OUT, ".nojekyll"));

  const files = walkMarkdownFiles(CONTENT).filter((file) => !file.includes(`${path.sep}_templates${path.sep}`));

  const writeups = [];
  const blogs = [];

  for (const file of files) {
    const raw = fs.readFileSync(file, "utf8");
    const { data, content } = parseFrontmatter(raw);
    if (data.draft) continue;

    const meta = inferMeta(file, data);
    const sourceDir = path.dirname(file);
    const avatarFile = data.avatar ? String(data.avatar).replace(/^["']|["']$/g, "") : "";
    const coverFile = data.cover ? String(data.cover).replace(/^["']|["']$/g, "") : "";

    const post = {
      title: data.title || meta.slug,
      type: meta.type,
      category: meta.category,
      slug: meta.slug,
      platform: data.platform || "",
      difficulty: normalizeDifficulty(data.difficulty),
      os: normalizeOs(data.os),
      date: data.date || "",
      tags: Array.isArray(data.tags) ? data.tags : [],
      summary: data.summary || "",
      initialAccess: data.initialAccess || "",
      privesc: data.privesc || "",
      avatarUrl: "",
      avatarPageUrl: "",
      coverUrl: "",
    };

    const htmlBody = markdownToHtml(content);

    if (meta.type === "blog") {
      const outDir = path.join(OUT, "posts", "blogs", meta.category, meta.slug);
      ensureDir(outDir);
      copyPostAssets(file, outDir);
      post.url = `posts/blogs/${meta.category}/${meta.slug}/index.html`;
      if (avatarFile && fs.existsSync(path.join(sourceDir, avatarFile))) {
        post.avatarUrl = `posts/blogs/${meta.category}/${meta.slug}/${avatarFile}`;
        post.avatarPageUrl = avatarFile;
      }
      if (coverFile && fs.existsSync(path.join(sourceDir, coverFile))) {
        post.coverUrl = coverFile;
      }
      fs.writeFileSync(path.join(outDir, "index.html"), renderBlogPage(post, htmlBody));
      blogs.push(post);
    } else {
      const outDir = path.join(OUT, "posts", "writeups", meta.category, meta.slug);
      ensureDir(outDir);
      copyPostAssets(file, outDir);
      post.url = `posts/writeups/${meta.category}/${meta.slug}/index.html`;
      resolveWriteupMedia(post, sourceDir, outDir, meta, avatarFile, coverFile);
      fs.writeFileSync(path.join(outDir, "index.html"), renderWriteupPage(post, htmlBody));
      writeups.push(post);
    }
  }

  writeups.sort((a, b) => String(b.date).localeCompare(String(a.date)));
  blogs.sort((a, b) => String(b.date).localeCompare(String(a.date)));

  fs.writeFileSync(path.join(OUT, "index.html"), renderHub(writeups, blogs));
  console.log(`Built ${writeups.length} writeups and ${blogs.length} blogs into _site/`);
}

build();
