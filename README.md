# Odin Dev Toolkit

**Developer Utility Suite** — 8 essential tools, 100% client-side, offline-ready PWA.

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

## Tech Stack

- **HTML5** + **Tailwind CSS** (Play CDN)
- **Alpine.js** for reactive state management
- **Prism.js** for syntax highlighting (JSON, XML/Markup, C#, Go, Python, PHP)
- **Lucide Icons**
- **QRCode Generator** (qrcode-generator)
- **Web Audio API** for Pomodoro timer sounds

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
- **Keyboard Shortcuts** — `Ctrl+1` through `Ctrl+8` to switch tools
- **PWA Installable** — Add to home screen, works offline via Service Worker
- **100% Client-Side** — No data ever leaves your browser
- **"Deep Valhalla" Theme** — Dark Slate-950 with Gold-500 and Crimson-600 accents, glassmorphism effects
- **Browser Notifications** — Get alerted when Pomodoro timer ends, even in another tab

## Project Structure

```
├── index.html              # Main app shell with all 8 tool panels
├── manifest.json           # PWA manifest
├── sw.js                   # Service worker (cache-first)
├── css/
│   └── valhalla.css        # Deep Valhalla theme & component styles
├── js/
│   └── odin.js             # Core logic (Odin.Pomodoro, Odin.Regex, Odin.QRCode, etc.)
├── vendor/                 # All dependencies bundled locally
│   ├── alpine.min.js
│   ├── tailwindcss.js
│   ├── prism.js + prism.css + language modules
│   ├── qrcode.min.js
│   └── lucide.min.js
└── icons/
    ├── icon-192.svg
    └── icon-512.svg
```

## License

MIT