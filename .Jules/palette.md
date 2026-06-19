## 2024-05-18 - Added Empty State for Diff Checker
**Learning:** Found an empty state for the Diff Checker that had only small italic text, and some text was in Indonesian. Adding an icon and better visual hierarchy improves the UX.
**Action:** Always check empty states in the application and try to use empty states with helpful call-to-actions or clear visual icons.
## 2026-06-19 - Added Loading Spinner to Image Shrink
**Learning:** For async operations in Alpine.js with Lucide icons, it's better to toggle `x-show` on two different `<i>` tags (one for idle, one for loading) instead of trying to dynamically change the `data-lucide` attribute. Adding `style="display: none;"` to the loading icon prevents flashing before Alpine initializes.
**Action:** Always use two separate `<i>` tags toggled with `x-show` when adding loading state icons to buttons using Lucide and Alpine.
