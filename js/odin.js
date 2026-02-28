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

  test(pattern, flags, testString) {
    if (!pattern || !testString) {
      return { html: this._escapeHtml(testString || ''), matches: [], error: null, matchCount: 0 };
    }

    let regex;
    try {
      // Ensure 'g' flag for matchAll
      const flagSet = new Set(flags.split(''));
      flagSet.add('g');
      regex = new RegExp(pattern, [...flagSet].join(''));
    } catch (e) {
      return { html: this._escapeHtml(testString), matches: [], error: e.message, matchCount: 0 };
    }

    const matches = [];
    let match;
    const allMatches = [];

    try {
      for (const m of testString.matchAll(regex)) {
        allMatches.push(m);
        matches.push({
          fullMatch: m[0],
          index: m.index,
          groups: m.slice(1),
          namedGroups: m.groups || {}
        });
      }
    } catch (e) {
      return { html: this._escapeHtml(testString), matches: [], error: e.message, matchCount: 0 };
    }

    // Build highlighted HTML
    const html = this._buildHighlightedHtml(testString, allMatches);

    return { html, matches, error: null, matchCount: allMatches.length };
  },

  _buildHighlightedHtml(text, matches) {
    if (!matches.length) return this._escapeHtml(text);

    let result = '';
    let lastIndex = 0;

    for (const m of matches) {
      // Text before match
      if (m.index > lastIndex) {
        result += this._escapeHtml(text.slice(lastIndex, m.index));
      }

      // Full match with highlight
      result += `<span class="match-highlight match-group-0">${this._escapeHtml(m[0])}</span>`;
      lastIndex = m.index + m[0].length;
    }

    // Remaining text
    if (lastIndex < text.length) {
      result += this._escapeHtml(text.slice(lastIndex));
    }

    return result;
  },

  _escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
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
    return this._escapeHtml(code);
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
  },

  _escapeHtml(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
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
    return this._escapeHtml(code);
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
  },

  _escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
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
    const maxLen = Math.max(a.length, b.length);
    const lines = [];
    const stats = { added: 0, removed: 0, changed: 0 };

    for (let i = 0; i < maxLen; i++) {
      const left = a[i] ?? null;
      const right = b[i] ?? null;

      if (left === right) {
        lines.push({ type: 'same', left, right, line: i + 1 });
        continue;
      }

      if (left === null) {
        lines.push({ type: 'added', left: '', right, line: i + 1 });
        stats.added += 1;
        continue;
      }

      if (right === null) {
        lines.push({ type: 'removed', left, right: '', line: i + 1 });
        stats.removed += 1;
        continue;
      }

      lines.push({ type: 'changed', left, right, line: i + 1 });
      stats.changed += 1;
    }

    return { lines, stats };
  },

  _renderDiff(diff) {
    return diff.lines
      .map((row) => {
        const cls = `diff-row diff-${row.type}`;
        const left = this._escapeHtml(row.left ?? '');
        const right = this._escapeHtml(row.right ?? '');
        return `<div class="${cls}"><span class="diff-ln">${row.line}</span><span class="diff-left">${left}</span><span class="diff-right">${right}</span></div>`;
      })
      .join('');
  },

  _escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
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
    if (options.lowercase) pool += this.charsets.lowercase;
    if (options.uppercase) pool += this.charsets.uppercase;
    if (options.numbers) pool += this.charsets.numbers;
    if (options.symbols) pool += this.charsets.symbols;

    if (!pool) pool = this.charsets.lowercase; // fallback

    const password = this._secureRandom(pool, length);
    const entropy = this.calcEntropy(length, pool.length);
    const strength = this.getStrength(entropy);

    return { password, entropy, strength, poolSize: pool.length };
  },

  _secureRandom(pool, length) {
    const array = new Uint32Array(length);
    crypto.getRandomValues(array);
    let result = '';
    for (let i = 0; i < length; i++) {
      result += pool[array[i] % pool.length];
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
        // Array of objects — generate a class for the item
        const className = this.toClassName(key);
        this._parseObject(className, firstItem, classes);
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
        this._parseObject('Root', parsed[0], classes);
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
        const comma = idx < cls.properties.length - 1 ? ',' : ',';

        return `        public ${typePrefix}${phpType} $${paramName}${defaultVal}${comma}`;
      });

      // Remove trailing comma from last param
      if (params.length > 0) {
        params[params.length - 1] = params[params.length - 1].replace(/,$/, '');
      }

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
    if (typeof Prism === 'undefined') return this._escapeHtml(code);

    const langMap = {
      csharp: Prism.languages.csharp,
      go: Prism.languages.go,
      python: Prism.languages.python,
      php: Prism.languages.php
    };

    const lang = langMap[language];
    if (!lang) return this._escapeHtml(code);

    try {
      const highlighted = Prism.highlight(code, lang, language);
      if (typeof highlighted !== 'string') {
        return this._escapeHtml(code);
      }

      // Guard for PHP edge-cases where Prism may return raw, unsafe markup
      // (e.g. "<?php" can be swallowed by innerHTML parsing and appear blank).
      if (language === 'php') {
        const looksUnhighlighted = highlighted === code || !highlighted.includes('token');
        const hasUnsafePhpTag = highlighted.includes('<?php') || highlighted.includes('<?');
        if (looksUnhighlighted || hasUnsafePhpTag) {
          return this._escapeHtml(code);
        }
      }

      return highlighted;
    } catch {
      return this._escapeHtml(code);
    }
  },

  _escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }
};


/* ================================================================
   Odin.Pomodoro — Pomodoro Timer Engine
   ================================================================ */
Odin.Pomodoro = {
  MODES: {
    focus: { duration: 25 * 60, label: 'Focus',       color: 'focus' },
    short: { duration:  5 * 60, label: 'Short Break',  color: 'short' },
    long:  { duration: 15 * 60, label: 'Long Break',   color: 'long'  }
  },

  formatTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
  },

  /** Generate a pleasant "ting" sound using the Web Audio API */
  playTing() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();

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

      // Clean up context after playback
      setTimeout(() => ctx.close(), 2000);
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
    md += '| # | Time | Mode | Duration | Plan (Todo) | Actual |\n';
    md += '|---|------|------|----------|-------------|--------|\n';

    entries.forEach((e, i) => {
      const time = e.completedAt ? new Date(e.completedAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '-';
      const dur = this.formatTime(e.duration);
      const mode = this.MODES[e.mode] ? this.MODES[e.mode].label : e.mode;
      md += '| ' + (i + 1) + ' | ' + time + ' | ' + mode + ' | ' + dur + ' | ' + (e.todo || '-') + ' | ' + (e.actual || '-') + ' |\n';
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
    pomoTimeLeft: 25 * 60,
    pomoTotalTime: 25 * 60,
    pomoRunning: false,
    pomoPaused: false,
    pomoInterval: null,
    pomoEndTimestamp: null,
    pomoDailySessions: Odin.Pomodoro.getDailySessions(),
    pomoNotifGranted: ('Notification' in window) && Notification.permission === 'granted',

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
      this.generateModels();

      // Generate QR on next tick
      this.$nextTick(() => {
        if (this.qrText) this.generateQR();
      });

      // Reset daily sessions if stale
      this.pomoDailySessions = Odin.Pomodoro.getDailySessions();

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
      this.pomoTotalTime = Odin.Pomodoro.MODES[mode].duration;
      this.pomoTimeLeft = this.pomoTotalTime;
      this.pomoRunning = false;
      this.pomoPaused = false;
      this.pomoEndTimestamp = null;
      this.pomoSessionStartedAt = null;
      if (!this.pomoRunning) document.title = 'Odin Dev Toolkit';
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

    runRegex() {
      this.buildFlags();
      this.regexResult = Odin.Regex.test(this.regexPattern, this.regexFlags, this.regexTestString);
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

    // ---- Utility ----
    copyToClipboard(text) {
      Odin.Clipboard.copy(text, this);
    }
  };
}
