"""cc-14 whole-app smoke probe: every page.tsx under app/ at 390x844 and 1280x800.

Per route and width: no console or hydration errors, no horizontal scroll, a visible header
(banner role or AppHeader), and no text overflowing its box (scroll containers excepted).
Screenshots go to tests/probes/out/smoke-<route>-<width>.png. Exits 1 if any route fails.
Run with: ALIGN_BASE_URL=http://localhost:3101 npm run probe -- tests/probes/smoke.py
"""
import os
import re
import sys
from pathlib import Path
from urllib.parse import urlparse

from playwright.sync_api import sync_playwright

BASE = os.environ.get("ALIGN_BASE_URL", "http://localhost:3100")
HERE = Path(__file__).resolve().parent
APP_DIR = HERE.parent.parent / "app"
OUT_DIR = HERE / "out"
WIDTHS = [(390, 844), (1280, 800)]
NOT_FOUND_ROUTE = "/this-page-does-not-exist"
# Mock id for each dynamic segment, keyed by the static segment in front of it
MOCK_IDS = {"entry": "item-1", "foods": "food-cha-la", "micros": "calcium"}
IGNORED_CONSOLE = ("data-gr-", "Grammarly")
# Production builds report hydration failures as minified React errors (#418, #419, #423, #425)
HYDRATION_RE = re.compile(r"hydrat|React error #(418|419|423|425)", re.IGNORECASE)

# Elements whose own text is wider than their box. Scroll containers (chip rows) are skipped,
# and so are 1px sr-only labels, which clip on purpose.
OVERFLOW_JS = """() => {
  const inScroller = (el) => {
    for (let p = el; p && p !== document.documentElement; p = p.parentElement) {
      const ox = getComputedStyle(p).overflowX;
      if (ox === 'auto' || ox === 'scroll') return true;
    }
    return false;
  };
  const found = [];
  for (const el of document.body.querySelectorAll('*')) {
    if (!(el instanceof HTMLElement)) continue;
    const cs = getComputedStyle(el);
    if (cs.display === 'inline' || cs.display === 'contents' || cs.display === 'none') continue;
    if (cs.visibility === 'hidden') continue;
    if (!Array.from(el.childNodes).some(n => n.nodeType === Node.TEXT_NODE && n.textContent.trim())) continue;
    const r = el.getBoundingClientRect();
    if (r.width <= 1 || r.height <= 1) continue;
    if (el.scrollWidth <= el.clientWidth + 1) continue;
    if (inScroller(el)) continue;
    found.push({
      text: el.textContent.trim().replace(/\\s+/g, ' ').slice(0, 50),
      scroll: el.scrollWidth,
      client: el.clientWidth,
      ellipsis: cs.textOverflow === 'ellipsis',
    });
  }
  return found;
}"""


def discover_routes():
    routes = []
    for page_file in sorted(APP_DIR.rglob("page.tsx")):
        parts = []
        for seg in page_file.parent.relative_to(APP_DIR).parts:
            if seg.startswith("(") and seg.endswith(")"):
                continue  # route group, not part of the URL
            if seg.startswith("[") and seg.endswith("]"):
                if not parts or parts[-1] not in MOCK_IDS:
                    raise SystemExit(f"No mock id for dynamic segment {seg} in {page_file}")
                parts.append(MOCK_IDS[parts[-1]])
            else:
                parts.append(seg)
        routes.append("/" + "/".join(parts))
    routes.append(NOT_FOUND_ROUTE)
    return routes


def slug(route):
    return "home" if route == "/" else route.strip("/").replace("/", "-")


def check(browser, route, width, height):
    context = browser.new_context(viewport={"width": width, "height": height})
    page = context.new_page()
    console_msgs = []

    def on_console(msg):
        if msg.type == "error":
            console_msgs.append(msg.text)

    page.on("console", on_console)
    page.on("pageerror", lambda err: console_msgs.append(str(err)))
    reasons = []
    shot = OUT_DIR / f"smoke-{slug(route)}-{width}.png"

    try:
        page.goto(BASE + route, wait_until="networkidle", timeout=30000)
        page.wait_for_timeout(300)

        if route == "/foods":
            landed = urlparse(page.url).path
            if landed != "/add":
                reasons.append(f"/foods did not redirect to /add (landed on {landed})")

        seen = set()
        for text in console_msgs:
            if any(s in text for s in IGNORED_CONSOLE):
                continue
            # The 404 page logs its own failed request by design; other errors on it still count
            if route == NOT_FOUND_ROUTE and "status of 404" in text:
                continue
            label = "hydration error" if HYDRATION_RE.search(text) else "console error"
            if (label, text[:200]) not in seen:
                seen.add((label, text[:200]))
                reasons.append(f"{label}: {text[:200]}")

        if page.locator('header:visible, [role="banner"]:visible').count() == 0:
            reasons.append("no visible header (banner role or AppHeader)")

        scroll_w, inner_w = page.evaluate(
            "() => [Math.max(document.documentElement.scrollWidth, document.body.scrollWidth), window.innerWidth]"
        )
        if scroll_w > inner_w:
            reasons.append(f"horizontal scroll (scrollWidth {scroll_w} > innerWidth {inner_w})")

        overflow = page.evaluate(OVERFLOW_JS)
        if overflow:
            sample = "; ".join(
                f"'{o['text']}' ({o['scroll']} > {o['client']}{', ellipsis' if o['ellipsis'] else ''})"
                for o in overflow[:3]
            )
            reasons.append(f"text overflow x{len(overflow)}: {sample}")
    except Exception as err:
        reasons.append(f"load error: {str(err).splitlines()[0][:200]}")

    try:
        page.screenshot(path=shot, full_page=True)
    except Exception as err:
        reasons.append(f"screenshot failed: {str(err).splitlines()[0][:120]}")
    context.close()
    return reasons, shot.name


def main():
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    routes = discover_routes()
    print(f"=== Smoke probe: {len(routes)} routes x {len(WIDTHS)} widths against {BASE} ===")
    passed = failed = 0
    with sync_playwright() as p:
        browser = p.chromium.launch()
        for route in routes:
            for width, height in WIDTHS:
                reasons, shot = check(browser, route, width, height)
                label = f"{route} @{width}x{height} ({shot})"
                if reasons:
                    failed += 1
                    print(f"FAIL {label}: " + " | ".join(reasons))
                else:
                    passed += 1
                    print(f"PASS {label}")
        browser.close()
    print(f"\nSmoke: {passed} PASS, {failed} FAIL of {passed + failed}")
    sys.exit(1 if failed else 0)


if __name__ == "__main__":
    main()
