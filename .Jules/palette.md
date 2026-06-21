## 2024-05-18 - Added Empty State for Diff Checker
**Learning:** Found an empty state for the Diff Checker that had only small italic text, and some text was in Indonesian. Adding an icon and better visual hierarchy improves the UX.
**Action:** Always check empty states in the application and try to use empty states with helpful call-to-actions or clear visual icons.

## 2024-05-18 - Missing ARIA Labels on Icon-only Buttons
**Learning:** Found that multiple utility buttons (e.g., Settings, Delete session) using Lucide icons lacked `aria-label`s, making them invisible or unclear to screen reader users.
**Action:** Always verify icon-only interactive elements explicitly contain an `aria-label` describing the action, especially in tool-heavy PWAs like this one.
## 2026-06-19 - Added Loading Spinner to Image Shrink
**Learning:** For async operations in Alpine.js with Lucide icons, it's better to toggle `x-show` on two different `<i>` tags (one for idle, one for loading) instead of trying to dynamically change the `data-lucide` attribute. Adding `style="display: none;"` to the loading icon prevents flashing before Alpine initializes.
**Action:** Always use two separate `<i>` tags toggled with `x-show` when adding loading state icons to buttons using Lucide and Alpine.
## 2026-06-20 - Adding disabled state for `.btn-gold`
**Learning:** Found multiple buttons with the `.btn-gold` class that did not have clear visual disabled states using the `:disabled` selector in `css/valhalla.css`.
**Action:** When creating disabled states for custom UI elements, ensure that you always include custom `:disabled` pseudo-class styling (such as `opacity: 0.5`, `cursor: not-allowed`, `pointer-events: none`). Additionally, when searching for missing `aria-label`s, verify if elements use Alpine.js attributes like `x-text` or `x-html` which will populate text dynamically and are not actually empty buttons.
