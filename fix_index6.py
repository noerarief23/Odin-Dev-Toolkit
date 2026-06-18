import re

with open('index.html', 'r') as f:
    content = f.read()

# Let's clean up the indentation for the empty state
content = content.replace(
    """            <template x-if="!diffResult.html">
                            <div class="flex flex-col items-center justify-center h-full text-slate-500 dark:text-slate-400">""",
    """            <template x-if="!diffResult.html">
              <div class="flex flex-col items-center justify-center h-full text-slate-500 dark:text-slate-400">"""
)

with open('index.html', 'w') as f:
    f.write(content)
