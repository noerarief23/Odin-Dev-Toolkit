import re

with open('index.html', 'r') as f:
    content = f.read()

content = content.replace(
    '<p class="text-sm text-slate-600 dark:text-slate-400 mt-1">Bandingkan dua JSON atau XML secara real-time dan lihat perbedaannya</p>',
    '<p class="text-sm text-slate-600 dark:text-slate-400 mt-1">Compare two JSON or XML inputs in real-time and view the differences</p>'
)

with open('index.html', 'w') as f:
    f.write(content)
