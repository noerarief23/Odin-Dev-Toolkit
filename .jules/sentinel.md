## 2025-02-18 - Cryptographically Secure Random ID Generation
**Vulnerability:** Pseudo-random ID generation using `Math.random()` and `Date.now()` within the Pomodoro tracker component (`pomoSaveSession`).
**Learning:** Even for client-side non-sensitive features like Pomodoro IDs, using `Math.random()` creates predictable patterns. It is important to utilize available Web Crypto API wrappers consistently across the entire toolkit when generating unique identifiers to maintain a secure baseline.
**Prevention:** Always use `crypto.randomUUID()` or Web Crypto API based functions (`Odin.UUID.generate()`) instead of `Math.random()` for any form of unique ID generation or token creation.
