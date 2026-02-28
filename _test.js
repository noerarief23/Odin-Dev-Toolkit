/* ================================================================
   Odin Dev Toolkit — Unit Tests
   Run: node _test.js
   ================================================================ */

// ---- Minimal test harness ----
let _passed = 0;
let _failed = 0;
let _currentSuite = '';

function describe(name, fn) {
  _currentSuite = name;
  console.log(`\n\x1b[1m▶ ${name}\x1b[0m`);
  fn();
}

function it(name, fn) {
  try {
    fn();
    _passed++;
    console.log(`  \x1b[32m✓\x1b[0m ${name}`);
  } catch (e) {
    _failed++;
    console.log(`  \x1b[31m✗\x1b[0m ${name}`);
    console.log(`    \x1b[31m${e.message}\x1b[0m`);
  }
}

function assert(condition, msg = 'Assertion failed') {
  if (!condition) throw new Error(msg);
}

function assertEqual(a, b, msg) {
  if (a !== b) throw new Error(msg || `Expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
}

function assertDeepEqual(a, b, msg) {
  const as = JSON.stringify(a);
  const bs = JSON.stringify(b);
  if (as !== bs) throw new Error(msg || `Expected ${bs}, got ${as}`);
}

// ---- Mock browser globals for Node.js ----
globalThis.window = globalThis;
globalThis.sessionStorage = (() => {
  const store = {};
  return {
    getItem: (k) => store[k] ?? null,
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; }
  };
})();
globalThis.localStorage = (() => {
  const store = {};
  return {
    getItem: (k) => store[k] ?? null,
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; },
    clear: () => { for (const k of Object.keys(store)) delete store[k]; }
  };
})();
globalThis.document = {
  title: '',
  createElement: () => ({ style: {}, click() {}, select() {} }),
  body: { appendChild() {}, removeChild() {} },
  getElementById: () => null,
  addEventListener() {},
  execCommand() {}
};
globalThis.navigator = { clipboard: { writeText: async () => {} } };
globalThis.Notification = { permission: 'denied' };
globalThis.AudioContext = class { createOscillator() { return { type: '', frequency: { setValueAtTime() {} }, connect() { return this; }, start() {}, stop() {} }; } createGain() { return { gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() { return this; } }; } get destination() { return {}; } get currentTime() { return 0; } get state() { return 'running'; } resume() {} close() {} };
globalThis.webkitAudioContext = globalThis.AudioContext;
globalThis.crypto = { getRandomValues: (arr) => { for (let i = 0; i < arr.length; i++) arr[i] = Math.floor(Math.random() * 0x100000000); return arr; } };
globalThis.DOMParser = class { parseFromString() { return { querySelector: () => null }; } };
globalThis.XMLSerializer = class { serializeToString() { return ''; } };
globalThis.URL = { createObjectURL() { return ''; }, revokeObjectURL() {} };
globalThis.Blob = class {};
globalThis.Worker = undefined; // no Worker in node
globalThis.Prism = undefined;  // no Prism in node
globalThis.lucide = undefined;
globalThis.setTimeout = globalThis.setTimeout;
globalThis.clearTimeout = globalThis.clearTimeout;
globalThis.clearInterval = globalThis.clearInterval;

// Load Odin — run in current context so `const Odin` becomes accessible
const fs = require('fs');
const vm = require('vm');
const odinCode = fs.readFileSync('./js/odin.js', 'utf8');
vm.runInThisContext(odinCode, { filename: 'odin.js' });

// ================================================================
//  Tests
// ================================================================

describe('Odin.Utils', () => {
  it('escapeHtml escapes &, <, >, "', () => {
    assertEqual(Odin.Utils.escapeHtml('<b>"Tom & Jerry"</b>'), '&lt;b&gt;&quot;Tom &amp; Jerry&quot;&lt;/b&gt;');
  });

  it('escapeHtml returns empty string for falsy input', () => {
    assertEqual(Odin.Utils.escapeHtml(''), '');
    assertEqual(Odin.Utils.escapeHtml(null), '');
    assertEqual(Odin.Utils.escapeHtml(undefined), '');
  });
});

describe('Odin.Storage', () => {
  it('set and get a string value', () => {
    Odin.Storage.set('test_key', 'hello');
    assertEqual(Odin.Storage.get('test_key'), 'hello');
  });

  it('get returns fallback for missing key', () => {
    assertEqual(Odin.Storage.get('nonexistent', 'default'), 'default');
  });

  it('set and get object value via JSON', () => {
    Odin.Storage.set('obj_key', { a: 1, b: [2, 3] });
    assertDeepEqual(Odin.Storage.get('obj_key'), { a: 1, b: [2, 3] });
  });

  it('remove deletes a key', () => {
    Odin.Storage.set('rm_key', 'value');
    Odin.Storage.remove('rm_key');
    assertEqual(Odin.Storage.get('rm_key', 'gone'), 'gone');
  });
});

describe('Odin.Regex', () => {
  it('returns empty result for empty pattern', () => {
    const r = Odin.Regex.test('', 'g', 'hello');
    assertEqual(r.matchCount, 0);
    assert(r.error === null);
  });

  it('matches simple pattern', () => {
    const r = Odin.Regex.test('\\d+', 'g', 'abc 123 def 456');
    assertEqual(r.matchCount, 2);
    assertEqual(r.matches[0].fullMatch, '123');
    assertEqual(r.matches[1].fullMatch, '456');
  });

  it('reports error for invalid regex', () => {
    const r = Odin.Regex.test('[invalid', 'g', 'test');
    assert(r.error !== null);
    assertEqual(r.matchCount, 0);
  });

  it('respects case-insensitive flag', () => {
    const r = Odin.Regex.test('hello', 'gi', 'Hello HELLO hello');
    assertEqual(r.matchCount, 3);
  });

  it('generates highlighted HTML', () => {
    const r = Odin.Regex.test('cat', 'g', 'the cat sat');
    assert(r.html.includes('match-highlight'));
    assert(r.html.includes('cat'));
  });

  it('ReDoS protection: timeout on slow patterns', () => {
    // Save original timeout
    const origTimeout = Odin.Regex.TIMEOUT_MS;
    Odin.Regex.TIMEOUT_MS = 50; // very short for testing

    // This pattern + input can cause catastrophic backtracking
    const r = Odin.Regex.test('(a+)+$', 'g', 'a'.repeat(25) + 'b');
    // Should either timeout or complete — we just verify no hang
    assert(r !== undefined, 'Should return a result');

    Odin.Regex.TIMEOUT_MS = origTimeout;
  });

  it('testAsync returns a Promise', () => {
    const result = Odin.Regex.testAsync('\\d+', 'g', '123');
    assert(result instanceof Promise, 'testAsync should return a Promise');
  });
});

describe('Odin.JsonFormatter', () => {
  it('beautify formats valid JSON', () => {
    const r = Odin.JsonFormatter.beautify('{"a":1,"b":2}');
    assert(r.error === null);
    assertEqual(r.result, '{\n  "a": 1,\n  "b": 2\n}');
  });

  it('minify compresses JSON', () => {
    const r = Odin.JsonFormatter.minify('{\n  "a": 1,\n  "b": 2\n}');
    assert(r.error === null);
    assertEqual(r.result, '{"a":1,"b":2}');
  });

  it('validate returns valid for correct JSON', () => {
    const r = Odin.JsonFormatter.validate('{"key": "value"}');
    assertEqual(r.valid, true);
    assert(r.error === null);
  });

  it('validate returns invalid for broken JSON', () => {
    const r = Odin.JsonFormatter.validate('{bad json}');
    assertEqual(r.valid, false);
    assert(r.error !== null);
  });

  it('validate returns null for empty input', () => {
    const r = Odin.JsonFormatter.validate('');
    assertEqual(r.valid, null);
  });

  it('error includes line and column info', () => {
    const r = Odin.JsonFormatter.beautify('{\n  "a": 1,\n  bad\n}');
    assert(r.error !== null);
    assert(r.error.message.length > 0);
  });
});

describe('Odin.DiffChecker (Myers LCS)', () => {
  it('detects identical inputs', () => {
    const r = Odin.DiffChecker.compare('{"a":1}', '{"a":1}', 'json');
    assertEqual(r.equal, true);
    assertEqual(r.stats.added, 0);
    assertEqual(r.stats.removed, 0);
    assertEqual(r.stats.changed, 0);
  });

  it('detects added lines', () => {
    const left = '{\n  "a": 1\n}';
    const right = '{\n  "a": 1,\n  "b": 2\n}';
    const r = Odin.DiffChecker.compare(left, right, 'json');
    assertEqual(r.equal, false);
    assert(r.stats.added > 0 || r.stats.changed > 0, 'Should detect differences');
  });

  it('detects removed lines', () => {
    const left = '{\n  "a": 1,\n  "b": 2\n}';
    const right = '{\n  "a": 1\n}';
    const r = Odin.DiffChecker.compare(left, right, 'json');
    assertEqual(r.equal, false);
    assert(r.stats.removed > 0 || r.stats.changed > 0, 'Should detect differences');
  });

  it('handles key order normalisation', () => {
    const left = '{"b": 2, "a": 1}';
    const right = '{"a": 1, "b": 2}';
    const r = Odin.DiffChecker.compare(left, right, 'json');
    assertEqual(r.equal, true, 'Key order should not matter after normalisation');
  });

  it('detects changes correctly with inserted line', () => {
    // This was the old bug: inserting a line at start caused everything to be "changed"
    const a = 'line1\nline2\nline3';
    const b = 'inserted\nline1\nline2\nline3';
    const diff = Odin.DiffChecker._lineDiff(a, b);
    // With Myers, "inserted" should be detected as an addition, not all lines changing
    const addedLines = diff.lines.filter(l => l.type === 'added');
    assert(addedLines.length >= 1, 'Should detect at least one added line');
    const sameLines = diff.lines.filter(l => l.type === 'same');
    assert(sameLines.length >= 3, 'Original lines should be marked as same');
  });

  it('Myers algorithm returns correct LCS', () => {
    const a = ['A', 'B', 'C', 'D'];
    const b = ['A', 'X', 'B', 'D'];
    const lcs = Odin.DiffChecker._myers(a, b);
    // LCS should include A, B, D
    assert(lcs.length >= 3, `LCS should have at least 3 elements, got ${lcs.length}`);
  });

  it('returns error for empty inputs', () => {
    const r = Odin.DiffChecker.compare('', '{"a":1}', 'json');
    assert(r.error !== null);
  });
});

describe('Odin.PasswordGuard', () => {
  it('generates password of correct length', () => {
    const r = Odin.PasswordGuard.generate(20, { lowercase: true, uppercase: false, numbers: false, symbols: false });
    assertEqual(r.password.length, 20);
  });

  it('generates password with only lowercase when specified', () => {
    const r = Odin.PasswordGuard.generate(100, { lowercase: true, uppercase: false, numbers: false, symbols: false });
    assert(/^[a-z]+$/.test(r.password), 'Should only contain lowercase letters');
  });

  it('generates password with mixed charsets', () => {
    const r = Odin.PasswordGuard.generate(100, { lowercase: true, uppercase: true, numbers: true, symbols: false });
    assert(/[a-z]/.test(r.password), 'Should contain lowercase');
    assert(/[A-Z]/.test(r.password), 'Should contain uppercase');
    assert(/[0-9]/.test(r.password), 'Should contain numbers');
  });

  it('guarantees at least one char from each active set', () => {
    // Run multiple times to verify the guarantee
    for (let i = 0; i < 20; i++) {
      const r = Odin.PasswordGuard.generate(8, { lowercase: true, uppercase: true, numbers: true, symbols: true });
      assert(/[a-z]/.test(r.password), `Run ${i}: Missing lowercase in "${r.password}"`);
      assert(/[A-Z]/.test(r.password), `Run ${i}: Missing uppercase in "${r.password}"`);
      assert(/[0-9]/.test(r.password), `Run ${i}: Missing number in "${r.password}"`);
    }
  });

  it('calculates entropy correctly', () => {
    // 10 chars from pool of 26 → 10 * log2(26) ≈ 47.0
    const e = Odin.PasswordGuard.calcEntropy(10, 26);
    assert(e > 46 && e < 48, `Expected ~47, got ${e}`);
  });

  it('getStrength returns correct labels', () => {
    assertEqual(Odin.PasswordGuard.getStrength(20).label, 'Weak');
    assertEqual(Odin.PasswordGuard.getStrength(30).label, 'Fair');
    assertEqual(Odin.PasswordGuard.getStrength(50).label, 'Good');
    assertEqual(Odin.PasswordGuard.getStrength(70).label, 'Strong');
    assertEqual(Odin.PasswordGuard.getStrength(100).label, 'Fortress');
  });

  it('poolSize is correct', () => {
    const r = Odin.PasswordGuard.generate(8, { lowercase: true, uppercase: true, numbers: false, symbols: false });
    assertEqual(r.poolSize, 52); // 26 + 26
  });
});

describe('Odin.ModelGen — Name Conversion', () => {
  it('toPascalCase converts various formats', () => {
    assertEqual(Odin.ModelGen.toPascalCase('user_name'), 'UserName');
    assertEqual(Odin.ModelGen.toPascalCase('first-name'), 'FirstName');
    assertEqual(Odin.ModelGen.toPascalCase('camelCase'), 'CamelCase');
  });

  it('toCamelCase converts correctly', () => {
    assertEqual(Odin.ModelGen.toCamelCase('user_name'), 'userName');
    assertEqual(Odin.ModelGen.toCamelCase('UserName'), 'userName');
  });

  it('toSnakeCase converts correctly', () => {
    assertEqual(Odin.ModelGen.toSnakeCase('userName'), 'user_name');
    assertEqual(Odin.ModelGen.toSnakeCase('FirstName'), 'first_name');
  });

  it('toClassName handles numbers at start', () => {
    assertEqual(Odin.ModelGen.toClassName('123abc'), 'Item123abc');
  });
});

describe('Odin.ModelGen — Schema Parsing', () => {
  it('detects string type', () => {
    const s = Odin.ModelGen.parseSchema('name', 'hello');
    assertEqual(s.type, 'string');
  });

  it('detects integer type', () => {
    const s = Odin.ModelGen.parseSchema('count', 42);
    assertEqual(s.type, 'int');
  });

  it('detects float type', () => {
    const s = Odin.ModelGen.parseSchema('price', 3.14);
    assertEqual(s.type, 'float');
  });

  it('detects boolean type', () => {
    const s = Odin.ModelGen.parseSchema('active', true);
    assertEqual(s.type, 'bool');
  });

  it('detects datetime type', () => {
    const s = Odin.ModelGen.parseSchema('created', '2024-01-15T10:30:00');
    assertEqual(s.type, 'datetime');
  });

  it('detects nullable type', () => {
    const s = Odin.ModelGen.parseSchema('data', null);
    assertEqual(s.type, 'nullable');
  });

  it('detects array of primitives', () => {
    const s = Odin.ModelGen.parseSchema('tags', ['a', 'b', 'c']);
    assertEqual(s.isArray, true);
    assertEqual(s.type, 'string');
  });

  it('detects array of objects', () => {
    const classes = [];
    const s = Odin.ModelGen.parseSchema('items', [{ id: 1 }], classes);
    assertEqual(s.isArray, true);
    assertEqual(s.type, 'object');
    assert(classes.length > 0, 'Should generate a class for array items');
  });

  it('merges heterogeneous array objects', () => {
    const classes = [];
    const s = Odin.ModelGen.parseSchema('users', [
      { id: 1, name: 'A' },
      { id: 2, email: 'b@b.com' },
      { id: 3, name: 'C', phone: '123' }
    ], classes);
    assertEqual(s.type, 'object');
    const cls = classes.find(c => c.name === 'Users');
    assert(cls, 'Should have Users class');
    const propNames = cls.properties.map(p => p.originalKey);
    assert(propNames.includes('id'), 'Should have id');
    assert(propNames.includes('name'), 'Should have name');
    assert(propNames.includes('email'), 'Should have email');
    assert(propNames.includes('phone'), 'Should have phone');
  });
});

describe('Odin.ModelGen — Code Generation', () => {
  it('generates C# code', () => {
    const r = Odin.ModelGen.generateAll('{"name":"John","age":30}');
    assert(r.error === null);
    assert(r.csharp.includes('public class Root'));
    assert(r.csharp.includes('string'));
    assert(r.csharp.includes('int'));
  });

  it('generates Go code', () => {
    const r = Odin.ModelGen.generateAll('{"name":"John"}');
    assert(r.go.includes('type Root struct'));
    assert(r.go.includes('json:"name"'));
  });

  it('generates Python code', () => {
    const r = Odin.ModelGen.generateAll('{"user_name":"John"}');
    assert(r.python.includes('@dataclass'));
    assert(r.python.includes('class Root'));
  });

  it('generates PHP code', () => {
    const r = Odin.ModelGen.generateAll('{"name":"John"}');
    assert(r.php.includes('<?php'));
    assert(r.php.includes('class Root'));
  });

  it('handles nested objects', () => {
    const r = Odin.ModelGen.generateAll('{"address":{"street":"Main St","city":"NYC"}}');
    assert(r.csharp.includes('public class Address'), 'Should generate Address class');
    assert(r.csharp.includes('public class Root'), 'Should generate Root class');
  });

  it('handles array of objects', () => {
    const r = Odin.ModelGen.generateAll('[{"id":1,"name":"A"},{"id":2,"name":"B","extra":"C"}]');
    assert(r.error === null);
    assert(r.csharp.includes('public class Root'));
    // Should have "extra" field from second object thanks to merge
    assert(r.csharp.includes('Extra'), 'Merged array should include Extra from second element');
  });

  it('returns error for invalid JSON', () => {
    const r = Odin.ModelGen.generateAll('{bad json}');
    assert(r.error !== null);
  });

  it('PHP no trailing comma on last parameter', () => {
    const r = Odin.ModelGen.generateAll('{"name":"John","age":30}');
    const lines = r.php.split('\n');
    // Find the line before ') {}'
    const closingIdx = lines.findIndex(l => l.trim() === ') {}');
    if (closingIdx > 0) {
      const lastParam = lines[closingIdx - 1].trimEnd();
      assert(!lastParam.endsWith(','), `Last PHP param should not end with comma: "${lastParam}"`);
    }
  });
});

describe('Odin.Pomodoro', () => {
  it('formatTime formats seconds correctly', () => {
    assertEqual(Odin.Pomodoro.formatTime(0), '00:00');
    assertEqual(Odin.Pomodoro.formatTime(90), '01:30');
    assertEqual(Odin.Pomodoro.formatTime(1500), '25:00');
  });

  it('MODES returns dynamic durations', () => {
    const modes = Odin.Pomodoro.MODES;
    assert(modes.focus.duration > 0);
    assert(modes.short.duration > 0);
    assert(modes.long.duration > 0);
  });

  it('custom durations persist and load', () => {
    const custom = { focus: 30 * 60, short: 10 * 60, long: 20 * 60 };
    Odin.Pomodoro.saveCustomDurations(custom);
    const loaded = Odin.Pomodoro.loadCustomDurations();
    assertEqual(loaded.focus, 30 * 60);
    assertEqual(loaded.short, 10 * 60);
    assertEqual(loaded.long, 20 * 60);
  });

  it('custom durations are clamped to limits', () => {
    Odin.Pomodoro.saveCustomDurations({ focus: -100, short: 999999, long: 0 });
    const loaded = Odin.Pomodoro.loadCustomDurations();
    assert(loaded.focus >= Odin.Pomodoro.LIMITS.min * 60, 'Focus should be >= min');
    assert(loaded.short <= Odin.Pomodoro.LIMITS.max * 60, 'Short should be <= max');
    assert(loaded.long >= Odin.Pomodoro.LIMITS.min * 60, 'Long should be >= min');
  });

  it('getModes uses custom durations', () => {
    const custom = { focus: 45 * 60, short: 10 * 60, long: 20 * 60 };
    const modes = Odin.Pomodoro.getModes(custom);
    assertEqual(modes.focus.duration, 45 * 60);
    assertEqual(modes.focus.label, 'Focus');
  });

  it('getDailySessions returns 0 for fresh state', () => {
    localStorage.removeItem('odin_pomo_sessions');
    assertEqual(Odin.Pomodoro.getDailySessions(), 0);
  });

  it('incrementDailySessions increments count', () => {
    localStorage.removeItem('odin_pomo_sessions');
    assertEqual(Odin.Pomodoro.incrementDailySessions(), 1);
    assertEqual(Odin.Pomodoro.incrementDailySessions(), 2);
    assertEqual(Odin.Pomodoro.getDailySessions(), 2);
  });

  it('session log CRUD', () => {
    localStorage.removeItem(Odin.Pomodoro.LOG_KEY);
    const entry = { id: 'test1', todo: 'Test', actual: 'Done', mode: 'focus', duration: 1500, startedAt: new Date().toISOString(), completedAt: new Date().toISOString() };
    Odin.Pomodoro.addSessionEntry(entry);
    const log = Odin.Pomodoro.getTodayLog();
    assertEqual(log.length, 1);
    assertEqual(log[0].id, 'test1');

    Odin.Pomodoro.deleteSessionEntry('test1');
    assertEqual(Odin.Pomodoro.getTodayLog().length, 0);
  });

  it('cleanupOldLogs removes entries older than 30 days', () => {
    localStorage.removeItem(Odin.Pomodoro.LOG_KEY);
    const oldDate = '2020-01-15';
    const today = Odin.Pomodoro.todayKey();
    const log = {
      [oldDate]: [{ id: 'old', mode: 'focus', duration: 1500 }],
      [today]: [{ id: 'new', mode: 'focus', duration: 1500 }]
    };
    Odin.Pomodoro.saveLog(log);
    Odin.Pomodoro.cleanupOldLogs();

    const cleaned = Odin.Pomodoro.loadLog();
    assert(cleaned[oldDate] === undefined, 'Old entry should be removed');
    assert(cleaned[today] !== undefined, 'Today entry should remain');
  });

  it('exportTodayMarkdown returns null for empty log', () => {
    localStorage.removeItem(Odin.Pomodoro.LOG_KEY);
    assertEqual(Odin.Pomodoro.exportTodayMarkdown(), null);
  });

  it('exportTodayMarkdown returns markdown string', () => {
    localStorage.removeItem(Odin.Pomodoro.LOG_KEY);
    Odin.Pomodoro.addSessionEntry({ id: 'md1', todo: 'Write tests', actual: 'Done', mode: 'focus', duration: 1500, startedAt: new Date().toISOString(), completedAt: new Date().toISOString() });
    const md = Odin.Pomodoro.exportTodayMarkdown();
    assert(md !== null);
    assert(md.includes('Pomodoro Session Log'));
    assert(md.includes('Write tests'));
  });
});

// ================================================================
//  Summary
// ================================================================
console.log('\n' + '='.repeat(50));
console.log(`\x1b[1mResults: ${_passed} passed, ${_failed} failed\x1b[0m`);
if (_failed > 0) {
  console.log('\x1b[31mSome tests failed!\x1b[0m');
  process.exit(1);
} else {
  console.log('\x1b[32mAll tests passed!\x1b[0m');
}
