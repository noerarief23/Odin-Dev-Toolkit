## 2025-02-18 - Cryptographically Secure Random ID Generation
**Vulnerability:** Pseudo-random ID generation using `Math.random()` and `Date.now()` within the Pomodoro tracker component (`pomoSaveSession`).
**Learning:** Even for client-side non-sensitive features like Pomodoro IDs, using `Math.random()` creates predictable patterns. It is important to utilize available Web Crypto API wrappers consistently across the entire toolkit when generating unique identifiers to maintain a secure baseline.
**Prevention:** Always use `crypto.randomUUID()` or Web Crypto API based functions (`Odin.UUID.generate()`) instead of `Math.random()` for any form of unique ID generation or token creation.
## 2024-05-24 - DOM XSS via Unsafe innerHTML Injection in Error Handlers
**Vulnerability:** Cross-Site Scripting (XSS) via `innerHTML` when displaying error messages from third-party libraries (e.g., `qrcode-generator`).
**Learning:** This codebase frequently uses `innerHTML` for DOM manipulation. When handling exceptions from external libraries, the error message itself might contain reflected user input. Directly injecting this error message into the DOM creates an XSS vulnerability, even if the primary input was perceived as "safe" or just destined for a functional component like a QR code generator.
**Prevention:** Always use `Odin.Utils.escapeHtml()` when interpolating dynamic data or error messages into template strings used with `innerHTML`, or prefer using `textContent` for inserting untrusted text.

## 2026-07-08 - Incomplete HTML Escaping in Alpine.js `x-html` Directives
**Vulnerability:** Cross-Site Scripting (XSS) due to incomplete escaping of single quotes (`'`) in the `Odin.Utils.escapeHtml` utility.
**Learning:** The application heavily relies on Alpine.js and frequently uses the `x-html` directive to render content, including attributes and user input. The existing `escapeHtml` function missed escaping single quotes, allowing attackers to inject malicious payloads into HTML attributes enclosed in single quotes.
**Prevention:** Ensure that all HTML escaping utilities comprehensively cover all critical characters, including `&`, `<`, `>`, `"`, and `'`. Regularly review custom escaping functions against established security standards and test them with various payload permutations.
## 2024-05-24 - Unescaped Single Quotes in Escape Function
**Vulnerability:** The custom `Odin.Utils.escapeHtml` function failed to sanitize single quotes (`'`), leaving potential vectors for attribute-based Cross-Site Scripting (XSS).
**Learning:** Custom HTML sanitization functions often overlook single quotes because double quotes are more common for attributes. However, if rendered output ever makes its way into single-quoted HTML attributes, it creates an XSS vulnerability.
**Prevention:** Always use comprehensive standard library escaping, or if implementing custom escaping, ensure that all critical HTML control characters (`&`, `<`, `>`, `"`, `'`) are correctly converted to their safe entity equivalents (`&#39;` for `'`).
## 2024-05-24 - Unescaped Single Quotes in Escape Function
**Vulnerability:** The custom `Odin.Utils.escapeHtml` function failed to sanitize single quotes (`'`), leaving potential vectors for attribute-based Cross-Site Scripting (XSS).
**Learning:** Custom HTML sanitization functions often overlook single quotes because double quotes are more common for attributes. However, if rendered output ever makes its way into single-quoted HTML attributes, it creates an XSS vulnerability.
**Prevention:** Always use comprehensive standard library escaping, or if implementing custom escaping, ensure that all critical HTML control characters (`&`, `<`, `>`, `"`, `'`) are correctly converted to their safe entity equivalents (`&#39;` for `'`).

## 2024-05-24 - Unescaped XSS via Exception Messages
**Vulnerability:** Cross-Site Scripting (XSS) due to rendering unescaped error messages (`e.message`) via Alpine.js `x-html` directives.
**Learning:** Error messages thrown during data parsing (like `JSON.parse`) can reflect untrusted user input directly into the `e.message` string. Using this error string dynamically in the DOM (e.g. via innerHTML or x-html) creates an XSS vulnerability.
**Prevention:** Always wrap variables containing error messages with an HTML escaping utility (e.g., `Odin.Utils.escapeHtml`) before inserting them into an HTML-rendering context.
## 2026-07-06 - Incomplete ReDoS Protection via Execution Timeouts
**Vulnerability:** Regular Expression Denial of Service (ReDoS) despite timeout protection loops.
**Learning:** When evaluating regular expressions in JavaScript, loop-level timeout checks (e.g., checking `Date.now()` between `matchAll` iterations) do not fully protect against ReDoS because catastrophic backtracking on a single match can still hang the main thread indefinitely.
**Prevention:** Provide defense-in-depth by explicitly capping the length of both the regex pattern (e.g., 500 chars) and the test string (e.g., 50,000 chars) before execution.
## 2026-06-24 - Prism.js Partial Escaping XSS Vulnerability
**Vulnerability:** XSS via unescaped HTML characters in `Prism.highlight` output.
**Learning:** Prism tokenizes input and returns HTML `<span>` tags, but it *does not* automatically HTML-escape characters that fail to match any grammar tokens. Attempting to escape the string *before* passing it to Prism breaks tokenization. Therefore, the raw output of `Prism.highlight` must be sanitized post-generation.
**Prevention:** When injecting `Prism.highlight` output into `innerHTML` or Alpine's `x-html`, run the output through a sanitization function that escapes all tags except the `<span>` tags generated by Prism (e.g., `highlighted.replace(/<\/?(?!span\b|\/span\b)[^>]*>/gi, match => escapeHtml(match))`).
## 2026-07-08 - Unbounded Array and Canvas Allocation
**Vulnerability:** Client-Side Denial of Service (DoS) due to unbounded Web Storage parameters parsed into numeric values (`pwLength` and `qrSize`).
**Learning:** Even in entirely local, client-side PWAs, values retrieved from Web Storage (like `sessionStorage` or `localStorage`) must be treated as untrusted user input. If these values are used to dynamically size arrays (e.g., `new Uint32Array(length)`) or DOM elements (e.g., Canvas dimensions), an attacker who can manipulate local storage can crash the application or exhaust system memory.
**Prevention:** Always validate and tightly bound these values (e.g., via `Math.max(MIN, Math.min(MAX, val))`) before using them in operations prone to Denial of Service, such as memory allocation or Canvas sizing.
## 2026-07-08 - Unbounded Array Allocation Client-Side DoS
**Vulnerability:** Client-Side Denial of Service (DoS) due to unbounded array allocation in `Odin.PasswordGuard.generate(length, options)`.
**Learning:** If an input used for sizing memory allocations (e.g., `new Uint32Array(length)`) is read directly from unvalidated sources (like `sessionStorage` or URL parameters), an attacker or user error can trigger massive memory allocation, hanging or crashing the browser tab.
**Prevention:** Always validate and tightly bound numeric inputs used for iterations or memory allocations (e.g., using `Math.max(MIN, Math.min(MAX, parseInt(val)))`).

## 2024-05-24 - Prevent Persistent Client-Side DoS from Unbounded Numeric Storage
**Vulnerability:** Unbounded numeric parameters (`pwLength`, `qrSize`) were retrieved from `sessionStorage` and passed directly into memory-allocating functions (like `new Uint32Array(length)` or Canvas sizing). A malicious or malformed large value in storage could cause a persistent client-side Denial of Service (DoS) by consistently crashing or freezing the app on load for that user.
**Learning:** Even entirely local, client-side tools that retrieve configurations from Web Storage must treat those stored values as untrusted user input, especially when used for memory allocation or expensive iterations.
**Prevention:** Always validate and tightly bound numeric inputs loaded from storage (e.g., using `Math.max(MIN, Math.min(MAX, val))`) before applying them to application state or passing them to generation logic.

## 2024-10-24 - [Fix Canvas API DoS via Unbounded Inputs]
**Vulnerability:** Unbounded numeric inputs (`imgScale` and `imgQuality`) in the Image Shrink tool allowed users to set extremely large canvas sizes, triggering massive memory allocations in the browser and causing client-side Denial of Service (DoS) / tab crashes.
**Learning:** Client-side features using HTML5 Canvas or generating objects dynamically based on user input for iterations or dimensions are susceptible to client-side DoS if those inputs are not strictly validated and bounded. Memory allocations via Canvas size configuration can quickly overwhelm browser limits.
**Prevention:** Always validate and bound inputs derived from untrusted user actions using `Math.max(MIN, Math.min(MAX, value))` or similar clamping functions, especially before using them in operations prone to memory allocation, such as Array construction, loop iterations, or Canvas sizing.
## 2025-07-06 - XSS via un-tokenized content in PrismJS
**Vulnerability:** PrismJS `.highlight()` does not escape characters that do not match the target language grammar. When the raw output is directly assigned to `innerHTML` or `x-html`, any un-tokenized HTML tags (like `<img onerror=alert(1)>` in JSON or XML input) will be rendered and executed, leading to XSS.
**Learning:** Syntax highlighters are designed to apply styling, not to sanitize HTML. While matched tokens are safely encoded, leftover unrecognized characters bypass standard encoding mechanisms.
**Prevention:** Always sanitize the output of PrismJS before injecting it into the DOM. A safe approach is to split the output by `/(<\/?span[^>]*>)/i` and manually escape `<` and `>` in the text portions, preserving the `<span>` tags.

## 2025-02-18 - ReDoS via Unbounded RegExp Split with Negative Lookahead
**Vulnerability:** Regular Expression Denial of Service (ReDoS) in the YAML tool's JSONPath parsing (`Odin.YAML._evalPath`) due to `.split(/\.(?![^\[]*\])/)` combined with unbounded input length.
**Learning:** Using complex regular expressions containing lookaheads/lookbehinds, especially on untrusted unbounded input, can lead to catastrophic backtracking. The execution time of `path.split(/\.(?![^\[]*\])/)` grows exponentially on inputs like `.a.a.a.a...[`.
**Prevention:** Implement defense-in-depth by explicitly bounding the length of string inputs passed to complex regular expressions (e.g. `if (path.length > 1000) throw ...`) to prevent browser tab freezes and DoS.

## 2026-07-08 - Fix Canvas API DoS via Unbounded Target Dimensions
**Vulnerability:** Unbounded target image dimensions in `Odin.ImageShrink.processImage` allowed maliciously large image processing that could exceed safe Canvas allocations and cause client-side Denial of Service (DoS).
**Learning:** Even though the image inputs `imgScale` and `imgQuality` were validated against bounds, the logic scaled the source image's `naturalWidth` and `naturalHeight` by `scale`. If a source image had an extremely large dimension (e.g., decompression bombs or artificially large resolution), setting `canvas.width` and `canvas.height` to the scaled unbounded dimensions would exceed safe bounds and crash memory/tabs.
**Prevention:** Always explicitly bound resulting target dimensions directly before Canvas allocation, using a maximum acceptable limit (e.g., 16384 pixels) to scale the aspect ratio down safely.

## 2025-02-19 - Ensure Strict UTF-8 Decoding for Base64 Strings
**Vulnerability:** Silent substitution of invalid UTF-8 sequences in JWT payload decoding due to missing `{ fatal: true }` option in `TextDecoder`.
**Learning:** By default, `TextDecoder` silently replaces invalid UTF-8 byte sequences with the replacement character (`\uFFFD`). This swallows encoding errors and allows malformed UTF-8 payloads to be processed without throwing an exception, potentially masking manipulation or leading to unexpected application states downstream.
**Prevention:** Always pass `{ fatal: true }` as the second argument when using `new TextDecoder('utf-8', ...)` to decode untrusted data, ensuring that invalid byte sequences explicitly throw errors and are handled correctly by `catch` blocks.
## 2026-07-08 - Algorithmic DoS via Unbounded Inputs in LCS Algorithm
**Vulnerability:** Client-Side Algorithmic Denial of Service (DoS) due to unbounded input length in the `Odin.DiffChecker` Myers LCS implementation.
**Learning:** The Myers Longest Common Subsequence (LCS) algorithm has an $O(ND)$ time and space complexity, where $N$ is the length of the strings and $D$ is the number of differences. If unbounded string inputs (e.g., 5MB of text) are passed to `Odin.DiffChecker`, the algorithm will allocate massive arrays and perform intensive computations, freezing the main browser thread indefinitely and leading to a client-side DoS.
**Prevention:** Always explicitly bound the length of input strings before passing them to algorithms with non-linear time or space complexity (e.g., limit inputs to 250,000 characters for diff checks).

## 2026-07-08 - ReDoS/DoS via Unbounded RegExp on Single Strings
**Vulnerability:** Regular Expression Denial of Service (ReDoS) and massive array allocation DoS due to an unbounded `text.match(...)` operation in `Odin.CaseConverter`.
**Learning:** While regex timeout loops exist in other parts of the application, single-pass native regex operations (like `String.prototype.match`) on unbounded untrusted input can still hang the main thread via catastrophic backtracking or exhaust memory by allocating a massive array of matches (e.g., an array of 5,000,000 single-character tokens).
**Prevention:** Explicitly bound the length of strings before running complex or global regular expressions (e.g., `if (text.length > 50000) throw new Error(...)`). Instead of silently truncating the input (which causes functional data-loss regressions), throw a clear error that the caller can catch and gracefully handle.
