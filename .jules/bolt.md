## 2024-05-18 - String Manipulation Performance
**Learning:** In Javascript, using \`text.indexOf('\\n')\` in a loop to count occurrences is significantly faster (up to ~3-4x) than using the \`text.match(/\\n/g).length\` Regex method, especially for very large strings (e.g., 50k+ lines). Additionally, constructing long string sequences (like line numbers) using \`Array.from().join()\` has high memory allocation overhead; memoizing these repetitive string operations with an LRU cache significantly prevents main-thread blocking operations.
**Action:** Always prefer \`indexOf\` loops over Regex when counting single characters in long strings. Implement LRU caches for repetitive string allocations (like sequential line numbers) to improve code editor performance in frontend applications.

## 2024-05-18 - Buffer to Base64 Performance
**Learning:** Using a single character concatenation loop (`binary += String.fromCharCode(bytes[i])`) to convert an ArrayBuffer to a binary string before `btoa` encoding is extremely slow for large files (e.g. 5MB) and blocks the main thread. Directly using `String.fromCharCode.apply(null, bytes)` causes "Maximum Call Stack Size Exceeded" for large arrays. Chunking the array (e.g. using 32KB chunks `0x8000`) and applying `String.fromCharCode.apply` per chunk provides an massive speedup (~4x-10x) while avoiding call stack limits.
**Action:** When converting large ArrayBuffers/Uint8Arrays to strings, always chunk the data and use `String.fromCharCode.apply` rather than iterating and appending characters individually.

## 2024-05-18 - Case Converter Word Extraction
**Learning:** In Javascript, using a series of `.replace()` calls to insert spaces and normalize text, followed by `.split()` and `.filter()`, is slow and memory-intensive because each step allocates a new intermediate string. Extracting words directly using a single `.match(/[a-zA-Z0-9]+/g) || []` is functionally equivalent for word extraction and significantly faster (~50% execution time reduction) as it avoids all intermediate allocations.
**Action:** When extracting tokens or words from a string, favor direct `.match()` patterns over a pipeline of `.replace()`, `.trim()`, and `.split()` methods whenever possible to minimize memory allocations and improve performance.

## 2024-06-25 - HTML Escaping Performance
**Learning:** Using chained `.replace()` calls with regular expressions for HTML escaping requires traversing the string multiple times and allocates multiple intermediate strings in memory, causing significant overhead. Using an early-exit `.indexOf()` check combined with a single-pass iteration (`charCodeAt`) avoids intermediate memory allocations and provides a massive performance boost (up to 4-5x faster).
**Action:** When performing multiple string replacements on a hot path (like escaping characters), favor single-pass traversal loops and early-exit checks over chained regular expressions.

## 2024-06-25 - Array Buffer Encoding Fix
**Learning:** We previously learned to use `String.fromCharCode.apply` with chunks for encoding `Uint8Array` to a binary string, as documented in memory. When implementing this, using `.slice()` is generally safer and more compatible than `.subarray()`, because `.slice()` works on both standard JavaScript arrays and TypedArrays, whereas `.subarray()` is exclusive to TypedArrays and `.byteLength` is exclusive to ArrayBuffers/TypedArrays.
**Action:** When applying the chunking optimization for arrays, favor `bytes.length` and `bytes.slice()` to ensure compatibility if a regular Array of numbers is passed instead of a strict TypedArray.
## 2025-01-20 - JWT Base64 Decoding Fallback Edge Case
**Learning:** When optimizing Base64 decoding in JWT payloads by swapping `decodeURIComponent` for `new TextDecoder()`, you must pass the `{ fatal: true }` option. Otherwise, `TextDecoder` will silently replace invalid characters instead of throwing an error, breaking the fallback behavior intended for invalid inputs.
**Action:** Always verify error-throwing behavior when replacing built-in parsers with `TextDecoder`. Use `{ fatal: true }` to maintain parity with `decodeURIComponent`'s URIError.

## 2024-06-29 - Regex Match vs Replace Pipeline Performance
**Learning:** In Javascript, extracting words from CamelCase/PascalCase/snake_case strings using a pipeline of `.replace(/([a-z])([A-Z])/g, '$1 $2')` followed by `.match(/[a-zA-Z0-9]+/g)` is significantly slower (~75% more execution time) than extracting words directly using a single well-crafted `.match(/[A-Z]+(?![a-z])|[A-Z]?[a-z0-9]+/g)` call. The pipeline approach forces the JavaScript engine to allocate multiple intermediate strings and perform multi-pass scanning, whereas the single `.match()` avoids intermediate allocations completely.
**Action:** When extracting tokens or words from a string, favor direct `.match()` patterns over a pipeline of `.replace()`, `.trim()`, and `.split()` methods whenever possible to minimize memory allocations and heavily improve performance.
