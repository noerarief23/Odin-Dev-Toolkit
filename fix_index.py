import re

with open('index.html', 'r') as f:
    content = f.read()

# Add aria-label to line 381 Timer Settings
content = re.sub(
    r'(<button\n\s*@click="pomoOpenSettings\(\)"\n\s*class="p-2 rounded-lg text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"\n\s*title="Timer Settings"\n\s*>)',
    r'<button\n            @click="pomoOpenSettings()"\n            class="p-2 rounded-lg text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"\n            title="Timer Settings"\n            aria-label="Timer Settings"\n          >',
    content
)

# Add aria-label to line 678 Delete Session
content = re.sub(
    r'(<button\n\s*@click="pomoDeleteSession\(entry\.id\)"\n\s*class="p-1 rounded-md text-slate-600 hover:text-crimson-500 dark:text-slate-500 hover:bg-red-500/10 transition-all"\n\s*title="Delete session"\n\s*>)',
    r'<button\n                    @click="pomoDeleteSession(entry.id)"\n                    class="p-1 rounded-md text-slate-600 hover:text-crimson-500 dark:text-slate-500 hover:bg-red-500/10 transition-all"\n                    title="Delete session"\n                    aria-label="Delete session"\n                  >',
    content
)

with open('index.html', 'w') as f:
    f.write(content)
