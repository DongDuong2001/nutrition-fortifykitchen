"""cc-66 (S10): font-weight classes that ask for a weight the page does not load. REPORT probe.

Manrope is loaded at 400, 600 and 700, Saira Condensed at 800 and 900 (app/layout.tsx). A class that asks for another
weight is drawn in the nearest loaded one (CSS font matching): Saira font-bold (700) is drawn at 800, Manrope
font-extrabold (800) at 700, Manrope font-medium (500) at 400. This lists every element on the main screens whose own
class list asks for an unloaded weight, with the weight it is really drawn in, so the class can be replaced by the one
that matches what users see (nothing moves). At 390x844 and 1440x900, demo data.
Run with: ALIGN_BASE_URL=http://localhost:3101 npm run probe -- tests/probes/cc_66_weights.py
"""
# PROBE_COVERS: app/**
import json
import os
import sys

from playwright.sync_api import sync_playwright
import _demo  # noqa: F401
import _seed  # noqa: F401

BASE = os.environ.get("ALIGN_BASE_URL", "http://localhost:3101")
ROUTES = ["/", "/app", "/add?meal=lunch", "/trends", "/trends/energy", "/trends/micros", "/trends/body", "/explore", "/explore/meals",
          "/settings", "/settings/targets", "/settings/targets/macros", "/settings/whats-new", "/settings/profile", "/micros",
          "/training", "/foods/food-pho-bo", "/landing", "/signin", "/setup/goal", "/paywall", "/install"]

AUDIT = """() => {
  const LOADED = { saira: [800, 900], manrope: [400, 600, 700] };
  const WEIGHT = { 'font-thin': 100, 'font-extralight': 200, 'font-light': 300, 'font-normal': 400, 'font-medium': 500,
                   'font-semibold': 600, 'font-bold': 700, 'font-extrabold': 800, 'font-black': 900 };
  // CSS font matching for a missing weight
  const match = (want, have) => {
    if (have.includes(want)) return want;
    const up = have.filter((w) => w > want).sort((a, b) => a - b), down = have.filter((w) => w < want).sort((a, b) => b - a);
    if (want >= 400 && want <= 500) {
      const mid = have.filter((w) => w > want && w <= 500).sort((a, b) => a - b);
      return mid[0] ?? down[0] ?? up[0];
    }
    return want < 400 ? (down[0] ?? up[0]) : (up[0] ?? down[0]);
  };
  const out = [];
  for (const el of document.querySelectorAll('[class]')) {
    const cls = typeof el.className === 'string' ? el.className : el.getAttribute('class');
    const own = (cls || '').split(/\\s+/).filter((c) => c in WEIGHT);
    if (!own.length) continue;
    const family = /saira/i.test(getComputedStyle(el).fontFamily) ? 'saira' : 'manrope';
    const want = WEIGHT[own[own.length - 1]];
    const drawn = match(want, LOADED[family]);
    if (drawn !== want) out.push({ family, cls: own.join(' '), want, drawn, tag: el.tagName.toLowerCase(), text: (el.textContent || '').trim().slice(0, 40), classes: cls });
  }
  return out;
}"""


def main():
    seen = {}
    with sync_playwright() as p:
        browser = p.chromium.launch()
        for size in ({"width": 390, "height": 844}, {"width": 1440, "height": 900}):
            ctx = browser.new_context(viewport=size)
            for route in ROUTES:
                pg = ctx.new_page()
                pg.goto(BASE + route, wait_until="networkidle")
                pg.wait_for_timeout(500)
                for r in pg.evaluate(AUDIT):
                    key = (r["family"], r["classes"])
                    seen.setdefault(key, {**r, "routes": set()})["routes"].add(f"{route}@{size['width']}")
                pg.close()
            ctx.close()
        browser.close()
    rows = sorted(seen.values(), key=lambda r: (r["family"], r["want"], r["classes"]))
    print(f"{len(rows)} class lists ask for a weight that is not loaded")
    for r in rows:
        print(json.dumps({k: (sorted(v) if isinstance(v, set) else v) for k, v in r.items()}, ensure_ascii=False))
    sys.exit(0)


if __name__ == "__main__":
    main()
