import os
import re
from bs4 import BeautifulSoup

html_files = []
js_files = []

for root, dirs, files in os.walk('.'):
    # Exclude directories
    dirs[:] = [d for d in dirs if d not in ['.git', '.venv', 'node_modules']]
    for f in files:
        if f.endswith('.html'):
            html_files.append(os.path.join(root, f))
        elif f.endswith('.js'):
            js_files.append(os.path.join(root, f))

print(f"Found {len(html_files)} HTML files and {len(js_files)} JS files.\n")

print("================================================================================")
print("CHECK 1: grep html/js files for 'GoodVibe Quotes' and 'GoodVibe' in title/meta/og/schema")
print("================================================================================")

for fpath in sorted(html_files + js_files):
    with open(fpath, 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()
    
    matches = []
    
    # Check JS files
    if fpath.endswith('.js'):
        # For JS files, we search for context around "GoodVibe" or "GoodVibe Quotes"
        lines = content.splitlines()
        for idx, line in enumerate(lines):
            if "GoodVibe Quotes" in line or "GoodVibe" in line:
                # Find if it mentions anything like title, meta, og, or schema
                lower_line = line.lower()
                if any(x in lower_line for x in ["title", "meta", "og:", "schema", "description"]):
                    matches.append((idx + 1, line.strip()))
    else:
        # Check HTML files using BeautifulSoup or regex
        # We can extract elements and search inside them
        soup = BeautifulSoup(content, 'html.parser')
        
        # 1. title element
        if soup.title and soup.title.string:
            title_str = soup.title.string
            if "GoodVibe" in title_str:
                matches.append((0, f"<title>: {title_str.strip()}"))
        
        # 2. meta tags (including content, description, og etc.)
        for meta in soup.find_all('meta'):
            attrs_str = str(meta.attrs)
            if "GoodVibe" in attrs_str or "GoodVibe Quotes" in attrs_str:
                matches.append((0, f"meta tag: {str(meta)}"))
                
        # 3. schema (ld+json)
        for script in soup.find_all('script', type='application/ld+json'):
            script_str = script.string if script.string else ""
            if "GoodVibe" in script_str:
                matches.append((0, f"schema content: {script_str.strip()[:150]}..."))

    if matches:
        print(f"\n{fpath}:")
        for num, text in matches:
            if num > 0:
                print(f"  Line {num}: {text}")
            else:
                print(f"  {text}")

print("\n================================================================================")
print("CHECK 2: HTML files containing inline <style> blocks")
print("================================================================================")

style_files = []
for fpath in sorted(html_files):
    with open(fpath, 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()
    if "<style" in content:
        style_files.append(fpath)
        # Find matches of style tags
        soup = BeautifulSoup(content, 'html.parser')
        styles = soup.find_all('style')
        print(f"\n{fpath} has {len(styles)} inline <style> block(s):")
        for s in styles:
            content_preview = (s.string or "").strip()
            if len(content_preview) > 100:
                content_preview = content_preview[:100] + "..."
            print(f"  <style>: {content_preview}")

if not style_files:
    print("No HTML files contain inline <style> blocks.")

print("\n================================================================================")
print("CHECK 3: HTML files missing i18n/header/footer script includes with ?v=20260726")
print("================================================================================")

# Let's inspect the files for specific scripts:
# i18n.js?v=20260726
# header.js?v=20260726
# and footer? Wait, is there a footer script, or is footer a class / element structure?
# Let's look at index.html includes:
#   <script defer src="app.js?v=20260726"></script>
#   <script src="theme.js?v=20260726"></script>
#   <script src="i18n.js?v=20260726"></script>
#   <script src="header.js?v=20260726"></script>
# Ah, wait! The prompt asks for: "html files missing i18n/header/footer script includes with ?v=20260726".
# Let's check what scripts are included and if they are missing. Let's analyze if there's any footer script or if it's just general script includes like "i18n.js", "header.js", maybe something else?
# Let's search all scripts with `?v=20260726` or examine their script src tags.

for fpath in sorted(html_files):
    with open(fpath, 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()
    
    # Check includes for i18n.js?v=20260726, header.js?v=20260726 (and any footer script? wait, do we have theme.js, app.js also?)
    # Let's check for specific files if they are in root or blog directory to resolve relative paths
    soup = BeautifulSoup(content, 'html.parser')
    scripts = soup.find_all('script')
    
    srcs = []
    for s in scripts:
        if s.get('src'):
            srcs.append(s.get('src'))
            
    # We want to verify includes of i18n.js, header.js, and maybe footer helper?
    # Let's list the source paths. Usually, for blog/*.html, it might be "../i18n.js?v=20260726" etc.
    # We want to check if i18n.js?v=20260726 and header.js?v=20260726 are included.
    # Let's find out if there's any file named footer.js? Wait, there is no footer.js in the directory listing, but let's check if they meant another script or if any includes of footer/header are missing, or if we can find if any script include has missing version `?v=20260726`.
    # Let's list all script includes for each file, and highlight those missing the ?v=20260726 query parameter.
    
    missing_i18n = True
    missing_header = True
    # Let's see if there are any other scripts
    for src in srcs:
        if "i18n.js?v=20260726" in src:
            missing_i18n = False
        if "header.js?v=20260726" in src:
            missing_header = False
            
    reasons = []
    if missing_i18n:
        # Check if i18n is present without version or completely missing
        has_i18n_wrong_v = any("i18n.js" in s for s in srcs)
        if has_i18n_wrong_v:
            bad_src = [s for s in srcs if "i18n.js" in s][0]
            reasons.append(f"i18n.js has wrong version (got '{bad_src}', expected 'i18n.js?v=20260726')")
        else:
            reasons.append("i18n.js script is completely missing")
            
    if missing_header:
        has_header_wrong_v = any("header.js" in s for s in srcs)
        if has_header_wrong_v:
            bad_src = [s for s in srcs if "header.js" in s][0]
            reasons.append(f"header.js has wrong version (got '{bad_src}', expected 'header.js?v=20260726')")
        else:
            reasons.append("header.js script is completely missing")
            
    # Print out any other scripts that are missing version v=20260726
    other_missing_v = []
    for s in srcs:
        if (".js" in s) and ("?v=20260726" not in s) and ("google" not in s) and ("supabase" not in s):
            other_missing_v.append(s)
            
    if other_missing_v:
        reasons.append(f"Other local scripts missing '?v=20260726': {other_missing_v}")
        
    if reasons:
        print(f"\n{fpath}:")
        for r in reasons:
            print(f"  - {r}")

