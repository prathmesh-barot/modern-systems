import { serve } from "bun";
import { readdir, readFile, watch } from "fs/promises";
import path from "path";

const PUBLIC_DIR = path.join(import.meta.dir, "public");
const CONTENT_DIR = path.join(import.meta.dir, "content");

// Basic in-memory cache
let contentCache = new Map<string, any>();

interface Frontmatter {
  title?: string;
  date?: string;
  description?: string;
  tags?: string;
  author?: string;
  readTime?: string;
  difficulty?: string;
  duration?: string;
  order?: string;
  [key: string]: string | undefined;
}

function parseFrontmatter(raw: string): {
  frontmatter: Frontmatter;
  body: string;
} {
  const fm: Frontmatter = {};
  let body = raw;
  if (raw.startsWith("---")) {
    const end = raw.indexOf("---", 3);
    if (end !== -1) {
      const block = raw.slice(3, end).trim();
      body = raw.slice(end + 3).trim();
      for (const line of block.split("\n")) {
        const colon = line.indexOf(":");
        if (colon === -1) continue;
        const key = line.slice(0, colon).trim();
        const val = line
          .slice(colon + 1)
          .trim()
          .replace(/^["']|["']$/g, "");
        if (key) fm[key] = val;
      }
    }
  }
  return { frontmatter: fm, body };
}

async function listContent(type: string) {
  const cacheKey = `list_${type}`;
  if (contentCache.has(cacheKey)) return contentCache.get(cacheKey);

  const dir = path.join(CONTENT_DIR, type);
  try {
    const files = (await readdir(dir)).filter(
      (f) => f.endsWith(".md") && !f.startsWith("_"),
    );
    const items = await Promise.all(
      files.map(async (file) => {
        const slug = file.replace(".md", "");
        const raw = await readFile(path.join(dir, file), "utf-8");
        const { frontmatter } = parseFrontmatter(raw);
        return {
          slug,
          title: frontmatter.title || slug.replace(/-/g, " "),
          date: frontmatter.date || "",
          description: frontmatter.description || "",
          tags: frontmatter.tags || "",
          author: frontmatter.author || "Odin Team",
          readTime: frontmatter.readTime || "5 min read",
          difficulty: frontmatter.difficulty || "",
          duration: frontmatter.duration || "",
          order: parseInt(frontmatter.order || "99"),
        };
      }),
    );
    const sorted = items.sort((a, b) =>
      type === "docs" ? a.order - b.order : b.date.localeCompare(a.date),
    );
    contentCache.set(cacheKey, sorted);
    return sorted;
  } catch {
    return [];
  }
}

// Clear cache on file changes (Hot Reloading for Content)
import { watch as fsWatch } from "fs";
fsWatch(CONTENT_DIR, { recursive: true }, () => {
  console.log("Content changed. Clearing cache...");
  contentCache.clear();
});

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css",
  ".js": "application/javascript",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
};

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Cache-Control": "no-cache",
};

serve({
  port: 3000,
  async fetch(req) {
    const url = new URL(req.url);
    let { pathname } = url;

    // ── API Routes ──────────────────────────────────────────────────────────
    if (pathname.startsWith("/api/")) {
      const parts = pathname.slice(5).split("/").filter(Boolean);

      if (parts[0] === "content" && parts.length === 2) {
        return Response.json(await listContent(parts[1]), { headers: CORS });
      }

      if (parts[0] === "content" && parts.length === 3) {
        const cacheKey = `post_${parts[1]}_${parts[2]}`;
        if (contentCache.has(cacheKey))
          return Response.json(contentCache.get(cacheKey), { headers: CORS });

        const filePath = path.join(CONTENT_DIR, parts[1], `${parts[2]}.md`);
        try {
          const raw = await readFile(filePath, "utf-8");
          const data = parseFrontmatter(raw);
          contentCache.set(cacheKey, data);
          return Response.json(data, { headers: CORS });
        } catch {
          return Response.json(
            { error: "Not found" },
            { status: 404, headers: CORS },
          );
        }
      }

      if (parts[0] === "nav" && parts.length === 2) {
        const navPath = path.join(CONTENT_DIR, parts[1], "_nav.json");
        try {
          const raw = await readFile(navPath, "utf-8");
          return new Response(raw, {
            headers: { ...CORS, "Content-Type": "application/json" },
          });
        } catch {
          return Response.json([], { headers: CORS });
        }
      }
      return Response.json({ error: "Not found" }, { status: 404 });
    }

    // ── Serve Local NPM Packages (Vendor) ───────────────────────────────────
    if (pathname.startsWith("/vendor/")) {
      const vendorPath = pathname.replace("/vendor/", "");

      // Security: Prevent directory traversal (e.g., ../../etc/passwd)
      if (vendorPath.includes("..")) {
        return new Response("Forbidden", { status: 403 });
      }

      const filePath = path.join(import.meta.dir, "node_modules", vendorPath);
      const file = Bun.file(filePath);

      if (await file.exists()) {
        const ext = path.extname(filePath);
        return new Response(file, {
          headers: {
            "Content-Type": MIME[ext] || "application/octet-stream",
            "Cache-Control": "public, max-age=31536000", // Cache locally forever
          },
        });
      }
      return new Response("Not Found", { status: 404 });
    }

    // ── Static Files & SEO Injection ────────────────────────────────────────
    if (pathname === "/") pathname = "/index.html";
    const filePath = path.join(PUBLIC_DIR, pathname);
    const file = Bun.file(filePath);

    if (!(await file.exists())) {
      const nf = Bun.file(path.join(PUBLIC_DIR, "404.html"));
      return new Response((await nf.exists()) ? nf : "404 Not Found", {
        status: 404,
        headers: { "Content-Type": "text/html" },
      });
    }

    // Dynamic SEO Injection for post.html
    if (pathname === "/post.html") {
      let html = await file.text();
      const type = url.searchParams.get("type");
      const slug = url.searchParams.get("slug");

      if (type && slug) {
        try {
          const raw = await readFile(
            path.join(CONTENT_DIR, type, `${slug}.md`),
            "utf-8",
          );
          const { frontmatter } = parseFrontmatter(raw);
          const title = frontmatter.title || "New Wave";
          const desc = frontmatter.description || "Odin programming resource.";

          // Inject OpenGraph tags
          const metaTags = `
            <title>${title} — New Wave</title>
            <meta name="description" content="${desc}" />
            <meta property="og:title" content="${title}" />
            <meta property="og:description" content="${desc}" />
            <meta property="og:type" content="article" />
            <meta name="twitter:card" content="summary_large_image" />
          `;
          html = html.replace("<!-- SEO_PLACEHOLDER -->", metaTags);
        } catch (e) {
          // Fallback silently if markdown not found
        }
      }
      return new Response(html, {
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    const ext = path.extname(filePath);
    return new Response(file, {
      headers: { "Content-Type": MIME[ext] || "application/octet-stream" },
    });
  },
});

console.log("✦ New Wave running  →  http://localhost:3000");
