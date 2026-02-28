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
    if (typeof Prism !== 'undefined' && Prism.languages.json) {
      return Prism.highlight(code, Prism.languages.json, 'json');
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
  generateAll(jsonString) {
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
      csharp: this._genCSharp(classes),
      go: this._genGo(classes),
      python: this._genPython(classes),
      php: this._genPhp(classes),
      error: null
    };
  },

  /* ---- C# Generator ---- */
  _genCSharp(classes) {
    const typeMap = {
      string: 'string',
      int: 'int',
      float: 'double',
      bool: 'bool',
      datetime: 'DateTime',
      nullable: 'object?',
      any: 'object'
    };

    const lines = [
      'using System;',
      'using System.Collections.Generic;',
      'using Newtonsoft.Json;',
      ''
    ];

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

        lines.push(`    [JsonProperty("${originalKey}")]`);
        lines.push(`    public ${csType} ${propName} { get; set; }`);
        lines.push('');
      }

      lines.push('}');
      lines.push('');
    }

    return lines.join('\n').trim();
  },

  /* ---- Go Generator ---- */
  _genGo(classes) {
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

        return { fieldName, goType, originalKey };
      });

      const maxNameLen = Math.max(...fields.map(f => f.fieldName.length));
      const maxTypeLen = Math.max(...fields.map(f => f.goType.length));

      for (const f of fields) {
        const name = f.fieldName.padEnd(maxNameLen);
        const type = f.goType.padEnd(maxTypeLen);
        lines.push(`\t${name} ${type} \`json:"${f.originalKey}"\``);
      }

      lines.push('}');
      lines.push('');
    }

    return lines.join('\n').trim();
  },

  /* ---- Python Generator ---- */
  _genPython(classes) {
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

    for (const cls of classes) {
      for (const prop of cls.properties) {
        if (prop.schema.type === 'datetime') needsDatetime = true;
        if (prop.schema.type === 'nullable' || prop.schema.type === 'any') needsAny = true;
      }
    }

    const lines = [
      'from __future__ import annotations',
      'from dataclasses import dataclass, field',
    ];
    if (needsDatetime) lines.push('from datetime import datetime');
    if (needsAny) lines.push('from typing import Any');
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
          lines.push(`    ${fieldName}: ${pyType} = None`);
        } else {
          lines.push(`    ${fieldName}: ${pyType} = None`);
        }
      }
    }

    return lines.join('\n').trim();
  },

  /* ---- PHP 8.1 Generator ---- */
  _genPhp(classes) {
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
      lines.push(`final readonly class ${cls.name}`);
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
    if (typeof Prism === 'undefined') return code;

    const langMap = {
      csharp: Prism.languages.csharp,
      go: Prism.languages.go,
      python: Prism.languages.python,
      php: Prism.languages.php
    };

    const lang = langMap[language];
    if (!lang) return code;

    try {
      return Prism.highlight(code, lang, language);
    } catch {
      return code;
    }
  }
};


/* ================================================================
   Alpine.js Application — odinApp()
   ================================================================ */
function odinApp() {
  return {
    // ---- Navigation ----
    activeTool: Odin.Storage.get('active_tool', 'regex'),
    sidebarOpen: false,

    // ---- Toast ----
    toast: { visible: false, message: '' },

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
      this.generatePassword();
      this.generateModels();

      // Generate QR on next tick
      this.$nextTick(() => {
        if (this.qrText) this.generateQR();
      });

      // Keyboard shortcuts: Ctrl+1-5
      document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && !e.shiftKey && !e.altKey) {
          const tools = ['regex', 'qr', 'json', 'password', 'modelgen'];
          const num = parseInt(e.key);
          if (num >= 1 && num <= 5) {
            e.preventDefault();
            this.switchTool(tools[num - 1]);
          }
        }
      });
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
      Odin.Storage.set('json_input', this.jsonInput);
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
    },

    copyJson() {
      Odin.Clipboard.copy(this.jsonOutput || this.jsonInput, this);
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
      this.modelOutput = Odin.ModelGen.generateAll(this.modelJsonInput);

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
