## 2024-05-24 - DOM XSS via Unsafe innerHTML Injection in Error Handlers
**Vulnerability:** Cross-Site Scripting (XSS) via `innerHTML` when displaying error messages from third-party libraries (e.g., `qrcode-generator`).
**Learning:** This codebase frequently uses `innerHTML` for DOM manipulation. When handling exceptions from external libraries, the error message itself might contain reflected user input. Directly injecting this error message into the DOM creates an XSS vulnerability, even if the primary input was perceived as "safe" or just destined for a functional component like a QR code generator.
**Prevention:** Always use `Odin.Utils.escapeHtml()` when interpolating dynamic data or error messages into template strings used with `innerHTML`, or prefer using `textContent` for inserting untrusted text.

## $(date +%Y-%m-%d) - Incomplete HTML Escaping in Alpine.js `x-html` Directives
**Vulnerability:** Cross-Site Scripting (XSS) due to incomplete escaping of single quotes (`'`) in the `Odin.Utils.escapeHtml` utility.
**Learning:** The application heavily relies on Alpine.js and frequently uses the `x-html` directive to render content, including attributes and user input. The existing `escapeHtml` function missed escaping single quotes, allowing attackers to inject malicious payloads into HTML attributes enclosed in single quotes.
**Prevention:** Ensure that all HTML escaping utilities comprehensively cover all critical characters, including `&`, `<`, `>`, `"`, and `'`. Regularly review custom escaping functions against established security standards and test them with various payload permutations.
