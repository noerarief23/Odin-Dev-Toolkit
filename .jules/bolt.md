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

## 2024-07-26 - JWT Base64 Decoding Performance
**Learning:** In Javascript, mapping each character of a large Base64 decoded string to a URI component hex string via `.split('').map().join('')` before calling `decodeURIComponent` causes massive intermediate memory allocations and blocks the main thread. Using a `Uint8Array` initialized from `atob` and directly decoding it using `new TextDecoder().decode()` completely bypasses these intermediate allocations and provides a >20x speedup for large JWT payloads.
**Action:** When decoding large Base64-encoded strings (especially JSON payloads like in JWTs), construct a `Uint8Array` from the binary string and decode it with `TextDecoder` rather than concatenating escaped characters for `decodeURIComponent`.
## 2024-06-25 - Array Buffer Encoding Fix
**Learning:** We previously learned to use `String.fromCharCode.apply` with chunks for encoding `Uint8Array` to a binary string, as documented in memory. When implementing this, using `.slice()` is generally safer and more compatible than `.subarray()`, because `.slice()` works on both standard JavaScript arrays and TypedArrays, whereas `.subarray()` is exclusive to TypedArrays and `.byteLength` is exclusive to ArrayBuffers/TypedArrays.
**Action:** When applying the chunking optimization for arrays, favor `bytes.length` and `bytes.slice()` to ensure compatibility if a regular Array of numbers is passed instead of a strict TypedArray.
## 2025-01-20 - JWT Base64 Decoding Fallback Edge Case
**Learning:** When optimizing Base64 decoding in JWT payloads by swapping `decodeURIComponent` for `new TextDecoder()`, you must pass the `{ fatal: true }` option. Otherwise, `TextDecoder` will silently replace invalid characters instead of throwing an error, breaking the fallback behavior intended for invalid inputs.
**Action:** Always verify error-throwing behavior when replacing built-in parsers with `TextDecoder`. Use `{ fatal: true }` to maintain parity with `decodeURIComponent`'s URIError.

## 2024-06-29 - Regex Match vs Replace Pipeline Performance
**Learning:** In Javascript, extracting words from CamelCase/PascalCase/snake_case strings using a pipeline of `.replace(/([a-z])([A-Z])/g, '$1 $2')` followed by `.match(/[a-zA-Z0-9]+/g)` is significantly slower (~75% more execution time) than extracting words directly using a single well-crafted `.match(/[A-Z]+(?![a-z])|[A-Z]?[a-z0-9]+/g)` call. The pipeline approach forces the JavaScript engine to allocate multiple intermediate strings and perform multi-pass scanning, whereas the single `.match()` avoids intermediate allocations completely.
**Action:** When extracting tokens or words from a string, favor direct `.match()` patterns over a pipeline of `.replace()`, `.trim()`, and `.split()` methods whenever possible to minimize memory allocations and heavily improve performance.
## 2024-05-24 - Case Conversion Token Extraction Optimization
**Learning:** Using multiple intermediate `.replace()` calls to insert spaces before splitting/matching tokens creates large intermediate string allocations that heavily block the main thread and impact performance.
**Action:** Favor direct `.match()` patterns like `/[A-Z]+(?![a-z])|[A-Z]?[a-z0-9]+/g` to extract tokens in a single pass without intermediate allocations.
## 2025-01-20 - Byte-to-Hex String Conversion Overhead
**Learning:** Using `Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('')` for converting large byte arrays or binary strings to hex strings is significantly slow due to high intermediate memory allocation (arrays, strings) and closure overhead per byte.
**Action:** Always favor a single-pass `for` loop with a precomputed 256-element hex string lookup map (`_hexMap[byte]`) for ~10x performance improvements when converting bytes to hex.

## 2024-08-01 - Array to Hex Conversion Performance
**Learning:** Using `Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('')` for byte array to hex string conversion creates significant performance overhead due to closure allocation and intermediate array creation. Precomputing a 256-element lookup map (`_hexMap`) and iterating over the bytes with a simple `for` loop to concatenate strings provides an enormous speedup (~10x faster) and avoids unnecessary allocations.
**Action:** Always prefer a precomputed lookup map and a simple `for` loop for `Uint8Array` to Hex conversions, especially in hot paths like UUID generation or Hash formatting.
## 2024-05-25 - Object Iteration Performance
**Learning:** When iterating over object properties in performance-critical code paths (like merging arrays of large objects), using `Object.entries()` creates significant memory garbage because it dynamically allocates an array of `[key, value]` arrays.
**Action:** Prefer a traditional `for...in` loop combined with an `Object.prototype.hasOwnProperty.call()` check over `Object.entries()` to avoid intermediate array allocations and massively reduce execution time (~2x speedup for large objects).

## 2024-07-06 - [Avoid closure and intermediate array allocation in tight iterations]
**Learning:** Using `Array.prototype.forEach` and `Object.entries().forEach()` inside heavily recursive serialization logic (like JSON to YAML conversion) causes noticeable performance bottlenecks due to intermediate array allocations (`[key, value]`) and callback function closure overhead.
**Action:** When writing performance-sensitive iterative code, use traditional `for` loops for arrays and `for...in` loops (with `hasOwnProperty.call()`) for objects to dramatically reduce memory pressure and execution time.

## 2024-05-18 - Case Conversion Delegation
**Learning:** `Odin.ModelGen` previously duplicated the case conversion logic from `Odin.CaseConverter`, but used an older, slower method involving multiple `replace().split()` calls. Using a single `match()` regex as seen in `Odin.CaseConverter` significantly reduces intermediate string allocations.
**Action:** Always delegate case conversion utilities to the highly optimized `Odin.CaseConverter` rather than reimplementing them, improving both performance and code reuse.

## 2025-01-20 - Object Entries Memory Allocation in JSON Parsing
**Learning:** Using `Object.entries()` inside recursive parsing logic (such as generating code from large JSON objects in `Odin.ModelGen._parseObject`) causes significant performance bottlenecks because it dynamically allocates a new intermediate array `[key, value]` for every property iterated. For large schemas or deep objects, this creates severe memory garbage and execution overhead.
**Action:** Always replace `Object.entries()` with a traditional `for...in` loop and an explicit `Object.prototype.hasOwnProperty.call(obj, key)` check in performance-critical iteration paths to eliminate the intermediate array allocations and improve execution speed.
## 2025-01-20 - Object Sorting Performance via Traditional Loops
**Learning:** In heavily recursive object sorting functions like `_sortObject`, using `Array.prototype.map()` and `Array.prototype.reduce()` introduces significant closure overhead and intermediate allocation. Replacing them with pre-allocated arrays and traditional `for` loops avoids this overhead, dramatically speeding up recursive traversal (measured ~2.6x faster).
**Action:** When writing performance-sensitive recursive object traversal/sorting, favor traditional `for` loops over array iteration methods (`map`/`reduce`) to eliminate closure allocation and function call overhead.

## 2026-07-09 - Prism HTML Sanitization Optimization
**Learning:** Using chained `.replace(/</g, '&lt;').replace(/>/g, '&gt;')` calls inside loops for sanitizing Prism HTML string fragments creates massive performance overhead due to intermediate string and regex allocations. Using an early-exit `indexOf` check to avoid the string splitting step altogether if there are no angle brackets, combined with a single-pass string iteration (`charCodeAt`) for the replacement logic, dramatically speeds up sanitization (often ~40-50% faster) and prevents UI blocking on large code snippets.
**Action:** When performing HTML escaping or replacements within high-frequency loops, favor early-exit checks and single-pass iteration loops over chained `.replace()` regexes to minimize string allocations and overhead.

## 2025-01-20 - HTML Rendering Array Allocation Overhead
**Learning:** Using chained `.map().join('')` for generating large HTML strings (such as in `Odin.DiffChecker._renderDiff`) is significantly slow due to intermediate array allocations and closure overhead per item.
**Action:** Always favor a traditional `for` loop with string concatenation (`+=`) when rendering large lists of UI elements or HTML strings dynamically to avoid intermediate allocations and speed up render time.
