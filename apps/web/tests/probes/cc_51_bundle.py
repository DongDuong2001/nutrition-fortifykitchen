"""cc-51 A4: first-load JavaScript and HTML of / and /app. REPORT probe (prints numbers, fails only when a page is down).

First-load JS = every script the page's initial HTML references (script src and preloaded scripts), downloaded once and
summed raw and gzip-compressed. Code split with next/dynamic is fetched later and is not counted.
Run with: ALIGN_BASE_URL=http://localhost:3101 CC51_LABEL=after npm run probe -- tests/probes/cc_51_bundle.py
"""
# PROBE_COVERS: app/(app)/(tabs)/app/** app/page.tsx
import gzip
import os
import re
import sys
import urllib.request

BASE = os.environ.get("ALIGN_BASE_URL", "http://localhost:3101")
LABEL = os.environ.get("CC51_LABEL", "this build")


def get(url):
    with urllib.request.urlopen(url, timeout=30) as res:
        return res.read()


problems = 0
print(f"[REPORT] {LABEL}")
for route in ("/", "/app"):
    try:
        html = get(BASE + route)
    except Exception as e:
        print(f"[FAIL] {route}: {e}")
        problems += 1
        continue
    srcs = set(re.findall(rb'<script[^>]+src="([^"]+\.js)"', html)) | set(re.findall(rb'<link[^>]+as="script"[^>]+href="([^"]+\.js)"', html)) | set(re.findall(rb'<link[^>]+href="([^"]+\.js)"[^>]+as="script"', html))
    raw = gz = 0
    for src in sorted(srcs):
        body = get(BASE + src.decode())
        raw += len(body)
        gz += len(gzip.compress(body, 9))
    print(f"[REPORT] {route:5} first-load JS {len(srcs):2} files {raw / 1024:7.1f} kB raw {gz / 1024:6.1f} kB gzip | HTML {len(html) / 1024:6.1f} kB raw {len(gzip.compress(html, 9)) / 1024:5.1f} kB gzip")
sys.exit(1 if problems else 0)
