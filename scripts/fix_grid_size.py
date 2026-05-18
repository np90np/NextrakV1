from pathlib import Path
import re

root = Path(__file__).resolve().parent.parent / 'src'
patterns = [
    (re.compile(r'<Grid\s+size=\{\{\s*xs:\s*([^,}]+),\s*sm:\s*([^,}]+),\s*lg:\s*([^}]+)\s*\}\}'), r'<Grid item xs={\1} sm={\2} lg={\3}'),
    (re.compile(r'<Grid\s+size=\{\{\s*xs:\s*([^,}]+),\s*sm:\s*([^}]+)\s*\}\}'), r'<Grid item xs={\1} sm={\2}'),
    (re.compile(r'<Grid\s+size=\{\{\s*xs:\s*([^,}]+),\s*md:\s*([^}]+)\s*\}\}'), r'<Grid item xs={\1} md={\2}'),
    (re.compile(r'<Grid\s+size=\{\{\s*xs:\s*([^}]+)\s*\}\}'), r'<Grid item xs={\1}'),
    (re.compile(r'<Grid\s+size=\{\s*([^}]+)\s*\}'), r'<Grid item xs={\1}'),
]
changed_files = []
for path in root.rglob('*.tsx'):
    text = path.read_text(encoding='utf-8')
    new_text = text
    for pattern, replacement in patterns:
        new_text = pattern.sub(replacement, new_text)
    if new_text != text:
        path.write_text(new_text, encoding='utf-8')
        changed_files.append(path)
print(f'Modified {len(changed_files)} files:')
for p in changed_files:
    print(p)
