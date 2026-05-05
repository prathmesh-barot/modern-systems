/* ─────────────────────────────────────────────────────────────────────────────
   New Wave  ·  content.js  —  Fetch & render markdown content
   Depends on: marked (CDN), hljs (CDN), main.js
───────────────────────────────────────────────────────────────────────────── */

// ── Configure marked ─────────────────────────────────────────────────────────
function configureMarked() {
  if (typeof marked === "undefined") return;

  marked.setOptions({
    breaks: true,
    gfm: true,
    highlight: (code, lang) => {
      if (typeof hljs !== "undefined") {
        // 1. If language is specified and supported (like "odin", "zig", "rust")
        if (lang && hljs.getLanguage(lang)) {
          return hljs.highlight(code, { language: lang }).value;
        }
        // 2. Catch-all: If no language is specified, Auto-Detect it!
        return hljs.highlightAuto(code).value;
      }
      return code; // Fallback to plain text if hljs fails to load
    },
  });
}

// ── Fetch wrapper ────────────────────────────────────────────────────────────
async function apiFetch(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// ── Fetch content list ───────────────────────────────────────────────────────
async function fetchList(type) {
  return apiFetch(`/api/content/${type}`);
}

// ── Fetch single post ────────────────────────────────────────────────────────
async function fetchPost(type, slug) {
  return apiFetch(`/api/content/${type}/${slug}`);
}

// ── Fetch docs nav ───────────────────────────────────────────────────────────
async function fetchDocsNav() {
  return apiFetch("/api/nav/docs");
}

// ── Render markdown to HTML ──────────────────────────────────────────────────
function renderMarkdown(md) {
  if (typeof marked === "undefined") return `<pre>${md}</pre>`;
  configureMarked();
  return marked.parse(md);
}

// ── Extract headings for TOC ──────────────────────────────────────────────────
function extractHeadings(html) {
  const div = document.createElement("div");
  div.innerHTML = html;
  const hs = div.querySelectorAll("h2, h3");
  return Array.from(hs).map((h) => ({
    level: parseInt(h.tagName[1]),
    text: h.textContent,
    id: window.LO.slugify(h.textContent),
  }));
}

// ── Inject IDs into headings ─────────────────────────────────────────────────
function injectHeadingIds(container) {
  container.querySelectorAll("h2, h3, h4").forEach((h) => {
    if (!h.id) {
      h.id = window.LO.slugify(h.textContent);
    }
  });
}

// ── Build TOC ────────────────────────────────────────────────────────────────
function buildTOC(headings, tocEl) {
  if (!tocEl || headings.length === 0) return;
  tocEl.innerHTML = "";

  const title = document.createElement("p");
  title.className = "toc__title";
  title.textContent = "On this page";
  tocEl.appendChild(title);

  const ul = document.createElement("ul");
  ul.className = "toc__list";
  headings.forEach((h) => {
    const li = document.createElement("li");
    li.className = `toc__item toc__item--h${h.level}`;
    li.innerHTML = `<a href="#${h.id}">${h.text}</a>`;
    ul.appendChild(li);
  });
  tocEl.appendChild(ul);

  // Active on scroll
  const items = tocEl.querySelectorAll(".toc__item");
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          items.forEach((i) => i.classList.remove("active"));
          const id = e.target.id;
          const active = tocEl
            .querySelector(`a[href="#${id}"]`)
            ?.closest(".toc__item");
          if (active) active.classList.add("active");
        }
      });
    },
    {
      rootMargin: `-${getComputedStyle(document.documentElement).getPropertyValue("--nav-h") || "60px"} 0px -80% 0px`,
    },
  );

  document
    .querySelectorAll("h2[id], h3[id]")
    .forEach((h) => observer.observe(h));
}

// ── Skeleton loader ───────────────────────────────────────────────────────────
function showListSkeleton(container, count = 6) {
  container.innerHTML = Array.from(
    { length: count },
    () => `
    <div class="post-card" style="gap:10px">
      <div class="skeleton skeleton-text skeleton-text--short" style="height:0.7em"></div>
      <div class="skeleton skeleton-text" style="height:1.1em; width:75%"></div>
      <div class="skeleton skeleton-text skeleton-text--full" style="height:0.85em"></div>
      <div class="skeleton skeleton-text" style="height:0.85em; width:80%"></div>
    </div>
  `,
  ).join("");
}

function showPostSkeleton(container) {
  container.innerHTML = `
    <div style="display:flex;flex-direction:column;gap:16px">
      <div class="skeleton" style="height:1em;width:100px"></div>
      <div class="skeleton" style="height:2.5em;width:75%"></div>
      <div class="skeleton" style="height:1em;width:55%"></div>
      <div class="skeleton" style="height:1px;width:100%"></div>
      <div class="skeleton skeleton-text skeleton-text--full"></div>
      <div class="skeleton skeleton-text skeleton-text--full"></div>
      <div class="skeleton skeleton-text" style="width:85%"></div>
      <div class="skeleton skeleton-text skeleton-text--full"></div>
      <div class="skeleton skeleton-text" style="width:90%"></div>
    </div>
  `;
}

// ── Export ───────────────────────────────────────────────────────────────────
window.LOContent = {
  fetchList,
  fetchPost,
  fetchDocsNav,
  renderMarkdown,
  extractHeadings,
  injectHeadingIds,
  buildTOC,
  showListSkeleton,
  showPostSkeleton,
};
