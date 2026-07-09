#!/usr/bin/env python3
import json
import urllib.parse
import urllib.request
import time
from pathlib import Path

root = Path(__file__).resolve().parents[1]
qfile = root / 'quotes.json'
backup = root / 'quotes.json.api.bak'

with qfile.open('r', encoding='utf-8') as f:
    data = json.load(f)

with backup.open('w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

API = 'https://api.zhconvert.org/convert'

def convert(text):
    params = {'text': text, 'converter': 'Simplified'}
    url = API + '?' + urllib.parse.urlencode(params)
    try:
        with urllib.request.urlopen(url, timeout=10) as resp:
            res = json.load(resp)
            if res.get('code') == 0 and res.get('data') and 'text' in res['data']:
                return res['data']['text']
    except Exception as e:
        print('convert error:', e)
    return text

changed = 0
for cat, items in data.items():
    for item in items:
        if 'zh' in item and not item.get('zh_hans'):
            out = convert(item['zh'])
            if out and out != item['zh']:
                item['zh_hans'] = out
            else:
                item['zh_hans'] = out
            changed += 1
            time.sleep(0.05)
        if 'zh_author' in item and not item.get('zh_author_hans'):
            out = convert(item['zh_author'])
            if out and out != item['zh_author']:
                item['zh_author_hans'] = out
            else:
                item['zh_author_hans'] = out
            changed += 1
            time.sleep(0.05)

with qfile.open('w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print(f'API conversion complete. Processed {changed} fields.')
