Requirements:





Blogging + docs + tutorial website



Plain HTML + CSS + JS (vanilla, no heavy frameworks)



Fonts: Literata (body/headings), Maple Mono (code), Space Grotesk (links/buttons/labels/inputs)



Modern, minimal, beautiful, good animations



Black, white, grey color palette



Premium feel



Markdown parsing system (manually add .md files to a folder)



4-6 pages



Bun.js (not Node.js)



Lightweight (max 30-40MB)



Fully responsive



Can use latest Tailwind CSS if needed



Tech Stack:





Bun.js as server



Vanilla HTML/CSS/JS



marked.js for markdown parsing (CDN, lightweight)



Google Fonts for Literata, Space Grotesk (Maple Mono might need to be fetched from Google Fonts or a CDN)



learn-odin/

├── public/

│   ├── index.html

│   ├── blog.html

│   ├── blog-post.html

│   ├── docs.html

│   ├── tutorials.html

│   ├── css/

│   │   └── style.css

│   ├── js/

│   │   └── main.js

│   └── assets/

├── content/

│   ├── blog/

│   │   ├── getting-started.md

│   │   └── ...

│   ├── docs/

│   │   └── ...

│   └── tutorials/

│       └── ...

├── server.ts (or server.js)

├── package.json

└── bun.lockb





The design direction:





Tone: Editorial luxury — think a premium technical publication. Black ink on white paper meets digital screen. Beautifully typeset, generous whitespace, subtle structural grid lines.



Differentiator: The typography-first approach with Literata (a beautiful editorial serif) for content creates a "reading experience" that feels premium, like a well-designed programming book.



Animations: Subtle ink-like reveals, smooth transitions, no flashy effects.



Let me write all the files now. I'll start creating them.

Color palette: Dark (default):





--bg: #0a0a0a



--surface: #111111



--surface-2: #1a1a1a



--border: #222222



--border-strong: #333333



--text: #f0f0f0



--text-2: #999999



--text-3: #555555

Light:





--bg: #fafafa



--surface: #ffffff



--surface-2: #f0f0f0



--border: #e0e0e0



--border-strong: #cccccc



--text: #0a0a0a



--text-2: #666666



--text-3: #999999





