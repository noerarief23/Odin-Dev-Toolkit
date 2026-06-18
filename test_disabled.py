import re

with open('index.html') as f:
    content = f.read()

disabled_buttons = re.findall(r'<button[^>]*:disabled="[^"]*"[^>]*>', content)
for btn in disabled_buttons:
    print(btn)
    print("-" * 20)
