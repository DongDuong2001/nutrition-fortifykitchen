"""title_clip: a Saira title is never cut by an overflow clip (line-clamp, overflow-hidden) around it.

Titles are the h1, h2 and h3 set in Saira. Saira's glyphs (capital Ụ/Ỗ/Ề with their marks, the dấu nặng under a letter, the slant of the italic) reach past the
line box of a `leading-tight` title, so a clamp or an overflow-hidden parent that cuts at the line box takes off the
tops of the marks, the dots and the right edge of the last letter. On every route the smoke probe visits, at 390 and at
390 with the root font at 32 px (200 %), every title gets the line rectangles of its text range
(Range.getClientRects, plus the italic's overhang on the right) compared with the clip rectangle of the nearest
ancestor that clips it (overflow hidden or clip, not a scroller). Each visible line must sit inside it within 1 px; a
line the clamp hides altogether (its middle is outside the clip) is not a cut line, and neither is a line wider than the clip itself (a column too narrow for the word). A title scrolled out of its clip, or
whose clip is a scroller, is skipped.
TITLE_ROUTES=/trends,/targets limits the routes (default: every smoke route).
Each failure prints as "title-clip <route> <pass>: <text> <side> by <px>"; the probe exits 1 on any.
Run with: ALIGN_BASE_URL=http://localhost:3101 npm run probe -- tests/probes/title_clip.py
"""
# PROBE_COVERS: app/** components/**
import os
import subprocess
import sys

import _demo  # noqa: F401
from playwright.sync_api import sync_playwright
from smoke import SKIPPED_ROUTES, discover_routes

BASE = os.environ.get("ALIGN_BASE_URL", "http://localhost:3101")
NOW = "2026-10-15T10:00:00+07:00"
PASSES = [("390", {"width": 390, "height": 844}, False), ("390@200%", {"width": 390, "height": 844}, True)]
TOLERANCE = 1

CHECK_JS = r"""(tol) => {
  const out = [];
  const visible = (el) => {
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) return false;
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'none' || Number(cs.opacity) === 0) return false;
    return !el.closest('[inert],[aria-hidden="true"],.sr-only');
  };
  const clips = (cs) => ['hidden', 'clip'].includes(cs.overflowX) || ['hidden', 'clip'].includes(cs.overflowY);
  const scrolls = (cs) => ['auto', 'scroll'].includes(cs.overflowX) || ['auto', 'scroll'].includes(cs.overflowY);
  for (const el of document.querySelectorAll('h1, h2, h3')) {
    const cs = getComputedStyle(el);
    if (!cs.fontFamily.toLowerCase().includes('saira')) continue;
    if (!Array.from(el.childNodes).some((n) => n.nodeType === 3 && n.textContent.trim())) continue;
    if (!visible(el)) continue;
    const range = document.createRange();
    range.selectNodeContents(el);
    const rects = [...range.getClientRects()].filter((q) => q.width >= 1 && q.height >= 1);
    if (!rects.length) continue;
    const fs = parseFloat(cs.fontSize);
    const overhang = cs.fontStyle === 'italic' ? fs * 0.12 : 0;
    // the nearest ancestor (or the element) that clips; a scroller is the page's business, not a title clip
    let clip = null;
    for (let a = el; a && a !== document.documentElement; a = a.parentElement) {
      const acs = getComputedStyle(a);
      if (scrolls(acs)) break;
      if (clips(acs)) { clip = a; break; }
    }
    if (!clip) continue;
    const c = clip.getBoundingClientRect();
    const cc = getComputedStyle(clip);
    const box = { top: c.top + parseFloat(cc.borderTopWidth), bottom: c.bottom - parseFloat(cc.borderBottomWidth), left: c.left + parseFloat(cc.borderLeftWidth), right: c.right - parseFloat(cc.borderRightWidth) };
    const text = (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 30);
    const cut = [];
    for (const q of rects) {
      const midY = (q.top + q.bottom) / 2, midX = (q.left + q.right) / 2;
      // a line the clamp hides altogether, or one scrolled out of the clip, is not a cut line
      if (midY <= box.top || midY >= box.bottom || midX <= box.left || midX >= box.right) continue;
      // a line wider than its clip is a title in too narrow a column (a layout question), not a mark or an italic edge that got cut
      if (q.width > box.right - box.left + tol) continue;
      if (box.top - q.top > tol) cut.push('top by ' + (box.top - q.top).toFixed(1));
      if (q.bottom - box.bottom > tol) cut.push('bottom by ' + (q.bottom - box.bottom).toFixed(1));
      if (box.left - q.left > tol) cut.push('left by ' + (box.left - q.left).toFixed(1));
      if (q.right + overhang - box.right > tol) cut.push('right by ' + (q.right + overhang - box.right).toFixed(1));
    }
    if (cut.length) out.push(text + ' in <' + clip.tagName.toLowerCase() + (clip === el ? ' (itself)' : '') + '> ' + [...new Set(cut)].join(', '));
  }
  return out;
}"""


def run_pass(index):
    name, size, big = PASSES[index]
    wanted = os.environ.get("TITLE_ROUTES")
    routes = wanted.split(",") if wanted else [r for r in discover_routes() if r not in SKIPPED_ROUTES]
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
                found = pg.evaluate(CHECK_JS, TOLERANCE)
            except Exception as e:  # a route that does not load is a failure of its own
                found = [f"did not load: {str(e).splitlines()[0]}"]
            for detail in found:
                failures += 1
                print(f"[FAIL] title-clip {route} {name}: {detail}", flush=True)
        browser.close()
    print(f"title-clip {name}: {failures} cut title(s) on {len(routes)} routes", flush=True)
    return failures


def main():
    # The two passes run side by side (one browser each), so the probe stays inside run_all's 180 s
    if "TITLE_PASS" in os.environ:
        sys.exit(1 if run_pass(int(os.environ["TITLE_PASS"])) else 0)
    procs = [subprocess.Popen([sys.executable, __file__], env={**os.environ, "TITLE_PASS": str(i)}) for i in range(len(PASSES))]
    codes = [p.wait() for p in procs]
    sys.exit(1 if any(codes) else 0)


if __name__ == "__main__":
    main()
