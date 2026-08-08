## 2024-08-02 - Accessible Hidden File Inputs
**Learning:** Native `<input type="file">` elements that are hidden (via `display: none` or Tailwind's `.hidden`) lose all focusability and keyboard interactivity, preventing keyboard-only users from triggering file selection dialogs.
**Action:** When creating custom file dropzones or upload buttons that wrap hidden inputs, always explicitly restore accessibility on the wrapper element by adding `tabindex="0"`, `role="button"`, an appropriate `aria-label`, and explicit keyboard event handlers (like `@keydown.enter.prevent` and `@keydown.space.prevent`) to programmatically click the hidden input.
## 2026-08-01 - Accessible Custom Dropzones
**Learning:** When using visually hidden file inputs (`display: none`) for custom drag-and-drop zones, keyboard accessibility is completely lost, leaving keyboard-only users unable to upload files.
**Action:** Always add `tabindex="0"`, `role="button"`, an `aria-label`, and explicit keyboard event handlers (like enter and space) to the visible dropzone wrapper to programmatically click the hidden input.
## 2026-07-30 - [Keyboard Accessibility for Visually Hidden File Inputs]
**Learning:** When using visually hidden `<input type="file">`, keyboard users (using Tab) cannot naturally focus and activate the input if its wrapper lacks focusability and keyboard event handlers.
**Action:** Add `tabindex="0"`, `role="button"`, an `aria-label`, and explicit keyboard event handlers (like `@keydown.enter.prevent` and `@keydown.space.prevent`) to the visible wrapper element, and ensure it has a `:focus-visible` outline state.
## 2026-07-29 - Make hidden file inputs accessible
**Learning:** Custom file dropzones that hide the actual `<input type="file">` element break keyboard accessibility if the visible wrapper isn't made focusable and interactive.
**Action:** When implementing custom file dropzones, add `tabindex="0"`, `role="button"`, an `aria-label`, and keyboard event handlers (like `@keydown.enter.prevent` and `@keydown.space.prevent`) to the visible wrapper element, and ensure it has a CSS `:focus-visible` state.
## 2026-07-28 - Keyboard Accessible Custom File Inputs
**Learning:** Custom file inputs and dropzones implemented with a hidden `<input type="file">` inside a `<div>` or `<label>` are inaccessible to keyboard navigators, as `display: none` removes the input from the tab order.
**Action:** Always add `tabindex="0"`, `role="button"`, `aria-label`, and keyboard handlers (`@keydown.enter`, `@keydown.space`) to the custom container or label to restore keyboard accessibility.
## 2024-05-24 - Restore keyboard accessibility for custom Alpine.js file dropzones
**Learning:** When implementing custom file dropzones or file inputs in Alpine.js where the actual `<input type="file">` is visually hidden (e.g., using `class="hidden"` or `display: none`), the element loses keyboard focusability and interaction, making it inaccessible to keyboard users.
**Action:** Restore keyboard accessibility by adding `tabindex="0"`, `role="button"`, an `aria-label`, and keyboard event handlers (like `@keydown.enter.prevent` and `@keydown.space.prevent`) to the visible wrapper element so it programmatically clicks the hidden input, and ensure the wrapper has a CSS `:focus-visible` state.
## 2024-08-07 - Keyboard Accessibility for Hidden File Inputs
**Learning:** When implementing custom file dropzones or file inputs in Alpine.js where the actual <input type="file"> is visually hidden (e.g., using class="hidden"), it completely removes keyboard accessibility for the input.
**Action:** Restore keyboard accessibility by adding tabindex="0", role="button", an aria-label, and keyboard event handlers (@keydown.enter.prevent and @keydown.space.prevent) to the visible wrapper element so it programmatically clicks the hidden input, and ensure the wrapper has a CSS :focus-visible state.
