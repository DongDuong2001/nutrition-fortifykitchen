"""perf/server-image: the standalone server (`node server.js` in the Docker image) still serves what `next start` did.

Fetches, without a browser and without following redirects:
- /, /app, /signin, /landing: 200 (or the auth redirect for /app), each with the security headers of next.config.ts
  (CSP, HSTS, X-Frame-Options DENY, nosniff, Referrer-Policy, Permissions-Policy) and no Content-Encoding (Caddy
  compresses; the app no longer does, `compress: false`)
- a redirect source of lib/redirects.ts (/today, /login): 308 to its destination
- /sw.js with `const VERSION = "…"`, /robots.txt, /sitemap.xml, /manifest.webmanifest
SERVER_IMAGE_ROUTES=1 also fetches the 10 routes used for the RSS figure in the PR, 3 times each.
Run with: ALIGN_BASE_URL=http://localhost:3104 npm run probe -- tests/probes/server_image.py
"""
# PROBE_COVERS: next.config.ts
import os
import re
import sys
import urllib.error
import urllib.request

BASE = os.environ.get("ALIGN_BASE_URL", "http://localhost:3101")
HEADERS = ["content-security-policy", "strict-transport-security", "x-frame-options", "x-content-type-options",
           "referrer-policy", "permissions-policy"]
ROUTES = ["/", "/landing", "/signin", "/signup", "/app", "/explore", "/trends", "/settings", "/privacy", "/terms"]
problems = []


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *args, **kwargs):
        return None


OPENER = urllib.request.build_opener(NoRedirect)


def check(cond, msg):
    print(("[PASS] " if cond else "[FAIL] ") + msg)
    if not cond:
        problems.append(msg)
    return cond


def get(path):
    req = urllib.request.Request(BASE + path, headers={"Accept-Encoding": "gzip, br", "User-Agent": "server-image-probe"})
    try:
        with OPENER.open(req, timeout=30) as res:
            return res.status, {k.lower(): v for k, v in res.headers.items()}, res.read()
    except urllib.error.HTTPError as e:
        return e.code, {k.lower(): v for k, v in e.headers.items()}, e.read()


def main():
    for path in ("/", "/landing", "/signin", "/app"):
        status, headers, _ = get(path)
        check(status in (200, 307, 308) if path == "/app" else status == 200, f"{path}: {status}")
        missing = [h for h in HEADERS if h not in headers]
        check(not missing, f"{path}: security headers ({missing or 'all six'})")
        check(headers.get("x-frame-options") == "DENY", f"{path}: X-Frame-Options DENY ({headers.get('x-frame-options')})")
        check("content-encoding" not in headers, f"{path}: not compressed by the app ({headers.get('content-encoding')})")
    for source, dest in (("/today", "/app"), ("/login", "/signin")):
        status, headers, _ = get(source)
        check(status == 308 and headers.get("location", "").endswith(dest), f"{source}: 308 to {dest} ({status} {headers.get('location')})")
    status, headers, body = get("/sw.js")
    version = re.search(rb'const VERSION = "([^"]+)"', body)
    check(status == 200 and version is not None, f"/sw.js: 200 with VERSION ({status} {version.group(1).decode() if version else None})")
    for path, needle in (("/robots.txt", b"Sitemap"), ("/sitemap.xml", b"<urlset"), ("/manifest.webmanifest", b'"name"')):
        status, _, body = get(path)
        check(status == 200 and needle in body, f"{path}: 200 with {needle.decode()} ({status})")
    if os.environ.get("SERVER_IMAGE_ROUTES") == "1":
        for _ in range(3):
            for path in ROUTES:
                get(path)
        print(f"fetched {len(ROUTES)} routes 3 times")
    print(f"\n{len(problems)} problem(s)")
    sys.exit(1 if problems else 0)


if __name__ == "__main__":
    main()
