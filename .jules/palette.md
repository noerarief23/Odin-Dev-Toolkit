## 2026-08-01 - Accessible Custom Dropzones
**Learning:** When using visually hidden file inputs (`display: none`) for custom drag-and-drop zones, keyboard accessibility is completely lost, leaving keyboard-only users unable to upload files.
**Action:** Always add `tabindex="0"`, `role="button"`, an `aria-label`, and explicit keyboard event handlers (like enter and space) to the visible dropzone wrapper to programmatically click the hidden input.
