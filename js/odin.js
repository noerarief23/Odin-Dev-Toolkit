/* ================================================================
   Odin Dev Toolkit — Core Logic
   All 5 tools: Regex, QR Code, JSON Formatter, Password Guard,
   Multi-Language Model Generator
   ================================================================ */

// ---- Namespace ----
const Odin = {};

/* ================================================================
   Odin.Storage — SessionStorage persistence for "Sticky Input"
   ================================================================ */
Odin.Storage = {
  _prefix: 'odin_',

  get(key, fallback = '') {
    try {
      const val = sessionStorage.getItem(this._prefix + key);
      return val !== null ? JSON.parse(val) : fallback;
    } catch {
      return fallback;
    }
  },

  set(key, value) {
    try {
      sessionStorage.setItem(this._prefix + key, JSON.stringify(value));
    } catch { /* quota exceeded — silently ignore */ }
  },

  remove(key) {
    sessionStorage.removeItem(this._prefix + key);
  }
};

/* ================================================================
   Odin.Toast — Notification helper
   ================================================================ */
Odin.Toast = {
  _timeout: null,

  show(app, message = 'Copied!', duration = 2000) {
    app.toast.message = message;
    app.toast.visible = true;
    clearTimeout(this._timeout);
    this._timeout = setTimeout(() => {
      app.toast.visible = false;
    }, duration);
  }
};

/* ================================================================
   Odin.Clipboard — Copy helper
   ================================================================ */
Odin.Clipboard = {
  async copy(text, app) {
    try {
      await navigator.clipboard.writeText(text);
      Odin.Toast.show(app, 'Copied to clipboard!');
    } catch {
      // Fallback
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.cssText = 'position:fixed;left:-9999px';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      Odin.Toast.show(app, 'Copied to clipboard!');
    }
  }
};

/* ================================================================
   Odin.Utils — Shared utility helpers
   ================================================================ */
Odin.Utils = {
  escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
};

/* ================================================================
   Odin.Regex — Real-time regex tester
   ================================================================ */
Odin.Regex = {
  commonPatterns: [
    { name: 'Email', pattern: '[a-zA-Z0-9._%+\\-]+@[a-zA-Z0-9.\\-]+\\.[a-zA-Z]{2,}', flags: 'gi', description: 'Matches email addresses' },
    { name: 'URL', pattern: 'https?:\\/\\/[\\w\\-._~:/?#\\[\\]@!$&\'()*+,;=%]+', flags: 'gi', description: 'Matches HTTP/HTTPS URLs' },
    { name: 'IPv4 Address', pattern: '\\b(?:(?:25[0-5]|2[0-4]\\d|[01]?\\d\\d?)\\.){3}(?:25[0-5]|2[0-4]\\d|[01]?\\d\\d?)\\b', flags: 'g', description: 'Matches IPv4 addresses' },
    { name: 'Phone (US)', pattern: '(?:\\+?1[\\s.-]?)?\\(?\\d{3}\\)?[\\s.-]?\\d{3}[\\s.-]?\\d{4}', flags: 'g', description: 'Matches US phone numbers' },
    { name: 'Date (YYYY-MM-DD)', pattern: '\\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\\d|3[01])', flags: 'g', description: 'Matches ISO date format' },
    { name: 'Hex Color', pattern: '#(?:[0-9a-fA-F]{3}){1,2}\\b', flags: 'gi', description: 'Matches hex color codes' },
    { name: 'HTML Tag', pattern: '<\\/?[a-zA-Z][\\s\\S]*?>', flags: 'g', description: 'Matches HTML tags' },
    { name: 'Integer', pattern: '-?\\d+', flags: 'g', description: 'Matches integers' },
    { name: 'Floating Point', pattern: '-?\\d+\\.\\d+', flags: 'g', description: 'Matches floating point numbers' },
    { name: 'UUID', pattern: '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}', flags: 'gi', description: 'Matches UUIDs' },
  ],

  groupColors: ['match-group-0', 'match-group-1', 'match-group-2', 'match-group-3', 'match-group-4', 'match-group-5'],

  /** Maximum execution time for regex matching (ms) */
  TIMEOUT_MS: 3000,

  test(pattern, flags, testString) {
    if (!pattern || !testString) {
      return { html: Odin.Utils.escapeHtml(testString || ''), matches: [], error: null, matchCount: 0 };
    }

    let regex;
    try {
      // Ensure 'g' flag for matchAll
      const flagSet = new Set(flags.split(''));
      flagSet.add('g');
      regex = new RegExp(pattern, [...flagSet].join(''));
    } catch (e) {
      return { html: Odin.Utils.escapeHtml(testString), matches: [], error: e.message, matchCount: 0 };
    }

    const matches = [];
    const allMatches = [];

    try {
      const startTime = Date.now();
      for (const m of testString.matchAll(regex)) {
        // ReDoS protection: abort if execution exceeds timeout
        if (Date.now() - startTime > this.TIMEOUT_MS) {
          return {
            html: Odin.Utils.escapeHtml(testString),
            matches: matches,
            error: `Regex execution timed out after ${this.TIMEOUT_MS / 1000}s (possible ReDoS). Simplify your pattern.`,
            matchCount: allMatches.length
          };
        }
        allMatches.push(m);
        matches.push({
          fullMatch: m[0],
          index: m.index,
          groups: m.slice(1),
          namedGroups: m.groups || {}
        });
      }
    } catch (e) {
      return { html: Odin.Utils.escapeHtml(testString), matches: [], error: e.message, matchCount: 0 };
    }

    // Build highlighted HTML
    const html = this._buildHighlightedHtml(testString, allMatches);

    return { html, matches, error: null, matchCount: allMatches.length };
  },

  /**
   * Async version: runs regex in a Web Worker with hard timeout.
   * Falls back to sync test() if Workers are unavailable.
   */
  testAsync(pattern, flags, testString, timeoutMs) {
    const timeout = timeoutMs || this.TIMEOUT_MS;

    if (typeof Worker === 'undefined') {
      return Promise.resolve(this.test(pattern, flags, testString));
    }

    return new Promise((resolve) => {
      const workerCode = `
        self.onmessage = function(e) {
          const { pattern, flags, testString } = e.data;
          try {
            const flagSet = new Set(flags.split(''));
            flagSet.add('g');
            const regex = new RegExp(pattern, [...flagSet].join(''));
            const matches = [];
            for (const m of testString.matchAll(regex)) {
              matches.push({ fullMatch: m[0], index: m.index, groups: [...m].slice(1), namedGroups: m.groups || {} });
            }
            self.postMessage({ ok: true, matches });
          } catch (err) {
            self.postMessage({ ok: false, error: err.message });
          }
        };
      `;

      let worker;
      try {
        const blob = new Blob([workerCode], { type: 'application/javascript' });
        worker = new Worker(URL.createObjectURL(blob));
      } catch (_) {
        resolve(this.test(pattern, flags, testString));
        return;
      }

      const timer = setTimeout(() => {
        worker.terminate();
        resolve({
          html: Odin.Utils.escapeHtml(testString),
          matches: [],
          error: `Regex execution timed out after ${timeout / 1000}s (possible ReDoS). Simplify your pattern.`,
          matchCount: 0
        });
      }, timeout);

      worker.onmessage = (e) => {
        clearTimeout(timer);
        worker.terminate();
        const data = e.data;

        if (!data.ok) {
          resolve({ html: Odin.Utils.escapeHtml(testString), matches: [], error: data.error, matchCount: 0 });
          return;
        }

        // Rebuild highlighted HTML in main thread
        const fakeMatches = data.matches.map(m => {
          const arr = [m.fullMatch, ...m.groups];
          arr.index = m.index;
          arr.groups = m.namedGroups;
          return arr;
        });
        const html = this._buildHighlightedHtml(testString, fakeMatches);
        resolve({ html, matches: data.matches, error: null, matchCount: data.matches.length });
      };

      worker.onerror = () => {
        clearTimeout(timer);
        worker.terminate();
        resolve(this.test(pattern, flags, testString));
      };

      worker.postMessage({ pattern, flags, testString });
    });
  },

  _buildHighlightedHtml(text, matches) {
    if (!matches.length) return Odin.Utils.escapeHtml(text);

    let result = '';
    let lastIndex = 0;

    for (const m of matches) {
      // Text before match
      if (m.index > lastIndex) {
        result += Odin.Utils.escapeHtml(text.slice(lastIndex, m.index));
      }

      // Full match with highlight
      result += `<span class="match-highlight match-group-0">${Odin.Utils.escapeHtml(m[0])}</span>`;
      lastIndex = m.index + m[0].length;
    }

    // Remaining text
    if (lastIndex < text.length) {
      result += Odin.Utils.escapeHtml(text.slice(lastIndex));
    }

    return result;
  }
};

/* ================================================================
   Odin.QRCode — QR Code engine
   ================================================================ */
Odin.QRCode = {
  _instance: null,
  _container: null,

  generate(text, size, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    this._container = container;
    container.innerHTML = '';

    if (!text || !text.trim()) return;

    try {
      // qrcode-generator library
      const typeNumber = 0; // auto
      const errorCorrectionLevel = 'M';
      const qr = qrcode(typeNumber, errorCorrectionLevel);
      qr.addData(text);
      qr.make();

      // Create canvas
      const moduleCount = qr.getModuleCount();
      const cellSize = Math.max(1, Math.floor(size / moduleCount));
      const actualSize = cellSize * moduleCount;

      const canvas = document.createElement('canvas');
      canvas.width = actualSize;
      canvas.height = actualSize;
      canvas.style.width = size + 'px';
      canvas.style.height = size + 'px';
      canvas.style.imageRendering = 'pixelated';

      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, actualSize, actualSize);
      ctx.fillStyle = '#000000';

      for (let row = 0; row < moduleCount; row++) {
        for (let col = 0; col < moduleCount; col++) {
          if (qr.isDark(row, col)) {
            ctx.fillRect(col * cellSize, row * cellSize, cellSize, cellSize);
          }
        }
      }

      container.appendChild(canvas);
      this._instance = canvas;
    } catch (e) {
      container.innerHTML = `<span class="text-red-400 text-sm">Error: ${e.message}</span>`;
    }
  },

  downloadPng(filename = 'odin-qrcode.png') {
    if (!this._instance) return;
    const canvas = this._instance;
    const link = document.createElement('a');
    link.download = filename;
    link.href = canvas.toDataURL('image/png');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};

/* ================================================================
   Odin.JsonFormatter — JSON Beautify/Minify/Validate
   ================================================================ */
Odin.JsonFormatter = {
  beautify(input) {
    try {
      const obj = JSON.parse(input);
      return { result: JSON.stringify(obj, null, 2), error: null };
    } catch (e) {
      return { result: null, error: this._parseError(e, input) };
    }
  },

  minify(input) {
    try {
      const obj = JSON.parse(input);
      return { result: JSON.stringify(obj), error: null };
    } catch (e) {
      return { result: null, error: this._parseError(e, input) };
    }
  },

  validate(input) {
    if (!input || !input.trim()) {
      return { valid: null, error: null };
    }
    try {
      JSON.parse(input);
      return { valid: true, error: null };
    } catch (e) {
      return { valid: false, error: this._parseError(e, input) };
    }
  },

  highlight(code) {
    if (!code) return '';
    try {
      if (typeof Prism !== 'undefined' && Prism.languages && Prism.languages.json) {
        return Prism.highlight(code, Prism.languages.json, 'json');
      }
    } catch (e) {
      console.warn('Prism highlight failed:', e);
    }
    return Odin.Utils.escapeHtml(code);
  },

  _parseError(e, input) {
    const msg = e.message;
    // Try to extract position from error message
    const posMatch = msg.match(/position\s+(\d+)/i);
    let line = null;
    let col = null;

    if (posMatch) {
      const pos = parseInt(posMatch[1]);
      const upToPos = input.substring(0, pos);
      line = (upToPos.match(/\n/g) || []).length + 1;
      col = pos - upToPos.lastIndexOf('\n');
    }

    return { message: msg, line, col };
  }
};

/* ================================================================
   Odin.XmlFormatter — XML Beautify/Minify/Validate
   ================================================================ */
Odin.XmlFormatter = {
  beautify(input) {
    const validation = this.validate(input);
    if (!validation.valid) {
      return { result: null, error: validation.error };
    }
    try {
      return { result: this._formatXml(input, false), error: null };
    } catch (e) {
      return { result: null, error: { message: e.message, line: null, col: null } };
    }
  },

  minify(input) {
    const validation = this.validate(input);
    if (!validation.valid) {
      return { result: null, error: validation.error };
    }
    try {
      return { result: this._formatXml(input, true), error: null };
    } catch (e) {
      return { result: null, error: { message: e.message, line: null, col: null } };
    }
  },

  validate(input) {
    if (!input || !input.trim()) {
      return { valid: null, error: null };
    }

    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(input, 'application/xml');
    const parserError = xmlDoc.querySelector('parsererror');

    if (!parserError) {
      return { valid: true, error: null };
    }

    return { valid: false, error: this._parseError(parserError.textContent || 'Invalid XML') };
  },

  highlight(code) {
    if (!code) return '';
    try {
      if (typeof Prism !== 'undefined' && Prism.languages && Prism.languages.markup) {
        return Prism.highlight(code, Prism.languages.markup, 'markup');
      }
    } catch (e) {
      console.warn('XML Prism highlight failed:', e);
    }
    return Odin.Utils.escapeHtml(code);
  },

  _formatXml(input, minify = false) {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(input, 'application/xml');
    const serializer = new XMLSerializer();
    let xml = serializer.serializeToString(xmlDoc);

    xml = xml.replace(/>\s+</g, '><').trim();
    if (minify) return xml;

    const formatted = [];
    const nodes = xml.replace(/(>)(<)(\/?)/g, '$1\n$2$3').split('\n');
    let pad = 0;

    for (let node of nodes) {
      node = node.trim();
      if (!node) continue;

      if (/^<\/[^>]+>$/.test(node)) {
        pad = Math.max(0, pad - 1);
      }

      formatted.push(`${'  '.repeat(pad)}${node}`);

      if (/^<[^!?/][^>]*[^/]>$/.test(node)) {
        pad += 1;
      }
    }

    return formatted.join('\n');
  },

  _parseError(message) {
    const lineMatch = message.match(/line\s*(?:Number)?\s*:?\s*(\d+)/i);
    const colMatch = message.match(/column\s*(?:Number)?\s*:?\s*(\d+)/i);

    return {
      message: message.split('\n')[0] || 'Invalid XML',
      line: lineMatch ? parseInt(lineMatch[1], 10) : null,
      col: colMatch ? parseInt(colMatch[1], 10) : null
    };
  }
};

/* ================================================================
   Odin.DiffChecker — Compare JSON/XML differences
   ================================================================ */
Odin.DiffChecker = {
  compare(leftInput, rightInput, mode) {
    if (!leftInput.trim() || !rightInput.trim()) {
      return {
        equal: false,
        error: 'Both inputs are required',
        html: '',
        stats: { added: 0, removed: 0, changed: 0 }
      };
    }

    let leftNormalized;
    let rightNormalized;

    try {
      if (mode === 'json') {
        leftNormalized = this._normalizeJson(leftInput);
        rightNormalized = this._normalizeJson(rightInput);
      } else {
        leftNormalized = this._normalizeXml(leftInput);
        rightNormalized = this._normalizeXml(rightInput);
      }
    } catch (e) {
      return {
        equal: false,
        error: e.message,
        html: '',
        stats: { added: 0, removed: 0, changed: 0 }
      };
    }

    const equal = leftNormalized === rightNormalized;
    const diff = this._lineDiff(leftNormalized, rightNormalized);

    return {
      equal,
      error: null,
      html: this._renderDiff(diff),
      stats: diff.stats,
      leftNormalized,
      rightNormalized
    };
  },

  _normalizeJson(input) {
    const parsed = JSON.parse(input);
    const sorted = this._sortObject(parsed);
    return JSON.stringify(sorted, null, 2);
  },

  _sortObject(value) {
    if (Array.isArray(value)) {
      return value.map((item) => this._sortObject(item));
    }
    if (value && typeof value === 'object') {
      return Object.keys(value)
        .sort()
        .reduce((acc, key) => {
          acc[key] = this._sortObject(value[key]);
          return acc;
        }, {});
    }
    return value;
  },

  _normalizeXml(input) {
    const validation = Odin.XmlFormatter.validate(input);
    if (!validation.valid) {
      throw new Error(validation.error?.message || 'Invalid XML');
    }

    const minified = Odin.XmlFormatter.minify(input);
    if (minified.result === null) {
      throw new Error(minified.error?.message || 'Invalid XML');
    }

    const beautified = Odin.XmlFormatter.beautify(minified.result);
    if (beautified.result === null) {
      throw new Error(beautified.error?.message || 'Invalid XML');
    }

    return beautified.result;
  },

  _lineDiff(leftText, rightText) {
    const a = leftText.split('\n');
    const b = rightText.split('\n');

    // Myers diff algorithm (O(ND)) for optimal edit script
    const lcs = this._myers(a, b);
    const lines = [];
    const stats = { added: 0, removed: 0, changed: 0 };
    let lineNum = 0;

    let ai = 0;
    let bi = 0;
    let li = 0;

    while (ai < a.length || bi < b.length) {
      if (li < lcs.length && ai === lcs[li].ai && bi === lcs[li].bi) {
        // Common line
        lineNum++;
        lines.push({ type: 'same', left: a[ai], right: b[bi], line: lineNum });
        ai++;
        bi++;
        li++;
      } else if (ai < a.length && (li >= lcs.length || ai < lcs[li].ai) && (li >= lcs.length || bi >= lcs[li].bi || a[ai] !== b[bi])) {
        // Check if both sides changed (a removed and b added at same position)
        const nextLcsAi = li < lcs.length ? lcs[li].ai : a.length;
        const nextLcsBi = li < lcs.length ? lcs[li].bi : b.length;

        // Pair up removals and additions as "changed" lines
        if (ai < nextLcsAi && bi < nextLcsBi) {
          lineNum++;
          lines.push({ type: 'changed', left: a[ai], right: b[bi], line: lineNum });
          stats.changed++;
          ai++;
          bi++;
        } else if (ai < nextLcsAi) {
          lineNum++;
          lines.push({ type: 'removed', left: a[ai], right: '', line: lineNum });
          stats.removed++;
          ai++;
        } else {
          lineNum++;
          lines.push({ type: 'added', left: '', right: b[bi], line: lineNum });
          stats.added++;
          bi++;
        }
      } else if (bi < b.length) {
        lineNum++;
        lines.push({ type: 'added', left: '', right: b[bi], line: lineNum });
        stats.added++;
        bi++;
      } else {
        lineNum++;
        lines.push({ type: 'removed', left: a[ai], right: '', line: lineNum });
        stats.removed++;
        ai++;
      }
    }

    return { lines, stats };
  },

  /**
   * Myers diff — compute LCS indices using the O(ND) algorithm.
   * Returns array of { ai, bi } pairs indicating matching line indices.
   */
  _myers(a, b) {
    const N = a.length;
    const M = b.length;
    const MAX = N + M;

    if (MAX === 0) return [];

    // Optimisation: trivial cases
    if (N === 0 || M === 0) return [];

    const vSize = 2 * MAX + 1;
    const v = new Int32Array(vSize).fill(-1);
    const offset = MAX;
    v[offset + 1] = 0;

    // Store trace for backtracking
    const trace = [];

    outer:
    for (let d = 0; d <= MAX; d++) {
      trace.push(v.slice());

      for (let k = -d; k <= d; k += 2) {
        let x;
        if (k === -d || (k !== d && v[offset + k - 1] < v[offset + k + 1])) {
          x = v[offset + k + 1]; // move down
        } else {
          x = v[offset + k - 1] + 1; // move right
        }

        let y = x - k;

        // Follow diagonal (matches)
        while (x < N && y < M && a[x] === b[y]) {
          x++;
          y++;
        }

        v[offset + k] = x;

        if (x >= N && y >= M) break outer;
      }
    }

    // Backtrack to find the actual edit path
    const lcs = [];
    let x = N;
    let y = M;

    for (let d = trace.length - 1; d >= 0; d--) {
      const vPrev = trace[d];
      const k = x - y;

      let prevK;
      if (k === -d || (k !== d && vPrev[offset + k - 1] < vPrev[offset + k + 1])) {
        prevK = k + 1;
      } else {
        prevK = k - 1;
      }

      const prevX = vPrev[offset + prevK];
      const prevY = prevX - prevK;

      // Diagonal moves are matches
      while (x > prevX && y > prevY) {
        x--;
        y--;
        lcs.push({ ai: x, bi: y });
      }

      x = prevX;
      y = prevY;
    }

    lcs.reverse();
    return lcs;
  },

  _renderDiff(diff) {
    return diff.lines
      .map((row) => {
        const cls = `diff-row diff-${row.type}`;
        const left = Odin.Utils.escapeHtml(row.left ?? '');
        const right = Odin.Utils.escapeHtml(row.right ?? '');
        return `<div class="${cls}"><span class="diff-ln">${row.line}</span><span class="diff-left">${left}</span><span class="diff-right">${right}</span></div>`;
      })
      .join('');
  }
};

/* ================================================================
   Odin.PasswordGuard — Secure password generator with entropy
   ================================================================ */
Odin.PasswordGuard = {
  charsets: {
    lowercase: 'abcdefghijklmnopqrstuvwxyz',
    uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
    numbers: '0123456789',
    symbols: '!@#$%^&*()-_=+[]{}|;:\'",.<>?/~`'
  },

  generate(length, options) {
    let pool = '';
    const activeSets = [];
    if (options.lowercase) { pool += this.charsets.lowercase; activeSets.push(this.charsets.lowercase); }
    if (options.uppercase) { pool += this.charsets.uppercase; activeSets.push(this.charsets.uppercase); }
    if (options.numbers)   { pool += this.charsets.numbers;   activeSets.push(this.charsets.numbers); }
    if (options.symbols)   { pool += this.charsets.symbols;   activeSets.push(this.charsets.symbols); }

    if (!pool) { pool = this.charsets.lowercase; activeSets.push(this.charsets.lowercase); } // fallback

    let password = this._secureRandom(pool, length);

    // Guarantee at least one character from each active set (if length allows)
    if (activeSets.length > 1 && length >= activeSets.length) {
      let chars = password.split('');
      const usedPositions = new Set();

      for (const set of activeSets) {
        const hasChar = chars.some(c => set.includes(c));
        if (!hasChar) {
          // Pick a random position that hasn't been force-set yet
          let pos;
          do {
            pos = this._secureRandomIndex(chars.length);
          } while (usedPositions.has(pos));
          usedPositions.add(pos);
          chars[pos] = set[this._secureRandomIndex(set.length)];
        }
      }

      password = chars.join('');
    }

    const entropy = this.calcEntropy(length, pool.length);
    const strength = this.getStrength(entropy);

    return { password, entropy, strength, poolSize: pool.length };
  },

  /** Rejection sampling: unbiased random index for a given range */
  _secureRandomIndex(range) {
    const array = new Uint32Array(1);
    const limit = Math.floor(0x100000000 / range) * range; // largest multiple of range within Uint32
    let val;
    do {
      crypto.getRandomValues(array);
      val = array[0];
    } while (val >= limit); // reject biased values
    return val % range;
  },

  _secureRandom(pool, length) {
    const array = new Uint32Array(length);
    crypto.getRandomValues(array);
    let result = '';
    const limit = Math.floor(0x100000000 / pool.length) * pool.length;
    for (let i = 0; i < length; i++) {
      // Rejection sampling to eliminate modulo bias
      let val = array[i];
      while (val >= limit) {
        const extra = new Uint32Array(1);
        crypto.getRandomValues(extra);
        val = extra[0];
      }
      result += pool[val % pool.length];
    }
    return result;
  },

  calcEntropy(length, poolSize) {
    if (poolSize <= 1) return 0;
    return Math.round(length * Math.log2(poolSize) * 10) / 10;
  },

  getStrength(entropy) {
    if (entropy < 28) return { label: 'Weak', class: 'entropy-weak', color: 'text-red-400' };
    if (entropy < 36) return { label: 'Fair', class: 'entropy-fair', color: 'text-orange-400' };
    if (entropy < 60) return { label: 'Good', class: 'entropy-good', color: 'text-yellow-400' };
    if (entropy < 80) return { label: 'Strong', class: 'entropy-strong', color: 'text-green-400' };
    return { label: 'Fortress', class: 'entropy-fortress', color: 'text-emerald-400' };
  }
};

/* ================================================================
   Odin.ModelGen — Multi-Language Model Generator
   Recursive JSON → C# / Go / Python / PHP 8.1
   ================================================================ */
Odin.ModelGen = {

  /* ---- Name conversion utilities ---- */
  toPascalCase(str) {
    return str
      .replace(/[-_]+/g, ' ')
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .split(/\s+/)
      .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join('');
  },

  toCamelCase(str) {
    const pascal = this.toPascalCase(str);
    return pascal.charAt(0).toLowerCase() + pascal.slice(1);
  },

  toSnakeCase(str) {
    return str
      .replace(/[-\s]+/g, '_')
      .replace(/([a-z])([A-Z])/g, '$1_$2')
      .replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2')
      .toLowerCase();
  },

  toClassName(str) {
    const pascal = this.toPascalCase(str);
    // Ensure doesn't start with a number
    return /^\d/.test(pascal) ? 'Item' + pascal : pascal;
  },

  /* ---- Schema Parser ---- */
  parseSchema(key, value, classes = [], parentName = 'Root') {
    if (value === null || value === undefined) {
      return { type: 'nullable', isArray: false, className: null };
    }

    if (typeof value === 'string') {
      // Check for ISO date
      if (/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2})?/.test(value)) {
        return { type: 'datetime', isArray: false, className: null };
      }
      return { type: 'string', isArray: false, className: null };
    }

    if (typeof value === 'number') {
      return { type: Number.isInteger(value) ? 'int' : 'float', isArray: false, className: null };
    }

    if (typeof value === 'boolean') {
      return { type: 'bool', isArray: false, className: null };
    }

    if (Array.isArray(value)) {
      if (value.length === 0) {
        return { type: 'any', isArray: true, className: null };
      }

      const firstItem = value[0];
      if (firstItem !== null && typeof firstItem === 'object' && !Array.isArray(firstItem)) {
        // Array of objects — merge ALL elements' properties for complete schema
        const className = this.toClassName(key);
        const merged = this._mergeArrayObjects(value);
        this._parseObject(className, merged, classes);
        return { type: 'object', isArray: true, className };
      }

      // Array of primitives
      const itemSchema = this.parseSchema(key + 'Item', firstItem, classes, parentName);
      return { type: itemSchema.type, isArray: true, className: itemSchema.className };
    }

    if (typeof value === 'object') {
      const className = this.toClassName(key);
      this._parseObject(className, value, classes);
      return { type: 'object', isArray: false, className };
    }

    return { type: 'any', isArray: false, className: null };
  },

  _parseObject(className, obj, classes) {
    // Check if we already have this class
    if (classes.some(c => c.name === className)) return;

    const properties = [];

    for (const [key, value] of Object.entries(obj)) {
      const schema = this.parseSchema(key, value, classes, className);
      properties.push({
        originalKey: key,
        schema
      });
    }

    classes.push({ name: className, properties });
  },

  /**
   * Merge properties from all objects in an array into a single superset object.
   * This ensures the generated class captures all possible fields from heterogeneous arrays.
   * If the same key appears with different types, the first non-null type wins.
   */
  _mergeArrayObjects(arr) {
    const merged = {};
    for (const item of arr) {
      if (item === null || typeof item !== 'object' || Array.isArray(item)) continue;
      for (const [key, value] of Object.entries(item)) {
        if (!(key in merged) || merged[key] === null || merged[key] === undefined) {
          merged[key] = value;
        }
      }
    }
    return merged;
  },

  /* ---- Generate All Languages ---- */
  generateAll(jsonString, options = {}) {
    let parsed;
    try {
      parsed = JSON.parse(jsonString);
    } catch (e) {
      const errMsg = `// Error parsing JSON: ${e.message}`;
      return { csharp: errMsg, go: errMsg, python: errMsg, php: errMsg, error: e.message };
    }

    // Determine root structure
    const classes = [];
    if (Array.isArray(parsed)) {
      if (parsed.length > 0 && typeof parsed[0] === 'object') {
        // Merge all array elements for complete schema
        const merged = this._mergeArrayObjects(parsed);
        this._parseObject('Root', merged, classes);
      }
    } else if (typeof parsed === 'object' && parsed !== null) {
      this._parseObject('Root', parsed, classes);
    } else {
      const errMsg = '// Input must be a JSON object or array of objects';
      return { csharp: errMsg, go: errMsg, python: errMsg, php: errMsg, error: 'Not an object' };
    }

    return {
      csharp: this._genCSharp(classes, options),
      go: this._genGo(classes, options),
      python: this._genPython(classes, options),
      php: this._genPhp(classes, options),
      error: null
    };
  },

  /* ---- C# Generator ---- */
  _genCSharp(classes, options = {}) {
    const useJPN = options.csUseJsonPropertyName || false;
    const useNullable = options.csUseNullable || false;

    const typeMap = {
      string: 'string',
      int: 'int',
      float: 'double',
      bool: 'bool',
      datetime: 'DateTime',
      nullable: 'object?',
      any: 'object'
    };

    // Nullable reference type suffixes
    const nullableRefTypes = new Set(['string', 'object', 'DateTime']);

    const lines = [
      'using System;',
      'using System.Collections.Generic;',
    ];

    if (useJPN) {
      lines.push('using System.Text.Json.Serialization;');
    }

    if (useNullable) {
      lines.push('');
      lines.push('#nullable enable');
    }

    lines.push('');

    for (const cls of classes) {
      lines.push(`public class ${cls.name}`);
      lines.push('{');

      for (const prop of cls.properties) {
        const { schema, originalKey } = prop;
        const propName = this.toPascalCase(originalKey);
        let csType;

        if (schema.type === 'object' && schema.className) {
          csType = schema.className;
        } else {
          csType = typeMap[schema.type] || 'object';
        }

        if (schema.isArray) {
          csType = `List<${csType}>`;
        }

        // Add nullable suffix for reference types
        if (useNullable && !schema.isArray) {
          if (nullableRefTypes.has(csType) || (schema.type === 'object' && schema.className)) {
            csType += '?';
          }
          if (schema.type === 'nullable') {
            csType = 'object?';
          }
        }

        if (useNullable && schema.isArray) {
          csType += '?';
        }

        if (useJPN) {
          lines.push(`    [JsonPropertyName("${originalKey}")]`);
        }
        lines.push(`    public ${csType} ${propName} { get; set; }`);
        lines.push('');
      }

      lines.push('}');
      lines.push('');
    }

    return lines.join('\n').trim();
  },

  /* ---- Go Generator ---- */
  _genGo(classes, options = {}) {
    const useOmitEmpty = options.goUseOmitEmpty || false;
    const usePointers = options.goUsePointers || false;

    const typeMap = {
      string: 'string',
      int: 'int',
      float: 'float64',
      bool: 'bool',
      datetime: 'time.Time',
      nullable: 'interface{}',
      any: 'interface{}'
    };

    let needsTime = false;
    const lines = ['package models', ''];

    // Check if time import needed
    for (const cls of classes) {
      for (const prop of cls.properties) {
        if (prop.schema.type === 'datetime') needsTime = true;
      }
    }

    if (needsTime) {
      lines.push('import "time"');
      lines.push('');
    }

    for (const cls of classes) {
      lines.push(`type ${cls.name} struct {`);

      // Find longest field name for alignment
      const fields = cls.properties.map(prop => {
        const { schema, originalKey } = prop;
        const fieldName = this.toPascalCase(originalKey);
        let goType;

        if (schema.type === 'object' && schema.className) {
          goType = schema.className;
        } else {
          goType = typeMap[schema.type] || 'interface{}';
        }

        if (schema.isArray) {
          goType = `[]${goType}`;
        }

        if (usePointers && !schema.isArray && schema.type === 'nullable' && goType !== 'interface{}') {
          goType = `*${goType}`;
        }

        const jsonTag = useOmitEmpty ? `${originalKey},omitempty` : originalKey;
        return { fieldName, goType, jsonTag };
      });

      const maxNameLen = Math.max(...fields.map(f => f.fieldName.length));
      const maxTypeLen = Math.max(...fields.map(f => f.goType.length));

      for (const f of fields) {
        const name = f.fieldName.padEnd(maxNameLen);
        const type = f.goType.padEnd(maxTypeLen);
        lines.push(`\t${name} ${type} \`json:"${f.jsonTag}"\``);
      }

      lines.push('}');
      lines.push('');
    }

    return lines.join('\n').trim();
  },

  /* ---- Python Generator ---- */
  _genPython(classes, options = {}) {
    const useOptional = options.pyUseOptional || false;

    const typeMap = {
      string: 'str',
      int: 'int',
      float: 'float',
      bool: 'bool',
      datetime: 'datetime',
      nullable: 'Any',
      any: 'Any'
    };

    let needsDatetime = false;
    let needsAny = false;
    let needsOptional = false;

    for (const cls of classes) {
      for (const prop of cls.properties) {
        if (prop.schema.type === 'datetime') needsDatetime = true;
        if (prop.schema.type === 'nullable' || prop.schema.type === 'any') needsAny = true;
        if (useOptional && prop.schema.type === 'nullable') needsOptional = true;
      }
    }

    const lines = [
      'from __future__ import annotations',
      'from dataclasses import dataclass, field',
    ];
    if (needsDatetime) lines.push('from datetime import datetime');
    if (needsAny) lines.push('from typing import Any');
    if (needsOptional) lines.push('from typing import Optional');
    lines.push('');

    // Reverse order so nested classes appear first
    const reversed = [...classes].reverse();

    for (const cls of reversed) {
      lines.push('');
      lines.push('@dataclass');
      lines.push(`class ${cls.name}:`);

      if (cls.properties.length === 0) {
        lines.push('    pass');
        continue;
      }

      for (const prop of cls.properties) {
        const { schema, originalKey } = prop;
        const fieldName = this.toSnakeCase(originalKey);
        let pyType;

        if (schema.type === 'object' && schema.className) {
          pyType = schema.className;
        } else {
          pyType = typeMap[schema.type] || 'Any';
        }

        if (schema.isArray) {
          pyType = `list[${pyType}]`;
          lines.push(`    ${fieldName}: ${pyType} = field(default_factory=list)`);
        } else if (schema.type === 'nullable') {
          const nullableType = useOptional ? `Optional[${pyType}]` : pyType;
          lines.push(`    ${fieldName}: ${nullableType} = None`);
        } else {
          lines.push(`    ${fieldName}: ${pyType} = None`);
        }
      }
    }

    return lines.join('\n').trim();
  },

  /* ---- PHP 8.1 Generator ---- */
  _genPhp(classes, options = {}) {
    const useReadonly = options.phpUseReadonly !== false;

    const typeMap = {
      string: 'string',
      int: 'int',
      float: 'float',
      bool: 'bool',
      datetime: '\\DateTime',
      nullable: 'mixed',
      any: 'mixed'
    };

    const lines = ['<?php', '', 'declare(strict_types=1);', ''];

    for (const cls of classes) {
      lines.push(`final ${useReadonly ? 'readonly ' : ''}class ${cls.name}`);
      lines.push('{');
      lines.push('    public function __construct(');

      const params = cls.properties.map((prop, idx) => {
        const { schema, originalKey } = prop;
        const paramName = this.toCamelCase(originalKey);
        let phpType;

        if (schema.type === 'object' && schema.className) {
          phpType = schema.className;
        } else {
          phpType = typeMap[schema.type] || 'mixed';
        }

        if (schema.isArray) {
          // PHP typed arrays via doc comment
          phpType = 'array';
        }

        const isNullable = schema.type === 'nullable';
        const typePrefix = isNullable ? '?' : '';
        const defaultVal = isNullable ? ' = null' : (schema.isArray ? ' = []' : '');
        const comma = idx < cls.properties.length - 1 ? ',' : '';

        return `        public ${typePrefix}${phpType} $${paramName}${defaultVal}${comma}`;
      });

      lines.push(...params);
      lines.push('    ) {}');
      lines.push('}');
      lines.push('');
    }

    return lines.join('\n').trim();
  },

  /* ---- Syntax highlight output ---- */
  highlight(code, language) {
    if (!code) return '';
    if (typeof Prism === 'undefined') return Odin.Utils.escapeHtml(code);

    const langMap = {
      csharp: Prism.languages.csharp,
      go: Prism.languages.go,
      python: Prism.languages.python,
      php: Prism.languages.php
    };

    const lang = langMap[language];
    if (!lang) return Odin.Utils.escapeHtml(code);

    try {
      const highlighted = Prism.highlight(code, lang, language);
      if (typeof highlighted !== 'string') {
        return Odin.Utils.escapeHtml(code);
      }

      // Guard for PHP edge-cases where Prism may return raw, unsafe markup
      // (e.g. "<?php" can be swallowed by innerHTML parsing and appear blank).
      if (language === 'php') {
        const looksUnhighlighted = highlighted === code || !highlighted.includes('token');
        const hasUnsafePhpTag = highlighted.includes('<?php') || highlighted.includes('<?');
        if (looksUnhighlighted || hasUnsafePhpTag) {
          return Odin.Utils.escapeHtml(code);
        }
      }

      return highlighted;
    } catch {
      return Odin.Utils.escapeHtml(code);
    }
  }
};


/* ================================================================
   Odin.Pomodoro — Pomodoro Timer Engine
   ================================================================ */
Odin.Pomodoro = {
  /** Default durations (seconds) */
  DEFAULTS: {
    focus: 25 * 60,
    short:  5 * 60,
    long:  15 * 60
  },

  /** Min/Max constraints (minutes) */
  LIMITS: { min: 1, max: 120 },

  /** Load user-customised durations from localStorage, or fall back to defaults */
  loadCustomDurations() {
    try {
      const raw = localStorage.getItem('odin_pomo_durations');
      if (raw) {
        const parsed = JSON.parse(raw);
        return {
          focus: Math.max(this.LIMITS.min * 60, Math.min(this.LIMITS.max * 60, parsed.focus ?? this.DEFAULTS.focus)),
          short: Math.max(this.LIMITS.min * 60, Math.min(this.LIMITS.max * 60, parsed.short ?? this.DEFAULTS.short)),
          long:  Math.max(this.LIMITS.min * 60, Math.min(this.LIMITS.max * 60, parsed.long  ?? this.DEFAULTS.long))
        };
      }
    } catch (_) { /* ignore */ }
    return { ...this.DEFAULTS };
  },

  /** Persist custom durations */
  saveCustomDurations(durations) {
    try {
      localStorage.setItem('odin_pomo_durations', JSON.stringify(durations));
    } catch (_) { /* ignore */ }
  },

  /** Build MODES dynamically from durations */
  getModes(durations) {
    const d = durations || this.loadCustomDurations();
    return {
      focus: { duration: d.focus, label: 'Focus',       color: 'focus' },
      short: { duration: d.short, label: 'Short Break',  color: 'short' },
      long:  { duration: d.long,  label: 'Long Break',   color: 'long'  }
    };
  },

  get MODES() {
    return this.getModes();
  },

  formatTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
  },

  /** Cached AudioContext instance */
  _audioCtx: null,

  /** Get or create a shared AudioContext */
  _getAudioContext() {
    if (!this._audioCtx || this._audioCtx.state === 'closed') {
      this._audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    // Resume if suspended (e.g. after autoplay policy)
    if (this._audioCtx.state === 'suspended') {
      this._audioCtx.resume();
    }
    return this._audioCtx;
  },

  /** Generate a pleasant "ting" sound using the Web Audio API */
  playTing() {
    try {
      const ctx = this._getAudioContext();

      // Primary tone — 830 Hz sine
      const osc1 = ctx.createOscillator();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(830, ctx.currentTime);

      // Harmonic overtone — 1245 Hz (1.5x) for brightness
      const osc2 = ctx.createOscillator();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(1245, ctx.currentTime);

      // Gain envelopes
      const gain1 = ctx.createGain();
      gain1.gain.setValueAtTime(0.35, ctx.currentTime);
      gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);

      const gain2 = ctx.createGain();
      gain2.gain.setValueAtTime(0.15, ctx.currentTime);
      gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);

      osc1.connect(gain1).connect(ctx.destination);
      osc2.connect(gain2).connect(ctx.destination);

      osc1.start(ctx.currentTime);
      osc2.start(ctx.currentTime);
      osc1.stop(ctx.currentTime + 0.8);
      osc2.stop(ctx.currentTime + 0.5);

      // Play a second ting after a short pause for a "double-ting" effect
      setTimeout(() => {
        try {
          const osc3 = ctx.createOscillator();
          osc3.type = 'sine';
          osc3.frequency.setValueAtTime(1046, ctx.currentTime); // C6
          const gain3 = ctx.createGain();
          gain3.gain.setValueAtTime(0.3, ctx.currentTime);
          gain3.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
          osc3.connect(gain3).connect(ctx.destination);
          osc3.start(ctx.currentTime);
          osc3.stop(ctx.currentTime + 0.6);
        } catch (_) { /* ignore */ }
      }, 300);
    } catch (_) {
      // Web Audio API not available — silent fallback
    }
  },

  /** Request browser notification permission */
  async requestNotificationPermission() {
    if (!('Notification' in window)) return 'denied';
    if (Notification.permission === 'granted') return 'granted';
    return await Notification.requestPermission();
  },

  /** Fire a browser notification */
  sendNotification(title, body) {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    try {
      new Notification(title, { body, icon: 'icons/icon-odin.png' });
    } catch (_) { /* ignore */ }
  },

  /** Get daily completed session count from localStorage */
  getDailySessions() {
    try {
      const raw = localStorage.getItem('odin_pomo_sessions');
      if (!raw) return 0;
      const data = JSON.parse(raw);
      const today = new Date().toISOString().slice(0, 10);
      return data.date === today ? (data.count || 0) : 0;
    } catch (_) { return 0; }
  },

  /** Increment and persist daily session count */
  incrementDailySessions() {
    const today = new Date().toISOString().slice(0, 10);
    let count = this.getDailySessions() + 1;
    localStorage.setItem('odin_pomo_sessions', JSON.stringify({ date: today, count }));
    return count;
  },

  /** Reset daily sessions */
  resetDailySessions() {
    const today = new Date().toISOString().slice(0, 10);
    localStorage.setItem('odin_pomo_sessions', JSON.stringify({ date: today, count: 0 }));
  },

  /** SVG ring circumference for radius=108 */
  CIRCUMFERENCE: 2 * Math.PI * 108,

  // ---- Session Log (localStorage) ----
  LOG_KEY: 'odin_pomo_log',

  /** Get today's date string YYYY-MM-DD */
  todayKey() {
    return new Date().toISOString().slice(0, 10);
  },

  /** Maximum age for session log entries (days) */
  LOG_MAX_AGE_DAYS: 30,

  /** Load all session logs { "YYYY-MM-DD": [ { id, todo, actual, mode, duration, startedAt, completedAt } ] } */
  loadLog() {
    try {
      const raw = localStorage.getItem(this.LOG_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (_) { return {}; }
  },

  /** Save full log object */
  saveLog(log) {
    try {
      localStorage.setItem(this.LOG_KEY, JSON.stringify(log));
    } catch (_) { /* storage full */ }
  },

  /**
   * Remove log entries older than LOG_MAX_AGE_DAYS.
   * Should be called once on app initialization.
   */
  cleanupOldLogs() {
    const log = this.loadLog();
    const keys = Object.keys(log);
    if (keys.length === 0) return;

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - this.LOG_MAX_AGE_DAYS);
    const cutoffStr = cutoff.toISOString().slice(0, 10);

    let removed = 0;
    for (const dateKey of keys) {
      if (dateKey < cutoffStr) {
        delete log[dateKey];
        removed++;
      }
    }

    if (removed > 0) {
      this.saveLog(log);
    }
  },

  /** Get today's session entries */
  getTodayLog() {
    const log = this.loadLog();
    return log[this.todayKey()] || [];
  },

  /** Add a completed session entry for today */
  addSessionEntry(entry) {
    const log = this.loadLog();
    const today = this.todayKey();
    if (!log[today]) log[today] = [];
    log[today].push(entry);
    this.saveLog(log);
    return log[today];
  },

  /** Delete a session entry by id */
  deleteSessionEntry(id) {
    const log = this.loadLog();
    const today = this.todayKey();
    if (log[today]) {
      log[today] = log[today].filter(e => e.id !== id);
      this.saveLog(log);
    }
    return log[today] || [];
  },

  /** Export today's log as Markdown text */
  exportTodayMarkdown() {
    const entries = this.getTodayLog();
    const today = this.todayKey();
    if (entries.length === 0) return null;

    let md = '# Pomodoro Session Log — ' + today + '\n\n';
    md += '| # | Start | Finish | Mode | Duration | Plan (Todo) | Actual |\n';
    md += '|---|-------|--------|------|----------|-------------|--------|\n';

    const fmt = (iso) => iso ? new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '-';
    entries.forEach((e, i) => {
      const start = fmt(e.startedAt);
      const finish = fmt(e.completedAt);
      const dur = this.formatTime(e.duration);
      const mode = this.MODES[e.mode] ? this.MODES[e.mode].label : e.mode;
      md += '| ' + (i + 1) + ' | ' + start + ' | ' + finish + ' | ' + mode + ' | ' + dur + ' | ' + (e.todo || '-') + ' | ' + (e.actual || '-') + ' |\n';
    });

    md += '\n---\n';
    md += 'Total sessions: ' + entries.length + '  \n';
    const focusEntries = entries.filter(e => e.mode === 'focus');
    const totalFocusMin = focusEntries.reduce((s, e) => s + (e.duration || 0), 0) / 60;
    md += 'Total focus time: ' + Math.round(totalFocusMin) + ' minutes\n';

    return md;
  }
};


/* ================================================================
   Odin.JWT — Local-only JWT Decoder
   ================================================================ */
Odin.JWT = {
  _b64urlDecode(str) {
    let b64 = str.replace(/-/g, '+').replace(/_/g, '/');
    while (b64.length % 4) b64 += '=';
    try {
      return decodeURIComponent(
        atob(b64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join('')
      );
    } catch (_) {
      return atob(b64);
    }
  },

  decode(token) {
    if (!token || typeof token !== 'string') throw new Error('Empty token');
    const parts = token.trim().split('.');
    if (parts.length !== 3) throw new Error('Invalid JWT: expected 3 parts, got ' + parts.length);

    let header, payload;
    try { header = JSON.parse(this._b64urlDecode(parts[0])); }
    catch (_) { throw new Error('Invalid JWT header: not valid Base64/JSON'); }

    try { payload = JSON.parse(this._b64urlDecode(parts[1])); }
    catch (_) { throw new Error('Invalid JWT payload: not valid Base64/JSON'); }

    const sigBytes = atob(parts[2].replace(/-/g, '+').replace(/_/g, '/'));
    const sigHex = Array.from(sigBytes, c => ('0' + c.charCodeAt(0).toString(16)).slice(-2)).join('');

    return { header, payload, signature: sigHex };
  },

  isExpired(payload) {
    if (!payload || typeof payload.exp !== 'number') return null;
    return (payload.exp * 1000) < Date.now();
  },

  standardClaims: {
    iss: 'Issuer', sub: 'Subject', aud: 'Audience', exp: 'Expiration Time',
    nbf: 'Not Before', iat: 'Issued At', jti: 'JWT ID'
  },

  formatTimestamp(val) {
    if (typeof val !== 'number') return null;
    try { return new Date(val * 1000).toISOString(); } catch (_) { return null; }
  }
};


/* ================================================================
   Odin.ImageShrink — Browser Canvas Image Resizer
   ================================================================ */
Odin.ImageShrink = {
  processImage(file, scalePercent, format, quality) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          const scale = scalePercent / 100;
          const w = Math.round(img.naturalWidth * scale);
          const h = Math.round(img.naturalHeight * scale);
          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, w, h);

          canvas.toBlob(
            (blob) => {
              if (!blob) return reject(new Error('Canvas export failed'));
              resolve({ blob, width: w, height: h, size: blob.size });
            },
            format,
            format === 'image/png' ? undefined : quality
          );
        };
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = reader.result;
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  },

  fileSizeLabel(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  }
};


/* ================================================================
   Odin.CaseConverter — Text Case Transformations
   ================================================================ */
Odin.CaseConverter = {
  _splitWords(text) {
    return text
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
      .replace(/[_\-\.]+/g, ' ')
      .replace(/[^a-zA-Z0-9\s]/g, ' ')
      .trim()
      .split(/\s+/)
      .filter(Boolean);
  },

  toUpperCase(text) { return text.toUpperCase(); },
  toLowerCase(text) { return text.toLowerCase(); },

  toCamelCase(text) {
    const words = this._splitWords(text);
    if (!words.length) return '';
    return words[0].toLowerCase() + words.slice(1).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join('');
  },

  toPascalCase(text) {
    return this._splitWords(text).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join('');
  },

  toSnakeCase(text) {
    return this._splitWords(text).map(w => w.toLowerCase()).join('_');
  },

  toKebabCase(text) {
    return this._splitWords(text).map(w => w.toLowerCase()).join('-');
  },

  toTitleCase(text) {
    return text.replace(/\b\w/g, c => c.toUpperCase());
  },

  convert(text, mode) {
    switch (mode) {
      case 'upper':   return this.toUpperCase(text);
      case 'lower':   return this.toLowerCase(text);
      case 'camel':   return this.toCamelCase(text);
      case 'pascal':  return this.toPascalCase(text);
      case 'snake':   return this.toSnakeCase(text);
      case 'kebab':   return this.toKebabCase(text);
      case 'title':   return this.toTitleCase(text);
      default: return text;
    }
  }
};


/* ================================================================
   Odin.FlexGridPlayground — CSS Layout Code Generator
   ================================================================ */
Odin.FlexGridPlayground = {
  getFlexCSS(opts) {
    let css = '.container {\n';
    css += '  display: flex;\n';
    if (opts.direction && opts.direction !== 'row') css += '  flex-direction: ' + opts.direction + ';\n';
    if (opts.justifyContent && opts.justifyContent !== 'flex-start') css += '  justify-content: ' + opts.justifyContent + ';\n';
    if (opts.alignItems && opts.alignItems !== 'stretch') css += '  align-items: ' + opts.alignItems + ';\n';
    if (opts.flexWrap && opts.flexWrap !== 'nowrap') css += '  flex-wrap: ' + opts.flexWrap + ';\n';
    if (opts.gap && opts.gap !== '0') css += '  gap: ' + opts.gap + 'px;\n';
    css += '}';
    return css;
  },

  getGridCSS(opts) {
    let css = '.container {\n';
    css += '  display: grid;\n';
    if (opts.columns) css += '  grid-template-columns: ' + opts.columns + ';\n';
    if (opts.rows && opts.rows !== 'auto') css += '  grid-template-rows: ' + opts.rows + ';\n';
    if (opts.justifyItems && opts.justifyItems !== 'stretch') css += '  justify-items: ' + opts.justifyItems + ';\n';
    if (opts.alignItems && opts.alignItems !== 'stretch') css += '  align-items: ' + opts.alignItems + ';\n';
    if (opts.gap && opts.gap !== '0') css += '  gap: ' + opts.gap + 'px;\n';
    css += '}';
    return css;
  }
};


/* ================================================================
   Odin.Base64 — Encode / Decode (Text & File)
   ================================================================ */
Odin.Base64 = {
  encodeText(text) {
    return btoa(unescape(encodeURIComponent(text)));
  },

  decodeText(b64) {
    try {
      return decodeURIComponent(escape(atob(b64)));
    } catch (_) {
      return atob(b64);
    }
  },

  encodeArrayBuffer(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    return btoa(binary);
  },

  decodeToBlob(b64, mimeType) {
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return new Blob([bytes], { type: mimeType || 'application/octet-stream' });
  },

  detectMime(b64) {
    try {
      const raw = atob(b64.substring(0, 16));
      const hex = Array.from(raw, c => ('0' + c.charCodeAt(0).toString(16)).slice(-2)).join('');
      if (hex.startsWith('89504e47')) return 'image/png';
      if (hex.startsWith('ffd8ff'))   return 'image/jpeg';
      if (hex.startsWith('47494638')) return 'image/gif';
      if (hex.startsWith('52494646') && raw.substring(8, 12) === 'WEBP') return 'image/webp';
      if (hex.startsWith('25504446')) return 'application/pdf';
      if (hex.startsWith('504b0304')) return 'application/zip';
    } catch (_) { /* ignore */ }
    return 'application/octet-stream';
  }
};


/* ================================================================
   Alpine.js Application — odinApp()
   ================================================================ */
function odinApp() {
  return {
    // ---- Navigation ----
    activeTool: Odin.Storage.get('active_tool', 'pomodoro'),
    sidebarOpen: false,

    // ---- Toast ----
    toast: { visible: false, message: '' },

    // ---- Pomodoro Timer ----
    pomoMode: 'focus',
    pomoCustomDurations: Odin.Pomodoro.loadCustomDurations(),
    pomoTimeLeft: Odin.Pomodoro.loadCustomDurations().focus,
    pomoTotalTime: Odin.Pomodoro.loadCustomDurations().focus,
    pomoRunning: false,
    pomoPaused: false,
    pomoInterval: null,
    pomoEndTimestamp: null,
    pomoDailySessions: Odin.Pomodoro.getDailySessions(),
    pomoNotifGranted: ('Notification' in window) && Notification.permission === 'granted',
    pomoShowSettings: false,       // show settings modal
    pomoSettingFocus: 25,          // editable: minutes
    pomoSettingShort: 5,
    pomoSettingLong: 15,

    // ---- Pomodoro Session Log ----
    pomoTodoText: '',              // planned task before starting
    pomoActualText: '',            // actual result after completing
    pomoShowActualPrompt: false,   // show actual-input modal after focus session ends
    pomoSessionLog: Odin.Pomodoro.getTodayLog(),  // today's logged sessions
    pomoSessionStartedAt: null,    // ISO timestamp when session started

    // ---- Regex Tool ----
    regexPattern: Odin.Storage.get('regex_pattern', ''),
    regexFlags: Odin.Storage.get('regex_flags', 'g'),
    regexTestString: Odin.Storage.get('regex_test', ''),
    regexResult: { html: '', matches: [], error: null, matchCount: 0 },
    regexFlagG: true,
    regexFlagI: false,
    regexFlagM: false,
    showPatterns: false,
    commonPatterns: Odin.Regex.commonPatterns,

    // ---- QR Code Tool ----
    qrText: Odin.Storage.get('qr_text', ''),
    qrSize: Odin.Storage.get('qr_size', 256),

    // ---- JSON Formatter Tool ----
    jsonInput: Odin.Storage.get('json_input', ''),
    jsonOutput: '',
    jsonOutputHtml: '',
    jsonValidation: { valid: null, error: null },

    // ---- XML Formatter Tool ----
    xmlInput: Odin.Storage.get('xml_input', ''),
    xmlOutput: '',
    xmlOutputHtml: '',
    xmlValidation: { valid: null, error: null },

    // ---- Diff Checker Tool ----
    diffMode: Odin.Storage.get('diff_mode', 'json'),
    diffLeftInput: Odin.Storage.get('diff_left_input', ''),
    diffRightInput: Odin.Storage.get('diff_right_input', ''),
    diffResult: { equal: false, error: null, html: '', stats: { added: 0, removed: 0, changed: 0 } },

    // ---- Password Guard ----
    pwLength: Odin.Storage.get('pw_length', 16),
    pwLowercase: Odin.Storage.get('pw_lower', true),
    pwUppercase: Odin.Storage.get('pw_upper', true),
    pwNumbers: Odin.Storage.get('pw_numbers', true),
    pwSymbols: Odin.Storage.get('pw_symbols', false),
    pwResult: { password: '', entropy: 0, strength: { label: 'Weak', class: 'entropy-weak', color: 'text-red-400' }, poolSize: 0 },

    // ---- Model Generator ----
    modelJsonInput: Odin.Storage.get('model_json', ''),
    modelActiveTab: 'csharp',
    modelOutput: { csharp: '', go: '', python: '', php: '', error: null },
    modelOutputHtml: { csharp: '', go: '', python: '', php: '' },
    csUseJsonPropertyName: Odin.Storage.get('cs_use_jpn', false),
    csUseNullable: Odin.Storage.get('cs_nullable', false),
    goUseOmitEmpty: Odin.Storage.get('go_use_omitempty', false),
    goUsePointers: Odin.Storage.get('go_use_pointers', false),
    pyUseOptional: Odin.Storage.get('py_use_optional', false),
    phpUseReadonly: Odin.Storage.get('php_use_readonly', true),

    // ---- JWT Explorer ----
    jwtInput: '',
    jwtHeader: null,
    jwtPayload: null,
    jwtSignature: '',
    jwtError: '',
    jwtExpired: null,

    // ---- Image Shrink ----
    imgFile: null,
    imgFileName: '',
    imgOriginalSize: 0,
    imgPreviewUrl: '',
    imgResultUrl: '',
    imgResultSize: 0,
    imgScale: 50,
    imgFormat: 'image/webp',
    imgQuality: 0.8,
    imgProcessing: false,
    imgWidth: 0,
    imgHeight: 0,
    imgNewWidth: 0,
    imgNewHeight: 0,
    imgDragover: false,

    // ---- Case Converter ----
    caseInput: '',
    caseMode: 'upper',
    caseOutput: '',

    // ---- Flex/Grid Playground ----
    flexGridMode: 'flex',
    fgFlexDirection: 'row',
    fgJustifyContent: 'flex-start',
    fgAlignItems: 'stretch',
    fgFlexWrap: 'nowrap',
    fgGap: '10',
    fgGridCols: '1fr 1fr 1fr',
    fgGridRows: 'auto',
    fgGridGap: '10',
    fgGridJustifyItems: 'stretch',
    fgGridAlignItems: 'stretch',
    fgItemCount: 4,
    fgGeneratedCSS: '',

    // ---- Base64 Codec ----
    b64Input: '',
    b64Output: '',
    b64Mode: 'encode',
    b64FileMode: false,
    b64FileName: '',
    b64FileResult: '',
    b64DetectedMime: '',

    // ---- Init ----
    init() {
      // Restore flags
      const flags = this.regexFlags;
      this.regexFlagG = flags.includes('g');
      this.regexFlagI = flags.includes('i');
      this.regexFlagM = flags.includes('m');

      // Initialize Lucide icons
      this.$nextTick(() => {
        if (typeof lucide !== 'undefined') {
          lucide.createIcons();
        }
      });

      // Run initial computations
      this.runRegex();
      this.validateJson();
      this.validateXml();
      this.runDiffCheck();
      this.generatePassword();
      this.fgUpdateCSS();
      this.generateModels();

      // Generate QR on next tick
      this.$nextTick(() => {
        if (this.qrText) this.generateQR();
      });

      // Reset daily sessions if stale
      this.pomoDailySessions = Odin.Pomodoro.getDailySessions();

      // Auto-cleanup old session logs (>30 days)
      Odin.Pomodoro.cleanupOldLogs();

      // Keyboard shortcuts: Ctrl+1-8
      document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && !e.shiftKey && !e.altKey) {
          const tools = ['pomodoro', 'regex', 'qr', 'json', 'xml', 'diff', 'password', 'modelgen'];
          const num = parseInt(e.key);
          if (num >= 1 && num <= tools.length) {
            e.preventDefault();
            this.switchTool(tools[num - 1]);
          }
        }
      });

      // Restore tab title if no timer is running
      if (!this.pomoRunning) document.title = 'Odin Dev Toolkit';
    },

    // ---- Tool Switching ----
    switchTool(tool) {
      this.activeTool = tool;
      this.sidebarOpen = false;
      Odin.Storage.set('active_tool', tool);

      this.$nextTick(() => {
        if (typeof lucide !== 'undefined') lucide.createIcons();
        if (tool === 'qr' && this.qrText) this.generateQR();
      });
    },

    // ---- Pomodoro Timer Methods ----
    pomoSwitchMode(mode) {
      // Stop any running timer
      if (this.pomoInterval) {
        clearInterval(this.pomoInterval);
        this.pomoInterval = null;
      }
      this.pomoMode = mode;
      const modes = Odin.Pomodoro.getModes(this.pomoCustomDurations);
      this.pomoTotalTime = modes[mode].duration;
      this.pomoTimeLeft = this.pomoTotalTime;
      this.pomoRunning = false;
      this.pomoPaused = false;
      this.pomoEndTimestamp = null;
      this.pomoSessionStartedAt = null;
      if (!this.pomoRunning) document.title = 'Odin Dev Toolkit';
    },

    /** Open settings and populate fields from current durations */
    pomoOpenSettings() {
      this.pomoSettingFocus = Math.round(this.pomoCustomDurations.focus / 60);
      this.pomoSettingShort = Math.round(this.pomoCustomDurations.short / 60);
      this.pomoSettingLong  = Math.round(this.pomoCustomDurations.long / 60);
      this.pomoShowSettings = true;
    },

    /** Save custom durations and apply */
    pomoSaveSettings() {
      const lim = Odin.Pomodoro.LIMITS;
      const clamp = (v) => Math.max(lim.min, Math.min(lim.max, parseInt(v) || lim.min));
      this.pomoCustomDurations = {
        focus: clamp(this.pomoSettingFocus) * 60,
        short: clamp(this.pomoSettingShort) * 60,
        long:  clamp(this.pomoSettingLong) * 60
      };
      Odin.Pomodoro.saveCustomDurations(this.pomoCustomDurations);
      this.pomoShowSettings = false;

      // Re-apply to current mode if not running
      if (!this.pomoRunning && !this.pomoPaused) {
        this.pomoSwitchMode(this.pomoMode);
      }

      Odin.Toast.show(this, 'Timer durations updated!');
    },

    /** Reset durations to defaults */
    pomoResetSettings() {
      this.pomoSettingFocus = 25;
      this.pomoSettingShort = 5;
      this.pomoSettingLong = 15;
    },

    pomoStart() {
      if (this.pomoRunning) return;
      this.pomoRunning = true;
      this.pomoPaused = false;

      // Record start timestamp (only on fresh start, not resume)
      if (!this.pomoSessionStartedAt) {
        this.pomoSessionStartedAt = new Date().toISOString();
      }

      // Calculate the wall-clock end time
      this.pomoEndTimestamp = Date.now() + this.pomoTimeLeft * 1000;

      this.pomoInterval = setInterval(() => {
        const remaining = Math.round((this.pomoEndTimestamp - Date.now()) / 1000);

        if (remaining <= 0) {
          // Timer complete
          clearInterval(this.pomoInterval);
          this.pomoInterval = null;
          this.pomoTimeLeft = 0;
          this.pomoRunning = false;
          this.pomoPaused = false;
          this.pomoEndTimestamp = null;

          // Play ting sound
          Odin.Pomodoro.playTing();

          // Browser notification
          const modeLabel = Odin.Pomodoro.MODES[this.pomoMode].label;
          Odin.Pomodoro.sendNotification(
            modeLabel + ' Complete!',
            this.pomoMode === 'focus'
              ? 'Great work! Time for a break.'
              : 'Break is over. Ready to focus?'
          );

          // Increment sessions if focus mode
          if (this.pomoMode === 'focus') {
            this.pomoDailySessions = Odin.Pomodoro.incrementDailySessions();
          }

          // Show actual-input prompt for focus sessions, or auto-log breaks
          if (this.pomoMode === 'focus') {
            this.pomoShowActualPrompt = true;
          } else {
            // Auto-log break sessions (no plan/actual needed)
            this.pomoSaveSession('');
          }

          // Toast
          Odin.Toast.show(this, modeLabel + ' session complete! \uD83C\uDF89');

          document.title = 'Odin Dev Toolkit';
          return;
        }

        this.pomoTimeLeft = remaining;

        // Update browser tab title
        const modeLabel = Odin.Pomodoro.MODES[this.pomoMode].label;
        document.title = Odin.Pomodoro.formatTime(remaining) + ' — ' + modeLabel;
      }, 250);
    },

    pomoPause() {
      if (!this.pomoRunning) return;
      clearInterval(this.pomoInterval);
      this.pomoInterval = null;
      this.pomoRunning = false;
      this.pomoPaused = true;
      this.pomoEndTimestamp = null;
      document.title = 'Odin Dev Toolkit';
    },

    pomoReset() {
      if (this.pomoInterval) {
        clearInterval(this.pomoInterval);
        this.pomoInterval = null;
      }
      this.pomoTimeLeft = this.pomoTotalTime;
      this.pomoRunning = false;
      this.pomoPaused = false;
      this.pomoEndTimestamp = null;
      this.pomoSessionStartedAt = null;
      document.title = 'Odin Dev Toolkit';
    },

    async pomoRequestNotif() {
      const perm = await Odin.Pomodoro.requestNotificationPermission();
      this.pomoNotifGranted = perm === 'granted';
      if (this.pomoNotifGranted) {
        Odin.Toast.show(this, 'Notifications enabled!');
      }
    },

    get pomoFormattedTime() {
      return Odin.Pomodoro.formatTime(this.pomoTimeLeft);
    },

    get pomoProgress() {
      if (this.pomoTotalTime === 0) return 0;
      return (this.pomoTotalTime - this.pomoTimeLeft) / this.pomoTotalTime;
    },

    get pomoDashOffset() {
      const c = Odin.Pomodoro.CIRCUMFERENCE;
      return c * (1 - this.pomoProgress);
    },

    get pomoModeLabel() {
      return Odin.Pomodoro.MODES[this.pomoMode].label;
    },

    get pomoModeColor() {
      return Odin.Pomodoro.MODES[this.pomoMode].color;
    },

    // ---- Pomodoro Session Log Methods ----

    /** Save a completed session to the log */
    pomoSaveSession(actual) {
      const entry = {
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
        todo: this.pomoTodoText.trim() || '',
        actual: (actual || '').trim(),
        mode: this.pomoMode,
        duration: this.pomoTotalTime,
        startedAt: this.pomoSessionStartedAt || new Date().toISOString(),
        completedAt: new Date().toISOString()
      };
      this.pomoSessionLog = Odin.Pomodoro.addSessionEntry(entry);
      this.pomoTodoText = '';
      this.pomoActualText = '';
      this.pomoShowActualPrompt = false;
      this.pomoSessionStartedAt = null;

      // Reset timer back to full duration
      this.pomoTimeLeft = this.pomoTotalTime;

      // Re-render icons for new log items
      this.$nextTick(() => {
        if (typeof lucide !== 'undefined') lucide.createIcons();
      });
    },

    /** Submit the actual-result from the prompt modal */
    pomoSubmitActual() {
      this.pomoSaveSession(this.pomoActualText);
    },

    /** Skip filling in the actual — still logs the session */
    pomoSkipActual() {
      this.pomoSaveSession('');
    },

    /** Delete a session from today's log */
    pomoDeleteSession(id) {
      this.pomoSessionLog = Odin.Pomodoro.deleteSessionEntry(id);
    },

    /** Download today's session log as Markdown */
    pomoDownloadLog() {
      const md = Odin.Pomodoro.exportTodayMarkdown();
      if (!md) {
        Odin.Toast.show(this, 'No sessions to export yet.');
        return;
      }
      const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'pomodoro-log-' + Odin.Pomodoro.todayKey() + '.md';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      Odin.Toast.show(this, 'Session log downloaded!');
    },

    /** Format a session's completed time for display */
    pomoFormatLogTime(iso) {
      try {
        return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
      } catch (_) { return ''; }
    },

    // ---- Regex Methods ----
    buildFlags() {
      let f = '';
      if (this.regexFlagG) f += 'g';
      if (this.regexFlagI) f += 'i';
      if (this.regexFlagM) f += 'm';
      this.regexFlags = f;
      Odin.Storage.set('regex_flags', f);
    },

    async runRegex() {
      this.buildFlags();
      // Use async Web Worker-based matching for ReDoS protection
      this.regexResult = await Odin.Regex.testAsync(this.regexPattern, this.regexFlags, this.regexTestString);
      Odin.Storage.set('regex_pattern', this.regexPattern);
      Odin.Storage.set('regex_test', this.regexTestString);
    },

    selectPattern(p) {
      this.regexPattern = p.pattern;
      // Set flags
      this.regexFlagG = p.flags.includes('g');
      this.regexFlagI = p.flags.includes('i');
      this.regexFlagM = p.flags.includes('m');
      this.showPatterns = false;
      this.runRegex();
    },

    // ---- QR Code Methods ----
    generateQR() {
      Odin.Storage.set('qr_text', this.qrText);
      Odin.Storage.set('qr_size', this.qrSize);
      Odin.QRCode.generate(this.qrText, parseInt(this.qrSize), 'qr-preview');
    },

    downloadQR() {
      Odin.QRCode.downloadPng('odin-qrcode.png');
    },

    // ---- JSON Formatter Methods ----
    validateJson() {
      this.jsonValidation = Odin.JsonFormatter.validate(this.jsonInput);
      // Live preview: if valid, show highlighted output
      if (this.jsonValidation.valid && this.jsonInput.trim()) {
        try {
          const formatted = JSON.stringify(JSON.parse(this.jsonInput), null, 2);
          this.jsonOutput = formatted;
          this.jsonOutputHtml = Odin.JsonFormatter.highlight(formatted);
        } catch (e) {
          // fallback: show raw input
          this.jsonOutput = this.jsonInput;
          this.jsonOutputHtml = Odin.JsonFormatter.highlight(this.jsonInput);
        }
      } else if (!this.jsonInput.trim()) {
        this.jsonOutput = '';
        this.jsonOutputHtml = '';
      }
      Odin.Storage.set('json_input', this.jsonInput);
      this.$nextTick(() => {
        this.syncJsonLineNumbers();
        this.syncJsonOutputLineNumbers();
      });
    },

    beautifyJson() {
      const res = Odin.JsonFormatter.beautify(this.jsonInput);
      if (res.result !== null) {
        this.jsonInput = res.result;
        this.jsonOutput = res.result;
        this.jsonOutputHtml = Odin.JsonFormatter.highlight(res.result);
        this.jsonValidation = { valid: true, error: null };
      } else {
        this.jsonValidation = { valid: false, error: res.error };
      }
      Odin.Storage.set('json_input', this.jsonInput);
      this.$nextTick(() => {
        this.syncJsonLineNumbers();
        this.syncJsonOutputLineNumbers();
      });
    },

    minifyJson() {
      const res = Odin.JsonFormatter.minify(this.jsonInput);
      if (res.result !== null) {
        this.jsonInput = res.result;
        this.jsonOutput = res.result;
        this.jsonOutputHtml = Odin.JsonFormatter.highlight(res.result);
        this.jsonValidation = { valid: true, error: null };
      } else {
        this.jsonValidation = { valid: false, error: res.error };
      }
      Odin.Storage.set('json_input', this.jsonInput);
      this.$nextTick(() => {
        this.syncJsonLineNumbers();
        this.syncJsonOutputLineNumbers();
      });
    },

    getJsonLineNumbers() {
      const lineCount = Math.max(1, (this.jsonInput.match(/\n/g) || []).length + 1);
      return Array.from({ length: lineCount }, (_, index) => index + 1).join('\n');
    },

    getJsonOutputLineNumbers() {
      const source = this.jsonOutput || '';
      const lineCount = Math.max(1, (source.match(/\n/g) || []).length + 1);
      return Array.from({ length: lineCount }, (_, index) => index + 1).join('\n');
    },

    syncJsonLineNumbers() {
      if (!this.$refs || !this.$refs.jsonInput || !this.$refs.jsonGutter) return;
      this.$refs.jsonGutter.scrollTop = this.$refs.jsonInput.scrollTop;
    },

    syncJsonOutputLineNumbers() {
      if (!this.$refs || !this.$refs.jsonOutputPane || !this.$refs.jsonOutputGutter) return;
      this.$refs.jsonOutputGutter.scrollTop = this.$refs.jsonOutputPane.scrollTop;
    },

    copyJson() {
      Odin.Clipboard.copy(this.jsonOutput || this.jsonInput, this);
    },

    validateXml() {
      this.xmlValidation = Odin.XmlFormatter.validate(this.xmlInput);

      if (this.xmlValidation.valid && this.xmlInput.trim()) {
        const pretty = Odin.XmlFormatter.beautify(this.xmlInput);
        if (pretty.result !== null) {
          this.xmlOutput = pretty.result;
          this.xmlOutputHtml = Odin.XmlFormatter.highlight(pretty.result);
        }
      } else if (!this.xmlInput.trim()) {
        this.xmlOutput = '';
        this.xmlOutputHtml = '';
      }

      Odin.Storage.set('xml_input', this.xmlInput);
      this.$nextTick(() => {
        this.syncXmlLineNumbers();
        this.syncXmlOutputLineNumbers();
      });
    },

    beautifyXml() {
      const res = Odin.XmlFormatter.beautify(this.xmlInput);
      if (res.result !== null) {
        this.xmlInput = res.result;
        this.xmlOutput = res.result;
        this.xmlOutputHtml = Odin.XmlFormatter.highlight(res.result);
        this.xmlValidation = { valid: true, error: null };
      } else {
        this.xmlValidation = { valid: false, error: res.error };
      }

      Odin.Storage.set('xml_input', this.xmlInput);
      this.$nextTick(() => {
        this.syncXmlLineNumbers();
        this.syncXmlOutputLineNumbers();
      });
    },

    minifyXml() {
      const res = Odin.XmlFormatter.minify(this.xmlInput);
      if (res.result !== null) {
        this.xmlInput = res.result;
        this.xmlOutput = res.result;
        this.xmlOutputHtml = Odin.XmlFormatter.highlight(res.result);
        this.xmlValidation = { valid: true, error: null };
      } else {
        this.xmlValidation = { valid: false, error: res.error };
      }

      Odin.Storage.set('xml_input', this.xmlInput);
      this.$nextTick(() => {
        this.syncXmlLineNumbers();
        this.syncXmlOutputLineNumbers();
      });
    },

    getXmlLineNumbers() {
      const lineCount = Math.max(1, (this.xmlInput.match(/\n/g) || []).length + 1);
      return Array.from({ length: lineCount }, (_, index) => index + 1).join('\n');
    },

    getXmlOutputLineNumbers() {
      const source = this.xmlOutput || '';
      const lineCount = Math.max(1, (source.match(/\n/g) || []).length + 1);
      return Array.from({ length: lineCount }, (_, index) => index + 1).join('\n');
    },

    syncXmlLineNumbers() {
      if (!this.$refs || !this.$refs.xmlInput || !this.$refs.xmlGutter) return;
      this.$refs.xmlGutter.scrollTop = this.$refs.xmlInput.scrollTop;
    },

    syncXmlOutputLineNumbers() {
      if (!this.$refs || !this.$refs.xmlOutputPane || !this.$refs.xmlOutputGutter) return;
      this.$refs.xmlOutputGutter.scrollTop = this.$refs.xmlOutputPane.scrollTop;
    },

    copyXml() {
      Odin.Clipboard.copy(this.xmlOutput || this.xmlInput, this);
    },

    runDiffCheck() {
      const result = Odin.DiffChecker.compare(this.diffLeftInput, this.diffRightInput, this.diffMode);
      this.diffResult = result;
      Odin.Storage.set('diff_mode', this.diffMode);
      Odin.Storage.set('diff_left_input', this.diffLeftInput);
      Odin.Storage.set('diff_right_input', this.diffRightInput);
    },

    setDiffMode(mode) {
      this.diffMode = mode;
      this.runDiffCheck();
    },

    copyDiffLeftNormalized() {
      if (this.diffResult.leftNormalized) {
        Odin.Clipboard.copy(this.diffResult.leftNormalized, this);
      }
    },

    copyDiffRightNormalized() {
      if (this.diffResult.rightNormalized) {
        Odin.Clipboard.copy(this.diffResult.rightNormalized, this);
      }
    },

    // ---- Password Guard Methods ----
    generatePassword() {
      this.pwResult = Odin.PasswordGuard.generate(parseInt(this.pwLength), {
        lowercase: this.pwLowercase,
        uppercase: this.pwUppercase,
        numbers: this.pwNumbers,
        symbols: this.pwSymbols
      });
      Odin.Storage.set('pw_length', this.pwLength);
      Odin.Storage.set('pw_lower', this.pwLowercase);
      Odin.Storage.set('pw_upper', this.pwUppercase);
      Odin.Storage.set('pw_numbers', this.pwNumbers);
      Odin.Storage.set('pw_symbols', this.pwSymbols);
    },

    copyPassword() {
      Odin.Clipboard.copy(this.pwResult.password, this);
    },

    getEntropyWidth() {
      const e = this.pwResult.entropy;
      if (e < 28) return Math.max(5, (e / 28) * 20) + '%';
      if (e < 36) return 20 + ((e - 28) / 8) * 20 + '%';
      if (e < 60) return 40 + ((e - 36) / 24) * 25 + '%';
      if (e < 80) return 65 + ((e - 60) / 20) * 20 + '%';
      return Math.min(100, 85 + ((e - 80) / 40) * 15) + '%';
    },

    getEntropyColor() {
      const e = this.pwResult.entropy;
      if (e < 28) return '#ef4444';
      if (e < 36) return '#f97316';
      if (e < 60) return '#eab308';
      if (e < 80) return '#22c55e';
      return '#10b981';
    },

    // ---- Model Generator Methods ----
    generateModels() {
      if (!this.modelJsonInput.trim()) {
        this.modelOutput = { csharp: '', go: '', python: '', php: '', error: null };
        this.modelOutputHtml = { csharp: '', go: '', python: '', php: '' };
        return;
      }
      this.modelOutput = Odin.ModelGen.generateAll(this.modelJsonInput, {
        csUseJsonPropertyName: this.csUseJsonPropertyName,
        csUseNullable: this.csUseNullable,
        goUseOmitEmpty: this.goUseOmitEmpty,
        goUsePointers: this.goUsePointers,
        pyUseOptional: this.pyUseOptional,
        phpUseReadonly: this.phpUseReadonly
      });

      Odin.Storage.set('cs_use_jpn', this.csUseJsonPropertyName);
      Odin.Storage.set('cs_nullable', this.csUseNullable);
      Odin.Storage.set('go_use_omitempty', this.goUseOmitEmpty);
      Odin.Storage.set('go_use_pointers', this.goUsePointers);
      Odin.Storage.set('py_use_optional', this.pyUseOptional);
      Odin.Storage.set('php_use_readonly', this.phpUseReadonly);

      // Highlight each language
      if (!this.modelOutput.error) {
        this.modelOutputHtml = {
          csharp: Odin.ModelGen.highlight(this.modelOutput.csharp, 'csharp'),
          go: Odin.ModelGen.highlight(this.modelOutput.go, 'go'),
          python: Odin.ModelGen.highlight(this.modelOutput.python, 'python'),
          php: Odin.ModelGen.highlight(this.modelOutput.php, 'php')
        };
      } else {
        const err = this.modelOutput.csharp; // error message is same for all
        this.modelOutputHtml = { csharp: err, go: err, python: err, php: err };
      }

      Odin.Storage.set('model_json', this.modelJsonInput);
    },

    copyModelOutput() {
      const code = this.modelOutput[this.modelActiveTab];
      if (code) Odin.Clipboard.copy(code, this);
    },

    // ---- JWT Explorer Methods ----
    decodeJWT() {
      this.jwtHeader = null;
      this.jwtPayload = null;
      this.jwtSignature = '';
      this.jwtError = '';
      this.jwtExpired = null;
      if (!this.jwtInput.trim()) return;
      try {
        const result = Odin.JWT.decode(this.jwtInput.trim());
        this.jwtHeader = result.header;
        this.jwtPayload = result.payload;
        this.jwtSignature = result.signature;
        this.jwtExpired = Odin.JWT.isExpired(result.payload);
      } catch (err) {
        this.jwtError = err.message;
      }
      // Refresh Lucide icons in dynamically rendered template blocks
      this.$nextTick(() => {
        if (typeof lucide !== 'undefined') lucide.createIcons();
      });
    },

    jwtHighlight(obj) {
      if (!obj) return '';
      try {
        const raw = JSON.stringify(obj, null, 2);
        if (typeof Prism !== 'undefined') {
          return Prism.highlight(raw, Prism.languages.json, 'json');
        }
        return Odin.Utils.escapeHtml(raw);
      } catch (_) { return ''; }
    },

    jwtFormatClaim(key, val) {
      const label = Odin.JWT.standardClaims[key];
      const ts = (key === 'exp' || key === 'iat' || key === 'nbf') ? Odin.JWT.formatTimestamp(val) : null;
      return (label ? label : key) + (ts ? ' — ' + ts : '');
    },

    // ---- Image Shrink Methods ----
    imgHandleDrop(e) {
      this.imgDragover = false;
      const files = e.dataTransfer && e.dataTransfer.files;
      if (files && files.length) this.imgLoadFile(files[0]);
    },

    imgHandleFile(e) {
      const files = e.target.files;
      if (files && files.length) this.imgLoadFile(files[0]);
    },

    imgLoadFile(file) {
      if (!file.type.startsWith('image/')) {
        Odin.Toast.show(this, 'Please select an image file');
        return;
      }
      this.imgFile = file;
      this.imgFileName = file.name;
      this.imgOriginalSize = file.size;
      this.imgResultUrl = '';
      this.imgResultSize = 0;
      const reader = new FileReader();
      reader.onload = () => {
        this.imgPreviewUrl = reader.result;
        const img = new Image();
        img.onload = () => {
          this.imgWidth = img.naturalWidth;
          this.imgHeight = img.naturalHeight;
          this.imgNewWidth = Math.round(img.naturalWidth * this.imgScale / 100);
          this.imgNewHeight = Math.round(img.naturalHeight * this.imgScale / 100);
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    },

    imgUpdateDimensions() {
      this.imgNewWidth = Math.round(this.imgWidth * this.imgScale / 100);
      this.imgNewHeight = Math.round(this.imgHeight * this.imgScale / 100);
    },

    async imgProcess() {
      if (!this.imgFile) return;
      this.imgProcessing = true;
      try {
        const result = await Odin.ImageShrink.processImage(
          this.imgFile, this.imgScale, this.imgFormat, this.imgQuality
        );
        if (this.imgResultUrl) URL.revokeObjectURL(this.imgResultUrl);
        this.imgResultUrl = URL.createObjectURL(result.blob);
        this.imgResultSize = result.size;
        this.imgNewWidth = result.width;
        this.imgNewHeight = result.height;
        Odin.Toast.show(this, 'Image processed! ' + Odin.ImageShrink.fileSizeLabel(result.size));
      } catch (err) {
        Odin.Toast.show(this, 'Error: ' + err.message);
      }
      this.imgProcessing = false;
    },

    imgDownload() {
      if (!this.imgResultUrl) return;
      const ext = this.imgFormat === 'image/webp' ? '.webp' : '.png';
      const name = (this.imgFileName.replace(/\.[^.]+$/, '') || 'image') + '-shrunk' + ext;
      const a = document.createElement('a');
      a.href = this.imgResultUrl;
      a.download = name;
      a.click();
    },

    imgReset() {
      if (this.imgResultUrl) URL.revokeObjectURL(this.imgResultUrl);
      if (this.imgPreviewUrl && this.imgPreviewUrl.startsWith('blob:')) URL.revokeObjectURL(this.imgPreviewUrl);
      this.imgFile = null;
      this.imgFileName = '';
      this.imgOriginalSize = 0;
      this.imgPreviewUrl = '';
      this.imgResultUrl = '';
      this.imgResultSize = 0;
      this.imgScale = 50;
      this.imgFormat = 'image/webp';
      this.imgQuality = 0.8;
      this.imgWidth = 0;
      this.imgHeight = 0;
      this.imgNewWidth = 0;
      this.imgNewHeight = 0;
    },

    // ---- Case Converter Methods ----
    convertCase() {
      this.caseOutput = this.caseInput ? Odin.CaseConverter.convert(this.caseInput, this.caseMode) : '';
    },

    setCaseMode(mode) {
      this.caseMode = mode;
      this.convertCase();
    },

    copyCaseOutput() {
      if (this.caseOutput) Odin.Clipboard.copy(this.caseOutput, this);
    },

    // ---- Flex/Grid Playground Methods ----
    fgUpdateCSS() {
      if (this.flexGridMode === 'flex') {
        this.fgGeneratedCSS = Odin.FlexGridPlayground.getFlexCSS({
          direction: this.fgFlexDirection,
          justifyContent: this.fgJustifyContent,
          alignItems: this.fgAlignItems,
          flexWrap: this.fgFlexWrap,
          gap: this.fgGap
        });
      } else {
        this.fgGeneratedCSS = Odin.FlexGridPlayground.getGridCSS({
          columns: this.fgGridCols,
          rows: this.fgGridRows,
          justifyItems: this.fgGridJustifyItems,
          alignItems: this.fgGridAlignItems,
          gap: this.fgGridGap
        });
      }
    },

    fgGetPreviewStyle() {
      if (this.flexGridMode === 'flex') {
        return {
          display: 'flex',
          flexDirection: this.fgFlexDirection,
          justifyContent: this.fgJustifyContent,
          alignItems: this.fgAlignItems,
          flexWrap: this.fgFlexWrap,
          gap: this.fgGap + 'px'
        };
      } else {
        return {
          display: 'grid',
          gridTemplateColumns: this.fgGridCols,
          gridTemplateRows: this.fgGridRows,
          justifyItems: this.fgGridJustifyItems,
          alignItems: this.fgGridAlignItems,
          gap: this.fgGridGap + 'px'
        };
      }
    },

    fgCopyCSS() {
      if (this.fgGeneratedCSS) Odin.Clipboard.copy(this.fgGeneratedCSS, this);
    },

    fgAddItem() { if (this.fgItemCount < 12) this.fgItemCount++; },
    fgRemoveItem() { if (this.fgItemCount > 1) this.fgItemCount--; },

    // ---- Base64 Codec Methods ----
    b64Convert() {
      if (!this.b64Input.trim()) { this.b64Output = ''; return; }
      try {
        if (this.b64Mode === 'encode') {
          this.b64Output = Odin.Base64.encodeText(this.b64Input);
        } else {
          this.b64Output = Odin.Base64.decodeText(this.b64Input);
        }
      } catch (err) {
        this.b64Output = 'Error: ' + err.message;
      }
    },

    b64HandleFile(e) {
      const files = e.target.files;
      if (!files || !files.length) return;
      const file = files[0];
      this.b64FileName = file.name;
      if (this.b64Mode === 'encode') {
        const reader = new FileReader();
        reader.onload = () => {
          this.b64FileResult = Odin.Base64.encodeArrayBuffer(reader.result);
        };
        reader.readAsArrayBuffer(file);
      }
    },

    b64DownloadDecoded() {
      if (!this.b64Input.trim()) return;
      try {
        const clean = this.b64Input.trim().replace(/\s/g, '');
        this.b64DetectedMime = Odin.Base64.detectMime(clean);
        const blob = Odin.Base64.decodeToBlob(clean, this.b64DetectedMime);
        const ext = this.b64DetectedMime.split('/')[1] || 'bin';
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'decoded-file.' + ext;
        a.click();
        URL.revokeObjectURL(a.href);
        Odin.Toast.show(this, 'File downloaded as ' + this.b64DetectedMime);
      } catch (err) {
        Odin.Toast.show(this, 'Decode error: ' + err.message);
      }
    },

    b64CopyOutput() {
      const text = this.b64FileMode ? this.b64FileResult : this.b64Output;
      if (text) Odin.Clipboard.copy(text, this);
    },

    b64SwitchMode(mode) {
      this.b64Mode = mode;
      this.b64Input = '';
      this.b64Output = '';
      this.b64FileResult = '';
      this.b64FileName = '';
      this.b64DetectedMime = '';
    },

    // ---- Utility ----
    copyToClipboard(text) {
      Odin.Clipboard.copy(text, this);
    }
  };
}
