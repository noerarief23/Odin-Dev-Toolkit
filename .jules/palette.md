## 2026-07-28 - Keyboard Accessible Custom File Inputs
**Learning:** Custom file inputs and dropzones implemented with a hidden `<input type="file">` inside a `<div>` or `<label>` are inaccessible to keyboard navigators, as `display: none` removes the input from the tab order.
**Action:** Always add `tabindex="0"`, `role="button"`, `aria-label`, and keyboard handlers (`@keydown.enter`, `@keydown.space`) to the custom container or label to restore keyboard accessibility.
