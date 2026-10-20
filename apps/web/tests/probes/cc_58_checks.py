"""cc-58: the numbers the PR asks for (390 x 844, demo build). Run against a build, print and save to
.screenshots/cc58/checks-<label>.json:
  public    /signin and /landing: which scripts load, and whether any holds the diary store or supabase-js
  toast_dismiss  one 'moved' toast going by on its own (no entry changes): what React re-rendered
  toasts    three delete toasts on Hôm nay: how many components React re-rendered (function-component fibers that
            performed work), counted through a React DevTools hook that is injected before the app loads
  typing    "ca" then "cá lóc" in the /add search: the longest event (keydown/input to the next paint) per keystroke, 4x CPU
  focus     Cài đặt > Mục tiêu macro and Cân nặng: Tab to the field, screenshot with the focus ring
Run with: ALIGN_BASE_URL=http://localhost:3107 CHECK_LABEL=after npm run probe -- tests/probes/cc_58_checks.py
"""
# PROBE_COVERS: app/(app)/(tabs)/app/** app/(app)/add/** app/(app)/settings/profile/weight/** app/(app)/settings/targets/macros/** app/landing/** app/signin/**
import json
import os
import re
from pathlib import Path

from playwright.sync_api import sync_playwright
import _demo  # noqa: F401  (demo mode, tour and tips off)

BASE = os.environ.get("ALIGN_BASE_URL", "http://localhost:3100")
LABEL = os.environ.get("CHECK_LABEL", "run")
OUT = Path(__file__).resolve().parent.parent.parent / ".screenshots" / "cc58"
PHONE = dict(viewport={"width": 390, "height": 844}, device_scale_factor=2, is_mobile=True, has_touch=True)

# What identifies each package in a minified chunk
MARKERS = {
    "diary store": "useDiary must be used within a DiaryProvider",
    "supabase-js": "supabase.co",
    "sample foods": "Chà là",
}

RENDER_HOOK = """
(() => {
  const state = { renders: 0, commits: 0, names: {} };
  window.__rc = state;
  const FN = new Set([0, 1, 11, 14, 15]); // function, class, forwardRef, memo, simple memo
  const hook = {
    supportsFiber: true,
    renderers: new Map(),
    isDisabled: false,
    inject(renderer) { this.renderers.set(1, renderer); return 1; },
    onScheduleFiberRoot() {}, onCommitFiberUnmount() {}, onPostCommitFiberRoot() {},
    onCommitFiberRoot(id, root) {
      if (!state.on) return;
      state.commits++;
      const stack = [root.current];
      while (stack.length) {
        const f = stack.pop();
        if (!f) continue;
        if (FN.has(f.tag) && (f.flags & 1) === 1) {
          state.renders++;
          const n = (f.type && (f.type.displayName || f.type.name)) || 'anon';
          state.names[n] = (state.names[n] || 0) + 1;
        }
        // A subtree that bailed out keeps the same child pointer as its alternate: nothing in it rendered
        const alt = f.alternate;
        if (f.child && (alt === null || alt.child !== f.child)) stack.push(f.child);
        if (f.sibling) stack.push(f.sibling);
      }
    },
  };
  window.__REACT_DEVTOOLS_GLOBAL_HOOK__ = hook;
})();
"""


def open_today(pg):
    pg.goto(BASE + "/app", wait_until="networkidle")
    pg.locator('[data-align-group="home-page"]').first.wait_for(state="visible")
    pg.wait_for_timeout(1500)
    later = pg.get_by_role("button", name="Để sau")
    if later.count():
        later.first.tap()
        pg.locator('[role="dialog"]').wait_for(state="detached")
        pg.wait_for_timeout(400)


def public_routes(browser):
    res = {}
    for route in ["/signin", "/landing", "/app"]:
        ctx = browser.new_context(**PHONE)
        pg = ctx.new_page()
        bodies = {}

        def on_response(r, bodies=bodies):
            if r.request.resource_type == "script" and "/_next/static/" in r.url:
                try:
                    bodies[r.url.split("/_next/static/")[1]] = r.body()
                except Exception:
                    pass

        pg.on("response", on_response)
        pg.goto(BASE + route, wait_until="networkidle")
        pg.wait_for_timeout(1200)
        found = {k: sorted(n for n, b in bodies.items() if m.encode() in b) for k, m in MARKERS.items()}
        total = sum(len(b) for b in bodies.values())
        res[route] = {"scripts": len(bodies), "raw_kB": round(total / 1024), **{k: (v[:3] if v else "none") for k, v in found.items()}}
        ctx.close()
    return res


def toast_renders(browser):
    ctx = browser.new_context(**PHONE)
    ctx.add_init_script(RENDER_HOOK)
    pg = ctx.new_page()
    open_today(pg)
    pg.evaluate("window.__rc.on = true; window.__rc.renders = 0; window.__rc.commits = 0; window.__rc.names = {}")
    for i in range(3):
        pg.locator('button[aria-label="Tùy chọn ngày"]').first.tap()
        pg.get_by_text("Chọn nhiều món").first.tap()
        pg.wait_for_timeout(500)
        pg.locator('button[role="checkbox"]').first.tap()
        pg.wait_for_timeout(200)
        pg.get_by_role("button", name="Xóa", exact=True).first.tap()
        pg.wait_for_timeout(700)
    pg.wait_for_timeout(6500)  # the last toast goes by itself
    got = pg.evaluate("({ renders: window.__rc.renders, commits: window.__rc.commits, top: Object.entries(window.__rc.names).sort((a, b) => b[1] - a[1]).slice(0, 8) })")
    ctx.close()
    return got


def toast_dismiss(browser):
    """Only the toast going by: a 'moved' toast is dismissed by its clock and changes no entry, so what re-renders is the toast."""
    ctx = browser.new_context(**PHONE)
    ctx.add_init_script(RENDER_HOOK)
    pg = ctx.new_page()
    open_today(pg)
    pg.locator('button[aria-label="Tùy chọn ngày"]').first.tap()
    pg.get_by_text("Chọn nhiều món").first.tap()
    pg.wait_for_timeout(500)
    pg.locator('button[role="checkbox"]').first.tap()
    pg.get_by_role("button", name="Chuyển bữa", exact=True).first.tap()
    pg.wait_for_timeout(600)
    pg.get_by_role("radio").last.tap()
    pg.get_by_role("button", name="Chuyển", exact=True).first.tap()
    pg.wait_for_timeout(900)
    # the toast is up: count from here
    pg.evaluate("window.__rc.on = true; window.__rc.renders = 0; window.__rc.commits = 0; window.__rc.names = {}")
    pg.wait_for_timeout(6500)
    got = pg.evaluate("({ renders: window.__rc.renders, commits: window.__rc.commits, top: Object.entries(window.__rc.names).sort((a, b) => b[1] - a[1]).slice(0, 6) })")
    ctx.close()
    return got


def typing(browser):
    ctx = browser.new_context(**PHONE)
    pg = ctx.new_page()
    open_today(pg)
    pg.goto(BASE + "/add", wait_until="networkidle")
    pg.wait_for_timeout(1200)
    cdp = ctx.new_cdp_session(pg)
    cdp.send("Emulation.setCPUThrottlingRate", {"rate": 4})
    field = pg.locator('[data-add-panel] input[type="search"], [data-add-panel] input').first
    pg.evaluate(
        """() => { window.__ev = []; new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__ev.push([e.name, Math.round(e.duration)]); })
          .observe({ type: 'event', durationThreshold: 16, buffered: false }); }"""
    )
    field.focus()
    out = []
    for text in ["ca", "cá lóc"]:
        field.fill("")
        pg.wait_for_timeout(300)
        pg.evaluate("window.__ev = []")
        per_key = []
        for ch in text:
            pg.evaluate("window.__ev = []")
            pg.keyboard.type(ch)
            pg.wait_for_timeout(450)
            ev = pg.evaluate("window.__ev.slice()")
            per_key.append(max([d for n, d in ev if n in ("keydown", "keypress", "input", "keyup")] or [0]))
        out.append({"text": text, "longest_event_per_key_ms": per_key})
    ctx.close()
    return out


def focus_rings(browser):
    OUT.mkdir(parents=True, exist_ok=True)
    res = {}
    ctx = browser.new_context(**PHONE)
    pg = ctx.new_page()
    for name, route in [("macro-targets", "/settings/targets/macros"), ("weight", "/settings/profile/weight")]:
        pg.goto(BASE + route, wait_until="networkidle")
        pg.wait_for_timeout(900)
        # Tab until a text/number input has focus
        for _ in range(25):
            pg.keyboard.press("Tab")
            if pg.evaluate("() => ['INPUT'].includes(document.activeElement && document.activeElement.tagName)"):
                break
        info = pg.evaluate(
            """() => { const e = document.activeElement; const cs = getComputedStyle(e); const w = e.parentElement ? getComputedStyle(e.parentElement) : null;
              return { tag: e.tagName, label: e.getAttribute('aria-label') || e.id, boxShadow: cs.boxShadow, outline: cs.outlineStyle + ' ' + cs.outlineWidth,
                       parentShadow: w ? w.boxShadow : null }; }"""
        )
        pg.screenshot(path=str(OUT / f"focus-{name}-{LABEL}.png"))
        res[name] = info
    ctx.close()
    return res


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    with sync_playwright() as p:
        browser = p.chromium.launch()
        data = {"label": LABEL, "public": public_routes(browser)}
        for key, fn in [("toasts", toast_renders), ("toast_dismiss", toast_dismiss), ("typing", typing), ("focus", focus_rings)]:
            try:
                data[key] = fn(browser)
            except Exception as e:  # report what failed, keep the rest
                data[key] = f"error: {type(e).__name__}: {str(e)[:200]}"
        browser.close()
    (OUT / f"checks-{LABEL}.json").write_text(json.dumps(data, ensure_ascii=False, indent=1))
    print(json.dumps(data, ensure_ascii=False, indent=1))


if __name__ == "__main__":
    main()
