import re

with open('index.html', 'r') as f:
    content = f.read()

# Add aria-label to Start button (uses x-text but might be empty initially)
# Although actually x-text handles text.
# The issue says "Add ARIA labels to icon-only buttons"

content = re.sub(
    r'(<button\n\s*x-show="!pomoRunning"\n\s*@click="pomoStart\(\)"\n\s*class="pomo-ctrl-btn pomo-ctrl-start"\n\s*>)',
    r'<button\n                  x-show="!pomoRunning"\n                  @click="pomoStart()"\n                  class="pomo-ctrl-btn pomo-ctrl-start"\n                  :aria-label="pomoPaused ? \'Resume Timer\' : \'Start Timer\'"\n                >',
    content
)

content = re.sub(
    r'(<button\n\s*@click="imgProcess\(\)"\n\s*class="btn-gold px-5 py-2 rounded-lg text-sm font-semibold flex items-center gap-2"\n\s*:disabled="imgProcessing"\n\s*>)',
    r'<button\n                @click="imgProcess()"\n                class="btn-gold px-5 py-2 rounded-lg text-sm font-semibold flex items-center gap-2"\n                :disabled="imgProcessing"\n                :aria-label="imgProcessing ? \'Processing Image\' : \'Shrink Image\'"\n              >',
    content
)

with open('index.html', 'w') as f:
    f.write(content)
