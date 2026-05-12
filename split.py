import re

with open('frontend/index.html', 'r', encoding='utf-8') as f:
    html = f.read()

css_match = re.search(r'<style>(.*?)</style>', html, re.DOTALL)
if css_match:
    with open('frontend/style.css', 'w', encoding='utf-8') as f:
        f.write(css_match.group(1).strip())
    html = html.replace(css_match.group(0), '<link rel="stylesheet" href="style.css">')

js_match = re.search(r'<script>(.*?)</script>', html, re.DOTALL)
if js_match:
    with open('frontend/script.js', 'w', encoding='utf-8') as f:
        f.write(js_match.group(1).strip())
    html = html.replace(js_match.group(0), '<script src="script.js"></script>')

with open('frontend/index.html', 'w', encoding='utf-8') as f:
    f.write(html)
print('Done!')
