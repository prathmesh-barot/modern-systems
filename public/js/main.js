/* ─────────────────────────────────────────────────────────────────────────────
   Learn Odin  ·  main.js  —  Navigation, theme, shared utilities
───────────────────────────────────────────────────────────────────────────── */

// ── Theme ────────────────────────────────────────────────────────────────────
const THEME_KEY = "lo-theme";
const html = document.documentElement;

function applyTheme(t) {
  html.setAttribute("data-theme", t);
  document.querySelectorAll(".nav__theme").forEach((btn) => {
    btn.innerHTML = t === "dark" ? iconMoon() : iconSun();
    btn.title = t === "dark" ? "Switch to light mode" : "Switch to dark mode";
  });
}

function toggleTheme() {
  const current = html.getAttribute("data-theme") || "dark";
  const next = current === "dark" ? "light" : "dark";
  localStorage.setItem(THEME_KEY, next);
  applyTheme(next);
}

function initTheme() {
  const saved = localStorage.getItem(THEME_KEY);
  const system = window.matchMedia("(prefers-color-scheme: light)").matches
    ? "light"
    : "dark";
  applyTheme(saved || system);
}

// ── SVG icons ────────────────────────────────────────────────────────────────
function iconMoon() {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`;
}
function iconSun() {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>`;
}
function iconSearch() {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`;
}
function iconArrow() {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="13" height="13"><path d="M7 17L17 7M7 7h10v10"/></svg>`;
}
function iconBack() {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>`;
}

// ── Navigation ───────────────────────────────────────────────────────────────
function initNav() {
  const page = location.pathname.split("/").pop() || "index.html";

  // Active links
  document.querySelectorAll(".nav__links a, .nav__mobile a").forEach((a) => {
    const href = a.getAttribute("href");
    if (
      href === page ||
      (page === "index.html" && href === "./") ||
      (page === "" && href === "./")
    ) {
      a.classList.add("active");
    }
  });

  // Theme buttons
  document.querySelectorAll(".nav__theme").forEach((btn) => {
    btn.addEventListener("click", toggleTheme);
  });

  // Burger
  const burger = document.querySelector(".nav__burger");
  const mobileMenu = document.querySelector(".nav__mobile");
  if (burger && mobileMenu) {
    burger.addEventListener("click", () => {
      const open = burger.classList.toggle("open");
      mobileMenu.classList.toggle("open", open);
      document.body.style.overflow = open ? "hidden" : "";
    });
    // Close on outside click
    document.addEventListener("click", (e) => {
      if (!burger.contains(e.target) && !mobileMenu.contains(e.target)) {
        burger.classList.remove("open");
        mobileMenu.classList.remove("open");
        document.body.style.overflow = "";
      }
    });
    // Close on link click
    mobileMenu.querySelectorAll("a").forEach((a) => {
      a.addEventListener("click", () => {
        burger.classList.remove("open");
        mobileMenu.classList.remove("open");
        document.body.style.overflow = "";
      });
    });
  }
}

// ── Scroll: hide nav on down, show on up ────────────────────────────────────
function initScrollNav() {
  const nav = document.querySelector(".nav");
  if (!nav) return;
  let last = 0;
  window.addEventListener(
    "scroll",
    () => {
      const y = window.scrollY;
      if (y > last && y > 80) {
        nav.style.transform = "translateY(-100%)";
      } else {
        nav.style.transform = "";
      }
      last = y;
    },
    { passive: true },
  );
  nav.style.transition =
    "transform 300ms cubic-bezier(0.16,1,0.3,1), background 240ms ease, border-color 240ms ease";
}

// ── Copy-to-clipboard for code blocks ───────────────────────────────────────
function initCodeCopy() {
  document.querySelectorAll("pre").forEach((pre) => {
    const wrap = document.createElement("div");
    wrap.className = "code-block";
    pre.parentNode.insertBefore(wrap, pre);
    wrap.appendChild(pre);

    const btn = document.createElement("button");
    btn.className = "code-block__copy";
    btn.textContent = "Copy";
    btn.addEventListener("click", () => {
      const text = pre.querySelector("code")?.innerText || pre.innerText;
      navigator.clipboard.writeText(text).then(() => {
        btn.textContent = "Copied!";
        setTimeout(() => (btn.textContent = "Copy"), 2000);
      });
    });
    wrap.appendChild(btn);
  });
}

// ── Format date ──────────────────────────────────────────────────────────────
function formatDate(d) {
  if (!d) return "";
  return new Date(d).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

// ── Slugify ──────────────────────────────────────────────────────────────────
function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

// ── Debounce ─────────────────────────────────────────────────────────────────
function debounce(fn, ms) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

// ── Export globals ───────────────────────────────────────────────────────────
window.LO = {
  formatDate,
  slugify,
  debounce,
  iconArrow,
  iconBack,
  iconSearch,
  initCodeCopy,
};

// ── Init ─────────────────────────────────────────────────────────────────────
initTheme();
document.addEventListener("DOMContentLoaded", () => {
  initNav();
  // initScrollNav();
});
