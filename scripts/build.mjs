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
};

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

function parseFrontmatter(raw) {
  if (!raw.startsWith("---")) return { data: {}, content: raw };

  const end = raw.indexOf("\n---", 3);
  if (end === -1) return { data: {}, content: raw };

  const yamlBlock = raw.slice(4, end).trim();
  const content = raw.slice(end + 4).trim();
  const data = {};
  let currentKey = null;

  for (const line of yamlBlock.split("\n")) {
    const listItem = line.match(/^\s+-\s+(.+)$/);
    if (listItem) {
      if (!currentKey) continue;
      if (!Array.isArray(data[currentKey])) data[currentKey] = [];
      data[currentKey].push(listItem[1].trim().replace(/^["']|["']$/g, ""));
      continue;
    }

    const match = line.match(/^([\w-]+):\s*(.*)$/);
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
  let codeBuffer = [];

  const closeList = () => {
    if (inList) {
      html += "</ul>\n";
      inList = false;
    }
  };

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed.startsWith("<") && !trimmed.startsWith("<!--")) {
      closeList();
      html += line + "\n";
      continue;
    }

    if (line.startsWith("```")) {
      closeList();
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
    if (!entry.isFile() || entry.name.endsWith(".md")) continue;
    fs.copyFileSync(path.join(sourceDir, entry.name), path.join(outputDir, entry.name));
  }

  for (const folder of ["assets", "images"]) {
    const assetPath = path.join(sourceDir, folder);
    if (fs.existsSync(assetPath)) {
      copyDir(assetPath, path.join(outputDir, folder));
    }
  }
}

function pageShell({ title, body, depth, navDots = "" }) {
  const css = `${"../".repeat(depth)}css/style.css`;
  const js = `${"../".repeat(depth)}js/main.js`;

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
  <canvas id="hex-canvas" aria-hidden="true"></canvas>
  <div class="cursor-glow" aria-hidden="true"></div>
  ${navDots}
  <main class="page">
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

function renderWriteupPage(post, htmlBody) {
  const metaLine = [post.difficulty, post.os, post.platform, post.date].filter(Boolean).join(" • ");

  const body = `
    <header class="hero visible" id="hero" data-section>
      <div class="hero-hex-wrap">
        <div class="hero-hex" aria-hidden="true">
          <span class="hero-hex-inner">${escapeHtml((post.platform || "PWN").slice(0, 3).toUpperCase())}</span>
        </div>
      </div>
      <h1 class="hero-name">${escapeHtml(post.title)}</h1>
      <p class="hero-title">${escapeHtml(metaLine || "Offensive security writeup")}</p>
    </header>

    <section class="section visible" id="content" data-section>
      <div class="section-header">
        <div class="section-hex" aria-hidden="true"></div>
        <h2 class="section-title"><span>//</span> WRITEUP</h2>
      </div>
      <article class="panel md-content">${htmlBody}</article>
    </section>`;

  return pageShell({ title: post.title, body, depth: 4 });
}

function renderBlogPage(post, htmlBody) {
  const body = `
    <header class="hero visible" id="hero" data-section>
      <div class="hero-hex-wrap">
        <div class="hero-hex" aria-hidden="true">
          <span class="hero-hex-inner">LOG</span>
        </div>
      </div>
      <h1 class="hero-name">${escapeHtml(post.title)}</h1>
      <p class="hero-title">${escapeHtml(post.date || "")}${post.category ? ` • ${post.category}` : ""}</p>
    </header>

    <section class="section visible" id="content" data-section>
      <div class="section-header">
        <div class="section-hex" aria-hidden="true"></div>
        <h2 class="section-title"><span>//</span> BLOG</h2>
      </div>
      <article class="panel md-content">${htmlBody}</article>
    </section>`;

  return pageShell({ title: post.title, body, depth: 3 });
}

function renderWriteupCard(post) {
  const diff = slugify(post.difficulty || "medium");
  const platform = slugify(post.platform || "lab");
  const tags = (post.tags || []).map(tag => `<span>${escapeHtml(tag)}</span>`).join("");

  const details = [];
  if (post.initialAccess) details.push(`<p><strong>Initial Access:</strong> ${escapeHtml(post.initialAccess)}</p>`);
  if (post.privesc) details.push(`<p><strong>PrivEsc:</strong> ${escapeHtml(post.privesc)}</p>`);
  if (!details.length && post.summary) details.push(`<p>${escapeHtml(post.summary)}</p>`);

  return `
    <article class="writeup-card terminal-theme">
      <div class="card-glitch-bar"></div>
      <div class="machine-info">
        <span class="platform-badge ${escapeHtml(platform)}">${escapeHtml(post.platform || "LAB")}</span>
        <h3 class="machine-name">${escapeHtml(post.title)}</h3>
        <span class="difficulty-badge ${escapeHtml(diff)}">${escapeHtml(post.difficulty || "Medium")}</span>
      </div>
      <div class="pwn-details">${details.join("")}</div>
      <div class="tech-tags">${tags}</div>
      <a href="${escapeHtml(post.url)}" class="btn-read-writeup">[CAT /root/flag.txt]</a>
    </article>`;
}

function renderBlogCard(post) {
  const tags = (post.tags || []).map(tag => `<span>${escapeHtml(tag)}</span>`).join("");

  return `
    <article class="writeup-card terminal-theme blog-card">
      <div class="card-glitch-bar"></div>
      <div class="machine-info">
        <span class="platform-badge blog">BLOG</span>
        <h3 class="machine-name">${escapeHtml(post.title)}</h3>
        <span class="difficulty-badge medium">${escapeHtml(post.date || "")}</span>
      </div>
      <div class="pwn-details">
        <p>${escapeHtml(post.summary || "Cybersecurity notes and research.")}</p>
      </div>
      <div class="tech-tags">${tags}</div>
      <a href="${escapeHtml(post.url)}" class="btn-read-writeup">[READ /var/log/entry.md]</a>
    </article>`;
}

function renderHub(writeups, blogs) {
  const writeupGroups = {};
  for (const post of writeups) {
    if (!writeupGroups[post.category]) writeupGroups[post.category] = [];
    writeupGroups[post.category].push(post);
  }

  const body = `
    <header class="hero" id="hero" data-section>
      <div class="hero-hex-wrap">
        <div class="hero-hex" aria-hidden="true">
          <span class="hero-hex-inner">PWN</span>
        </div>
      </div>
      <h1 class="hero-name">H4rm0ny Content Hub</h1>
      <p class="hero-title" id="typewriter">&gt; Obsidian vault synced. Rendering payloads...</p>

      <div class="stats-container">
        <div class="stat-box">
          <div class="stat-value">${writeups.length}</div>
          <div class="stat-label">WRITEUPS</div>
        </div>
        <div class="stat-box">
          <div class="stat-value">${blogs.length}</div>
          <div class="stat-label">BLOG POSTS</div>
        </div>
        <div class="stat-box">
          <div class="stat-value">${Object.keys(writeupGroups).length}</div>
          <div class="stat-label">SECTIONS</div>
        </div>
      </div>
    </header>

    <div class="nav-tabs">
      <button class="tab active" data-target="linux">/// Linux Targets</button>
      <button class="tab" data-target="findings">/// Findings</button>
      <button class="tab" data-target="writeup">/// Latest Writeups</button>
    </div>

    <div class="section active" id="tab-linux">
      <div class="writeups-grid">
        ${writeups.map(post => renderWriteupCard(post)).join("\n")}
      </div>
    </div>

    ${blogs.length ? `
    <div class="section" id="tab-findings">
      <div class="writeups-grid">
        ${blogs.map(post => renderBlogCard(post)).join("\n")}
      </div>
    </div>` : ""}
  `;

  return pageShell({ title: "H4rm0ny Content Hub", body, depth: 0 });
}

function build() {
  emptyDir(OUT);
  copyDir(path.join(ROOT, "css"), path.join(OUT, "css"));
  copyDir(path.join(ROOT, "js"), path.join(OUT, "js"));
  fs.copyFileSync(path.join(ROOT, ".nojekyll"), path.join(OUT, ".nojekyll"));

  const files = walkMarkdownFiles(CONTENT).filter(file => !file.includes(`${path.sep}_templates${path.sep}`));

  const writeups = [];
  const blogs = [];

  for (const file of files) {
    const raw = fs.readFileSync(file, "utf8");
    const { data, content } = parseFrontmatter(raw);
    if (data.draft) continue;

    const meta = inferMeta(file, data);
    const post = {
      title: data.title || meta.slug,
      type: meta.type,
      category: meta.category,
      slug: meta.slug,
      platform: data.platform || "",
      difficulty: data.difficulty || "",
      os: data.os || "",
      date: data.date || "",
      tags: Array.isArray(data.tags) ? data.tags : [],
      summary: data.summary || "",
      initialAccess: data.initialAccess || "",
      privesc: data.privesc || "",
    };

    const htmlBody = markdownToHtml(content);

    if (meta.type === "blog") {
      const outDir = path.join(OUT, "posts", "blogs", meta.category, meta.slug);
      ensureDir(outDir);
      copyPostAssets(file, outDir);
      post.url = `posts/blogs/${meta.category}/${meta.slug}/index.html`;
      fs.writeFileSync(path.join(outDir, "index.html"), renderBlogPage(post, htmlBody));
      blogs.push(post);
    } else {
      const outDir = path.join(OUT, "posts", "writeups", meta.category, meta.slug);
      ensureDir(outDir);
      copyPostAssets(file, outDir);
      post.url = `posts/writeups/${meta.category}/${meta.slug}/index.html`;
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