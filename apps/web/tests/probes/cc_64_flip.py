"""cc-64 (P1): a food moved to another meal glides there (FLIP). Before, the inverted transform was set and cleared in one
frame and never painted, so the row snapped. Desktop demo build at 1440x900 (the mouse drag of cc_70), Mì Ý moved from
Sáng to Bữa phụ: every animation frame records the row's computed transform; the row must be away from its place
(transform not none) for at least 2 frames after the drop, and back at none at the end. Reduced motion: no slide.
Run with: ALIGN_BASE_URL=http://localhost:3101 npm run probe -- tests/probes/cc_64_flip.py
"""
# PROBE_COVERS: app/(app)/(tabs)/app/**
import sys

from playwright.sync_api import sync_playwright
import _demo  # noqa: F401
import _seed  # noqa: F401
import cc_70_touch_drag as t

problems = []


def check(cond, msg):
    print(("[PASS] " if cond else "[FAIL] ") + msg)
    if not cond:
        problems.append(msg)


SAMPLE = """(id) => {
  window.__flip = [];
  const tick = () => {
    const el = document.querySelector(`button[data-entry-id="${id}"]`);
    window.__flip.push(el ? getComputedStyle(el).transform : 'gone');
    if (window.__flip.length < 90) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}"""


def move(browser, reduced):
    ctx = browser.new_context(viewport=t.DESKTOP, reduced_motion="reduce" if reduced else "no-preference")
    pg = ctx.new_page()
    t.go_home(pg)
    t.ensure_food(pg)
    entry_id = t.row(pg).get_attribute("data-entry-id")
    pg.evaluate(SAMPLE, entry_id)
    t.row(pg).drag_to(t.section(pg, "snack").locator("[data-meal-header]"))
    pg.wait_for_timeout(1200)
    frames = pg.evaluate("window.__flip")
    ctx.close()
    moving = [f for f in frames if f not in ("none", "gone")]
    return frames, moving


def main():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        frames, moving = move(browser, reduced=False)
        check(len(moving) >= 2, f"the moved row is away from its place for {len(moving)} frames (at least 2): it glides")
        check(frames and frames[-1] == "none", f"…and ends in its place ({frames[-1] if frames else '—'})")
        frames, moving = move(browser, reduced=True)
        check(len(moving) == 0, f"reduced motion: no slide ({len(moving)} moving frames)")
        browser.close()
    print(f"\n{len(problems)} problem(s)")
    sys.exit(1 if problems else 0)


if __name__ == "__main__":
    main()
