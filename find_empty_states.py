import re

with open('index.html') as f:
    content = f.read()

# Let's find inputs or buttons that don't have hover/focus styles or lacking something UX related.
# Looking at daily enhancements for Palette:
# ✨ Add ARIA label to icon-only button
# ✨ Add loading spinner to async submit button
# ✨ Improve error message clarity with actionable steps
# ✨ Add focus visible styles for keyboard navigation
# ✨ Add tooltip explaining disabled button state
# ✨ Add empty state with helpful call-to-action
# ✨ Improve form validation with inline feedback
# ✨ Add alt text to decorative/informative images
# ✨ Add confirmation dialog for delete action
# ✨ Improve color contrast for better readability
# ✨ Add progress indicator for multi-step form
# ✨ Add keyboard shortcut hints

# Is there an empty state for diff checker?
