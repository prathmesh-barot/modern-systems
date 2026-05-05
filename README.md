# new-wave: Modern Systems Programming Portal

new-wave is a premium, editorial-style knowledge base for the "new wave" of systems languages like Odin and Zig. It's built for speed, clean typography, and a great reading experience.

## Requirements

**REQUREMENTS:** Bun.js installed on your machine.

---

## Installation from Source

Kindly follow below steps to get the portal running locally.

### Step 1: Clone and Install Deps

Open your terminal and run:

```bash
git clone https://github.com/prathmesh-barot/new-wave.git
cd new-wave
bun install
```

### Step 2: Run the Server

You can run the portal in production mode or development mode.

To run production:

```bash
bun run server.ts
```

To run with auto-watch (Hot Reloading for content):

```bash
bun run dev
```

### Step 3: Access the Portal

Open your browser and navigate to:

```text
http://localhost:3000
```

---

## How it Works

The site is intentionally lightweight and uses no heavy frameworks.

### Content Management

All articles, docs, and tutorials live in the `content/` folder as Markdown files with YAML frontmatter. To add new content, just drop a `.md` file in the right folder.

The server will handle caching and SEO injection automatically.

### UI & UX

* **Typography** — Uses Literata for body and Space Grotesk for UI.
* **Syntax Highlighting** — Powered by Highlight.js with a custom Ayu Dark theme for Odin and Zig.
* **Local Search** — Uses Fuse.js for fast, offline-ready fuzzy searching.

---

## Cmds References

Standard commands for managing the portal.

### bun run dev

Starts the server and watchs for any changes in the `content/` or `public/` directories.

### git add .

Stage your new articles or code changes before committing.

---

## Project Tree

* [server.ts](server.ts) — The Bun server and dynamic SEO engine.
* [public/js/main.js](public/js/main.js) — Core UI logic and theme management.
* [public/js/content.js](public/js/content.js) — Markdown rendering and syntax config.
* [public/css/style.css](public/css/style.css) — Premium editorial styles.
* [content/](content/) — All markdown source files.
* [package.json](package.json) — Local dependencies list.

## License

new-wave is released under the **Apache 2.0 License**.
