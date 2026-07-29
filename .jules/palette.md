## 2026-07-29 - Make hidden file inputs accessible
**Learning:** Custom file dropzones that hide the actual `<input type="file">` element break keyboard accessibility if the visible wrapper isn't made focusable and interactive.
**Action:** When implementing custom file dropzones, add `tabindex="0"`, `role="button"`, an `aria-label`, and keyboard event handlers (like `@keydown.enter.prevent` and `@keydown.space.prevent`) to the visible wrapper element, and ensure it has a CSS `:focus-visible` state.
