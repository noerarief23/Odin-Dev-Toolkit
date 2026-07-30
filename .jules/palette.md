## 2026-07-30 - [Keyboard Accessibility for Visually Hidden File Inputs]
**Learning:** When using visually hidden `<input type="file">`, keyboard users (using Tab) cannot naturally focus and activate the input if its wrapper lacks focusability and keyboard event handlers.
**Action:** Add `tabindex="0"`, `role="button"`, an `aria-label`, and explicit keyboard event handlers (like `@keydown.enter.prevent` and `@keydown.space.prevent`) to the visible wrapper element, and ensure it has a `:focus-visible` outline state.
