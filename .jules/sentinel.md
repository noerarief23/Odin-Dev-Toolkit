## 2025-02-18 - Cryptographically Secure Random ID Generation
**Vulnerability:** Pseudo-random ID generation using `Math.random()` and `Date.now()` within the Pomodoro tracker component (`pomoSaveSession`).
**Learning:** Even for client-side non-sensitive features like Pomodoro IDs, using `Math.random()` creates predictable patterns. It is important to utilize available Web Crypto API wrappers consistently across the entire toolkit when generating unique identifiers to maintain a secure baseline.
**Prevention:** Always use `crypto.randomUUID()` or Web Crypto API based functions (`Odin.UUID.generate()`) instead of `Math.random()` for any form of unique ID generation or token creation.
## 2024-05-24 - DOM XSS via Unsafe innerHTML Injection in Error Handlers
**Vulnerability:** Cross-Site Scripting (XSS) via `innerHTML` when displaying error messages from third-party libraries (e.g., `qrcode-generator`).
**Learning:** This codebase frequently uses `innerHTML` for DOM manipulation. When handling exceptions from external libraries, the error message itself might contain reflected user input. Directly injecting this error message into the DOM creates an XSS vulnerability, even if the primary input was perceived as "safe" or just destined for a functional component like a QR code generator.
**Prevention:** Always use `Odin.Utils.escapeHtml()` when interpolating dynamic data or error messages into template strings used with `innerHTML`, or prefer using `textContent` for inserting untrusted text.

## $(date +%Y-%m-%d) - Incomplete HTML Escaping in Alpine.js `x-html` Directives
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
