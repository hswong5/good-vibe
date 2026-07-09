#!/usr/bin/env python3
import json
from opencc import OpenCC
from pathlib import Path

root = Path(__file__).resolve().parents[1]
qfile = root / 'quotes.json'
backup = root / 'quotes.json.bak'

cc = OpenCC('t2s')

with qfile.open('r', encoding='utf-8') as f:
    data = json.load(f)

# backup
with backup.open('w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

changed = 0
for cat, items in data.items():
    for item in items:
        if 'zh' in item and 'zh_hans' not in item:
            item['zh_hans'] = cc.convert(item['zh'])
            changed += 1
        if 'zh_author' in item and 'zh_author_hans' not in item:
            item['zh_author_hans'] = cc.convert(item['zh_author'])
            changed += 1

with qfile.open('w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print(f"Conversion complete. Fields added/changed: {changed}")
