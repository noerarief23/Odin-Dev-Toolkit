## 2026-07-28 - Keyboard Accessible Custom File Inputs
**Learning:** Custom file inputs and dropzones implemented with a hidden `<input type="file">` inside a `<div>` or `<label>` are inaccessible to keyboard navigators, as `display: none` removes the input from the tab order.
**Action:** Always add `tabindex="0"`, `role="button"`, `aria-label`, and keyboard handlers (`@keydown.enter`, `@keydown.space`) to the custom container or label to restore keyboard accessibility.
## 2024-05-24 - Restore keyboard accessibility for custom Alpine.js file dropzones
**Learning:** When implementing custom file dropzones or file inputs in Alpine.js where the actual `<input type="file">` is visually hidden (e.g., using `class="hidden"` or `display: none`), the element loses keyboard focusability and interaction, making it inaccessible to keyboard users.
**Action:** Restore keyboard accessibility by adding `tabindex="0"`, `role="button"`, an `aria-label`, and keyboard event handlers (like `@keydown.enter.prevent` and `@keydown.space.prevent`) to the visible wrapper element so it programmatically clicks the hidden input, and ensure the wrapper has a CSS `:focus-visible` state.
## 2024-08-07 - Keyboard Accessibility for Hidden File Inputs
**Learning:** When implementing custom file dropzones or file inputs in Alpine.js where the actual <input type="file"> is visually hidden (e.g., using class="hidden"), it completely removes keyboard accessibility for the input.
**Action:** Restore keyboard accessibility by adding tabindex="0", role="button", an aria-label, and keyboard event handlers (@keydown.enter.prevent and @keydown.space.prevent) to the visible wrapper element so it programmatically clicks the hidden input, and ensure the wrapper has a CSS :focus-visible state.
