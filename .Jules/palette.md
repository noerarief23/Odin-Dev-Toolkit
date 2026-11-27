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
## 2024-06-21 - Input Accessibility Labels
**Learning:** Found that numerous `<input>` elements (e.g., in Pomodoro settings, sliders) lacked `id` attributes associating them with their preceding `<label>` elements, or lacked `aria-label` entirely.
**Action:** Always ensure inputs have explicitly associated labels via `id` and `for` attributes, or at least `aria-label`s for screen reader support.

## 2024-07-25 - Explicit Labels for Alpine Inputs
**Learning:** Found that numerous `<input>` elements (e.g., in Image Shrink and Case Converter) lacked `id` attributes associating them with their preceding `<label>` elements. Also, custom toggle switches (`.toggle-track`) are currently implemented as `<div>` elements inside `<label>`s without actual underlying `<input type="checkbox">` elements, making them inaccessible.
**Action:** Always ensure inputs have explicitly associated labels via `id` and `for` attributes. Future work should convert `.toggle-track` elements to native checkboxes or use `role="switch"` and `tabindex` for keyboard accessibility.
## 2024-06-27 - Keyboard Accessible Custom Toggles
**Learning:** Found that custom toggle switches using `div` inside `label` and `@click.prevent` lose keyboard focusability since they have no underlying native input element. Adding a visually hidden `<input type="checkbox" class="sr-only">` restores natural tab order.
**Action:** Always include a native hidden checkbox and bind it directly with `x-model` when building custom toggle switches in Alpine.js, and use `:focus-visible + .toggle-track` in CSS to provide keyboard focus styling.
## 2026-06-27 - Keyboard Accessibility for Custom Toggles
**Learning:** Custom UI controls built with purely visual elements (like styled `<div>` elements wrapped in `<label>`) inherently fail WCAG keyboard accessibility standards, as they cannot receive focus or be activated via standard keyboard interactions (Spacebar/Enter).
**Action:** When creating custom toggles or checkboxes, always include a visually hidden (e.g., `.sr-only`) native `<input type="checkbox">` element. Bind state management directly to this input's `change` event (or via framework bindings like Alpine's `x-model`), avoiding `click.prevent` on the parent label. Use CSS sibling combinators (e.g., `input[type="checkbox"]:focus-visible ~ .custom-ui`) to style the visible components when the hidden input receives keyboard focus, ensuring sighted keyboard users maintain context.
## 2026-06-28 - Keyboard Accessible Toggle Switches
**Learning:** Custom toggle switches built with a `<label>` containing a `<div>` track and using Alpine `@click.prevent` break keyboard navigation because they lack a focusable, semantic input element.
**Action:** When building custom toggle switches in Alpine.js, embed a native visually hidden `<input type="checkbox" class="sr-only">`, bind state directly to it with `x-model`, and use `input[type="checkbox"]:focus-visible ~ .toggle-track` to maintain native keyboard accessibility and screen reader support.

## 2024-07-28 - Explicit Form Input Bindings for Alpine Components
**Learning:** Found multiple instances where form inputs (`<textarea>`, `<select>`) within complex Alpine.js tools (like JWT Explorer, URL Encoder, Flex/Grid Lab) lacked explicit `id` bindings to their corresponding `<label>` `for` attributes. This breaks click-to-focus and negatively impacts screen reader context.
**Action:** Always verify that every `<label>` has a `for` attribute and the corresponding input has a matching `id` attribute, especially when adding new tools or settings panels.

## 2026-07-04 - Semantic Tags for Output Headers
**Learning:** Found multiple instances where `<label>` tags were used incorrectly for static, non-interactive section headers (like 'Formatted Output' or 'Highlighted Matches'). While visually fine, this is semantically incorrect and confusing for screen readers, as `<label>` should only be used to label form controls.
**Action:** When creating text headers for non-interactive content or read-only outputs, use semantically correct `<div>` (or heading) tags instead of `<label>`. Retain the existing visual utility classes (e.g., Tailwind text styles) to preserve the design while improving accessibility semantics.

## 2024-07-29 - Screen Reader Announcements for Dynamic Toasts
**Learning:** Found that the custom toast notification system in the application was purely visual. When a user triggers an action that displays a toast (e.g., "Copied!"), screen readers would not announce this because the container lacked live region attributes.
**Action:** Always add `aria-live="polite"` and `role="status"` to container elements for non-interruptive dynamic notifications (like toasts or inline success messages) to ensure screen reader users receive the same feedback as sighted users.
## 2024-07-28 - Explicit Form Input Bindings for Alpine Components
**Learning:** Found multiple instances where form inputs (`<textarea>`, `<select>`) within complex Alpine.js tools (like JWT Explorer, URL Encoder, Flex/Grid Lab) lacked explicit `id` bindings to their corresponding `<label>` `for` attributes. This breaks click-to-focus and negatively impacts screen reader context.
**Action:** Always verify that every `<label>` has a `for` attribute and the corresponding input has a matching `id` attribute, especially when adding new tools or settings panels.

## 2026-07-09 - Semantic Tags for Output Headers
**Learning:** Found multiple instances where `<label>` tags were used incorrectly for static, non-interactive section headers (like 'Formatted Output' or 'Highlighted Matches'). While visually fine, this is semantically incorrect and confusing for screen readers, as `<label>` should only be used to label form controls.
**Action:** When creating text headers for non-interactive content or read-only outputs, use semantically correct `<div>` (or heading) tags instead of `<label>`. Retain the existing visual utility classes (e.g., Tailwind text styles) to preserve the design while improving accessibility semantics.

## 2026-07-15 - Keyboard Accessibility for Custom File Inputs
**Learning:** Found that custom file upload areas (like `.img-dropzone` in Image Shrink) and stylized file upload buttons (like the one in Base64 Codec) fail keyboard accessibility when they use `class="hidden"` or `display: none` on the native `<input type="file">`. The native input becomes unreachable, making it impossible for keyboard users to activate the upload dialog.
**Action:** When implementing custom file dropzones or file inputs where the actual `<input type="file">` is visually hidden, restore keyboard accessibility by adding `tabindex="0"`, `role="button"`, an `aria-label`, and keyboard event handlers (like `@keydown.enter.prevent` and `@keydown.space.prevent`) to the visible wrapper element so it programmatically clicks the hidden input. Additionally, ensure the wrapper has CSS `:focus-visible` states to display focus rings.
## 2024-08-14 - Tooltips for Dynamically Disabled Buttons
**Learning:** When buttons are dynamically disabled using Alpine.js bindings, users may lack context on why the interaction is unavailable, causing friction.
**Action:** Always pair disabled buttons with a descriptive tooltip using the `:title` attribute that explains the condition required to enable the button.
## 2024-05-24 - Disabled State Clarity
**Learning:** Users with screen readers or cognitive impairments often struggle to understand why a button is disabled, especially in reactive apps where the state changes dynamically based on hidden logic.
**Action:** Always pair dynamically disabled elements (like Alpine.js `:disabled` bindings) with a dynamic `:title` attribute that explains the condition required to enable them, improving both micro-UX and accessibility.
## 2024-08-21 - Duplicate Attribute Bindings Hide UX Improvements
**Learning:** Found multiple instances where buttons had duplicate Alpine.js `:title` bindings. The latter binding (often set to an empty string on enable) overrode the former binding that contained the tooltip explaining the disabled state, rendering the disabled state context invisible to users.
**Action:** When adding or verifying disabled state tooltips with Alpine.js (`:title`), always check the element to ensure there isn't already an existing `:title` or `title` attribute that will cause a conflict or overwrite the intended UX enhancement.
