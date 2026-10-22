"""design-floor: the auto rules of DESIGN.md on every route the smoke probe visits.

At 390x844 and 1280x900, then again at 390 with the root font at 32 px (200 %), each route is checked for:
  D-CTL-01  each visible interactive element (a[href], button, [role=button|tab|switch], input, select) has a hit area of
            at least 44x44; an absolutely positioned ::before or ::after that grows the box counts
  D-TYPE-01 no visible text under 11 px, unless it is inside [aria-hidden=true]
  D-TYPE-03 every input, textarea and select is 16 px or more
  D-COL-01  each text node's WCAG contrast against its first opaque background is 4.5 (3 at 24 px, or 18.66 px and 700+);
            .sr-only is skipped; text over a gradient or image is skipped (no single background to measure)
  D-LAY-04  scrollWidth <= innerWidth (also at 200 %)
  D-CTL-08  every icon-only button or link has an accessible name
  D-A11Y-03 exactly one h1 per screen
Each failure prints as "D-XXX-NN route width: detail"; the probe exits 1 on any failure.
DF_ROUTES=/app,/explore limits the routes (default: every smoke route except /landing, which design-floor-landing.py checks on
its own, quarantined). DF_RULES=D-CTL-01,... limits the rules.
Run with: ALIGN_BASE_URL=http://localhost:3101 npm run probe -- tests/probes/design-floor.py
"""
# PROBE_COVERS: app/** components/**
# PROBE_TAGS: smoke
import os
import subprocess
import sys

import _demo  # noqa: F401
from playwright.sync_api import sync_playwright
from smoke import SKIPPED_ROUTES, discover_routes

BASE = os.environ.get("ALIGN_BASE_URL", "http://localhost:3101")
NOW = "2026-10-15T10:00:00+07:00"
PASSES = [("390", {"width": 390, "height": 844}, False), ("1280", {"width": 1280, "height": 900}, False), ("390@200%", {"width": 390, "height": 844}, True)]
ONLY_RULES = set(filter(None, os.environ.get("DF_RULES", "").split(",")))
# /landing was red on main before V3 (see QUARANTINE in run_all.py); it has its own probe so this one can fail the run
OWN_PROBE_ROUTES = {"/landing"}

CHECK_JS = r"""() => {
  const out = [];
  const add = (rule, detail) => out.push([rule, detail]);
  const visible = (el) => {
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) return false;
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'none' || Number(cs.opacity) === 0) return false;
    if (el.closest('[inert],[aria-hidden="true"]')) return false;
    return true;
  };
  const label = (el) => (el.getAttribute('aria-label') || el.textContent || el.getAttribute('title') || el.tagName).trim().replace(/\s+/g, ' ').slice(0, 40);
  const srOnly = (el) => !!el.closest('.sr-only');

  // D-CTL-01: hit areas, counting a ::before/::after that grows the box
  for (const el of document.querySelectorAll('a[href], button, [role=button], [role=tab], [role=switch], input:not([type=hidden]), select')) {
    if (!visible(el) || srOnly(el)) continue;
    if (el.matches('input[type=radio], input[type=checkbox]') && el.closest('label')) continue;
    const r = el.getBoundingClientRect();
    let w = r.width, h = r.height;
    for (const pseudo of ['::before', '::after']) {
      const ps = getComputedStyle(el, pseudo);
      if (ps.content === 'none' || ps.position !== 'absolute') continue;
      const t = parseFloat(ps.top) || 0, b = parseFloat(ps.bottom) || 0, l = parseFloat(ps.left) || 0, rr = parseFloat(ps.right) || 0;
      w = Math.max(w, r.width - l - rr);
      h = Math.max(h, r.height - t - b);
    }
    // a link inside running text is exempt (WCAG 2.5.8 inline exception)
    if (el.tagName === 'A' && getComputedStyle(el).display === 'inline') continue;
    if (w < 43.5 || h < 43.5) add('D-CTL-01', `${label(el)} ${Math.round(w)}x${Math.round(h)}`);
  }

  // D-CTL-08: icon-only controls have a name
  for (const el of document.querySelectorAll('a[href], button, [role=button]')) {
    if (!visible(el)) continue;
    const name = (el.getAttribute('aria-label') || el.getAttribute('aria-labelledby') || el.textContent || el.getAttribute('title') || '').trim();
    if (!name) add('D-CTL-08', `${el.tagName.toLowerCase()} ${el.className.toString().slice(0, 40)}`);
  }

  // D-TYPE-03: fields at 16 px or more
  for (const el of document.querySelectorAll('input:not([type=hidden]):not([type=checkbox]):not([type=radio]):not([type=range]), textarea, select')) {
    if (!visible(el)) continue;
    const fs = parseFloat(getComputedStyle(el).fontSize);
    if (fs < 15.5 * (parseFloat(getComputedStyle(document.documentElement).fontSize) / 16)) add('D-TYPE-03', `${label(el)} ${fs}px`);
  }

  // D-A11Y-03: one h1
  const h1s = [...document.querySelectorAll('h1')].filter((h) => !h.closest('[inert]'));
  if (h1s.length !== 1) add('D-A11Y-03', `${h1s.length} h1`);

  // D-LAY-04: no sideways page scroll
  if (document.documentElement.scrollWidth > window.innerWidth + 1) add('D-LAY-04', `scrollWidth ${document.documentElement.scrollWidth} > ${window.innerWidth}`);

  // Text nodes: D-TYPE-01 and D-COL-01
  const parse = (c) => {
    const m = c.match(/rgba?\(([^)]+)\)/);
    if (!m) return null;
    const p = m[1].split(/[\s,\/]+/).filter(Boolean).map(Number);
    return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 };
  };
  const lum = ({ r, g, b }) => {
    const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  };
  const blend = (fg, bg) => ({ r: fg.r * fg.a + bg.r * (1 - fg.a), g: fg.g * fg.a + bg.g * (1 - fg.a), b: fg.b * fg.a + bg.b * (1 - fg.a), a: 1 });
  const background = (el) => {
    const layers = [];
    for (let p = el; p; p = p.parentElement) {
      const cs = getComputedStyle(p);
      if (cs.backgroundImage && cs.backgroundImage !== 'none') return null;
      const c = parse(cs.backgroundColor);
      if (c && c.a > 0) {
        layers.push(c);
        if (c.a >= 0.99) break;
      }
    }
    let bg = { r: 255, g: 255, b: 255, a: 1 };
    for (const c of layers.reverse()) bg = blend(c, bg);
    return bg;
  };
  const root = parseFloat(getComputedStyle(document.documentElement).fontSize) / 16;
  const seen = new Set();
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const el = n.parentElement;
    if (!el || seen.has(el) || !n.textContent.trim()) continue;
    seen.add(el);
    if (!visible(el) || srOnly(el) || el.closest('svg, [data-share-image], [data-export-root]')) continue;
    const cs = getComputedStyle(el);
    const fs = parseFloat(cs.fontSize);
    const text = n.textContent.trim().slice(0, 30);
    if (fs < 10.5 * root) add('D-TYPE-01', `"${text}" ${fs}px`);
    const fg = parse(cs.color);
    const bg = background(el);
    if (!fg || !bg) continue;
    const ink = fg.a < 1 ? blend(fg, bg) : fg;
    const [hi, lo] = [lum(ink), lum(bg)].sort((a, b) => b - a);
    const ratio = (hi + 0.05) / (lo + 0.05);
    const large = fs >= 24 * root || (fs >= 18.66 * root && Number(cs.fontWeight) >= 700);
    if (ratio < (large ? 3 : 4.5) - 0.05) add('D-COL-01', `"${text}" ${ratio.toFixed(2)}:1 (${cs.color} on rgb(${Math.round(bg.r)}, ${Math.round(bg.g)}, ${Math.round(bg.b)}))`);
  }
  return out;
}"""


def run_pass(index):
    name, size, big = PASSES[index]
    wanted = os.environ.get("DF_ROUTES")
    routes = wanted.split(",") if wanted else [r for r in discover_routes() if r not in SKIPPED_ROUTES | OWN_PROBE_ROUTES]
    failures = 0
    with sync_playwright() as p:
        browser = p.chromium.launch()
        ctx = browser.new_context(viewport=size)
        pg = ctx.new_page()
        pg.clock.set_fixed_time(NOW)
        for route in routes:
            try:
                pg.goto(BASE + route, wait_until="load")
                try:
                    pg.wait_for_load_state("networkidle", timeout=3000)
                except Exception:
                    pass
                pg.wait_for_timeout(300)
                if big:
                    pg.evaluate("document.documentElement.style.fontSize = '32px'")
                    pg.wait_for_timeout(200)
                found = pg.evaluate(CHECK_JS)
            except Exception as e:  # a route that does not load is a failure of its own
                found = [["D-LOAD", str(e).splitlines()[0]]]
            for rule, detail in found:
                if ONLY_RULES and rule not in ONLY_RULES:
                    continue
                failures += 1
                print(f"{rule} {route} {name}: {detail}", flush=True)
        browser.close()
    print(f"design-floor {name}: {failures} failure(s) on {len(routes)} routes", flush=True)
    return failures


def main():
    # The three passes run side by side (one browser each), so the whole probe stays inside run_all's 180 s
    if "DF_PASS" in os.environ:
        sys.exit(1 if run_pass(int(os.environ["DF_PASS"])) else 0)
    procs = [subprocess.Popen([sys.executable, __file__], env={**os.environ, "DF_PASS": str(i)}) for i in range(len(PASSES))]
    codes = [p.wait() for p in procs]
    sys.exit(1 if any(codes) else 0)


if __name__ == "__main__":
    main()
