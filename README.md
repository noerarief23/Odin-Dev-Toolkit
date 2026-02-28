# Odin Dev Toolkit

**Developer Utility Suite** — 13 essential tools, 100% client-side, offline-ready PWA.

![Theme: Deep Valhalla](https://img.shields.io/badge/theme-Deep%20Valhalla-020617?style=flat-square&labelColor=020617&color=eab308)
![Offline Ready](https://img.shields.io/badge/offline-ready-22c55e?style=flat-square)
![No Backend](https://img.shields.io/badge/backend-none-dc2626?style=flat-square)

---

## Tools

| # | Tool | Description |
|---|------|-------------|
| 1 | **Pomodoro Timer** | Focus timer with session planning (todo/actual), daily session log & Markdown export |
| 2 | **Regex Tester** | Real-time matching, color-coded groups, common patterns cheatsheet |
| 3 | **QR Code Engine** | Generate QR codes with size control, download as PNG |
| 4 | **JSON Formatter** | Beautify/Minify with instant validation & error line indicator |
| 5 | **XML Formatter** | Beautify/Minify with instant validation & line indicators |
| 6 | **Diff Checker** | Compare two JSON/XML payloads and highlight added/removed/changed lines |
| 7 | **Password Guard** | Secure generation with entropy meter (uses `crypto.getRandomValues`) |
| 8 | **Model Generator** | JSON → C#, Go, Python & PHP classes/structs/dataclasses |
| 9 | **JWT Explorer** | Local-only JWT decoder with color-coded Header, Payload & Signature panels |
| 10 | **Image Shrink** | Resize & compress images via Canvas API, export as WebP or PNG — no uploads |
| 11 | **Case Converter** | Transform text to UPPERCASE, lowercase, camelCase, PascalCase, snake_case, kebab-case & Title Case |
| 12 | **Flex/Grid Lab** | Interactive visual playground for CSS Flexbox & Grid with live preview & code generation |
| 13 | **Base64 Codec** | Encode/decode text & files to Base64 with MIME type detection |

## Tech Stack

- **HTML5** + **Tailwind CSS** (Play CDN)
- **Alpine.js** for reactive state management
- **Prism.js** for syntax highlighting (JSON, XML/Markup, C#, Go, Python, PHP)
- **Lucide Icons**
- **QRCode Generator** (qrcode-generator)
- **Web Audio API** for Pomodoro timer sounds
- **Canvas API** for client-side image processing

## Quick Start

```bash
# Clone & open
git clone https://github.com/noerarief23/Odin-Dev-Toolkit.git
cd Odin-Dev-Toolkit

# Serve locally (any static server works)
npx serve .
# or
python -m http.server 8000
```

Then open `http://localhost:8000` (or simply open `index.html` directly).

**Live Demo:** [noerarief23.github.io/Odin-Dev-Toolkit](https://noerarief23.github.io/Odin-Dev-Toolkit/)

## Features

- **Pomodoro Session Log** — Plan tasks before each focus session, record actuals after completion, download daily log as Markdown
- **Sticky Input** — All inputs persist in `sessionStorage` across refreshes
- **Keyboard Shortcuts** — `Ctrl+1` through `Ctrl+8` to switch tools (first 8 tools)
- **PWA Installable** — Add to home screen, works offline via Service Worker
- **100% Client-Side** — No data ever leaves your browser, all processing is local
- **"Deep Valhalla" Theme** — Dark Slate-950 with Gold-500 and Crimson-600 accents, glassmorphism effects
- **Browser Notifications** — Get alerted when Pomodoro timer ends, even in another tab
- **Drag & Drop** — Drop images directly into Image Shrink
- **Color-Coded JWT** — Header (gold), Payload (emerald), Signature (sky) panels with Prism JSON highlighting

## Project Structure

```
├── index.html              # Main app shell with all 13 tool panels
├── manifest.json           # PWA manifest
├── sw.js                   # Service worker (cache-first)
├── _test.js                # Unit tests (node _test.js)
├── css/
│   └── valhalla.css        # Deep Valhalla theme & component styles
├── js/
│   └── odin.js             # Core logic (Odin.JWT, Odin.ImageShrink, Odin.CaseConverter, etc.)
├── vendor/                 # All dependencies bundled locally
│   ├── alpine.min.js
│   ├── tailwindcss.js
│   ├── prism.js + prism.css + language modules
│   ├── qrcode.min.js
│   └── lucide.min.js
└── icons/
    └── icon-odin.png
```

## License

MIT