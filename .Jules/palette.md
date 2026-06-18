## 2024-05-18 - Added Empty State for Diff Checker
**Learning:** Found an empty state for the Diff Checker that had only small italic text, and some text was in Indonesian. Adding an icon and better visual hierarchy improves the UX.
**Action:** Always check empty states in the application and try to use empty states with helpful call-to-actions or clear visual icons.

## 2024-05-18 - Missing ARIA Labels on Icon-only Buttons
**Learning:** Found that multiple utility buttons (e.g., Settings, Delete session) using Lucide icons lacked `aria-label`s, making them invisible or unclear to screen reader users.
**Action:** Always verify icon-only interactive elements explicitly contain an `aria-label` describing the action, especially in tool-heavy PWAs like this one.
