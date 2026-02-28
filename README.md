# Odin Dev Toolkit

**Developer Utility Suite** — 5 essential tools, 100% client-side, offline-ready PWA.

![Theme: Deep Valhalla](https://img.shields.io/badge/theme-Deep%20Valhalla-020617?style=flat-square&labelColor=020617&color=eab308)
![Offline Ready](https://img.shields.io/badge/offline-ready-22c55e?style=flat-square)
![No Backend](https://img.shields.io/badge/backend-none-dc2626?style=flat-square)

---

## Tools

| # | Tool | Description |
|---|------|-------------|
| 1 | **Regex Tester** | Real-time matching, color-coded groups, common patterns cheatsheet |
| 2 | **QR Code Engine** | Generate QR codes with size control, download as PNG |
| 3 | **JSON Formatter** | Beautify/Minify with instant validation & error line indicator |
| 4 | **XML Formatter** | Beautify/Minify with instant validation & line indicators |
| 5 | **Password Guard** | Secure generation with entropy meter (uses `crypto.getRandomValues`) |
| 6 | **Model Generator** | JSON → C# classes, Go structs, Python dataclasses |

## Tech Stack

- **HTML5** + **Tailwind CSS** (Play CDN)
- **Alpine.js** for reactive state management
- **Prism.js** for syntax highlighting (JSON, XML/Markup, C#, Go, Python)
- **Lucide Icons**
- **QRCode Generator** (qrcode-generator)

## Quick Start

```bash
# Clone & open
git clone https://github.com/YOUR_USERNAME/Odin-Dev-Toolkit.git
cd Odin-Dev-Toolkit

# Serve locally (any static server works)
npx serve .
# or
python -m http.server 8000
```

Then open `http://localhost:8000` (or simply open `index.html` directly).

## Features

- **Sticky Input** — All inputs persist in `sessionStorage` across refreshes
- **Keyboard Shortcuts** — `Ctrl+1` through `Ctrl+5` to switch tools
- **PWA Installable** — Add to home screen, works offline via Service Worker
- **100% Client-Side** — No data ever leaves your browser
- **"Deep Valhalla" Theme** — Dark Slate-950 with Gold-500 and Crimson-600 accents, glassmorphism effects

## Project Structure

```
├── index.html              # Main app shell with all 5 tool panels
├── manifest.json           # PWA manifest
├── sw.js                   # Service worker (cache-first)
├── css/
│   └── valhalla.css        # Deep Valhalla theme & component styles
├── js/
│   └── odin.js             # Core logic (Odin.Regex, Odin.QRCode, etc.)
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