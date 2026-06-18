import re

with open('index.html', 'r') as f:
    content = f.read()

# I will replace the diff checker empty state with an icon and call to action.
# It currently has: <p class="text-slate-600 italic text-sm">Masukkan Input A dan Input B untuk melihat perbedaan...</p>
# It's in Indonesian? Wow. "Masukkan Input A dan Input B untuk melihat perbedaan..." -> "Enter Input A and Input B to see differences..."

replacement = """              <div class="flex flex-col items-center justify-center h-full text-slate-500 dark:text-slate-400">
                <i data-lucide="git-compare" class="w-12 h-12 mb-3 opacity-20"></i>
                <p class="text-sm">Enter Input A and Input B to see differences</p>
              </div>"""

content = content.replace(
    '<p class="text-slate-600 italic text-sm">Masukkan Input A dan Input B untuk melihat perbedaan...</p>',
    replacement
)

with open('index.html', 'w') as f:
    f.write(content)
