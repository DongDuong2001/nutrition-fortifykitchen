"""feat/glide parts 2 and 3: every switch glides in, nothing pops (390 x 844, demo build).

Frames are sampled with requestAnimationFrame: the glide wrapper's opacity, its translateX, a signature of what it shows.
A "pop" is a frame where the content changed with nothing in motion before or after it.
- /add category chips (Đạm, back to Tất cả; the new Đồ ăn của Minh Hào chip is covered in minh_hao_tab.py): the list
  animates (opacity dips under 1, the content comes in from the right for a later chip and from the left for an earlier one, at most
  16 px), no pop, ends at opacity 1 with no transform and no held height, no animation on first mount; a second tap while it moves
  lands on the second chip's list (no queue, nothing left running)
- Giàu Calcium: Thực phẩm bổ sung and Mỗi khẩu phần glide the same way, with no view transition
- bottom nav: Hôm nay → Khám phá enters from the right, Khám phá → Hôm nay from the left, at most 12 px, no snapshot (0 view
  transitions), the old screen does not slide out, nothing left behind; Tổng quan sub-tabs glide too
- reduced motion: a cross-fade, nothing slides, 200 ms at most
Run with: ALIGN_BASE_URL=http://localhost:3101 npm run probe -- tests/probes/glide_switch.py
"""
# PROBE_COVERS: components/ui/switch-glide.tsx components/add/** components/ui/app-shell.tsx components/overview/** app/(app)/explore/rich/** app/globals.css lib/motion.ts hooks/use-food-browse.ts
import os
import sys

import _demo  # noqa: F401
from playwright.sync_api import sync_playwright

BASE = os.environ.get("ALIGN_BASE_URL", "http://localhost:3101")
PHONE = dict(viewport={"width": 390, "height": 844}, device_scale_factor=2, is_mobile=True, has_touch=True)
problems = []

RECORDER = """
(() => {
  const r = { on: false, frames: [], vt: 0 };
  window.__s = r;
  const orig = document.startViewTransition && document.startViewTransition.bind(document);
  if (orig) document.startViewTransition = function (...a) { r.vt += 1; return orig(...a); };
  const visible = (el) => !!el && el.getClientRects().length > 0;
  r.start = (sel) => {
    r.frames = []; r.vt = 0; r.on = true;
    const loop = (t) => {
      if (!r.on) return;
      let el = null;
      for (const e of document.querySelectorAll(sel)) if (visible(e)) { el = e; break; }
      const cs = el ? getComputedStyle(el) : null;
      const m = cs && cs.transform !== 'none' ? new DOMMatrixReadOnly(cs.transform) : null;
      const row = document.querySelector('[data-food-row]:not([hidden])');
      r.frames.push({
        t, found: !!el, op: cs ? Number(cs.opacity) : 1, tx: m ? m.m41 : 0,
        h: el ? el.getBoundingClientRect().height : 0,
        sig: el ? (el.textContent || '').slice(0, 60) + '|' + el.childElementCount : '',
        id: el ? (el.getAttribute('data-glide') || el.getAttribute('data-glide-enter')) : null,
      });
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  };
  r.stop = () => { r.on = false; return { frames: r.frames, vt: r.vt }; };
})();
"""


def check(cond, msg):
    print(("[PASS] " if cond else "[FAIL] ") + msg)
    if not cond:
        problems.append(msg)
    return cond


SEED = "try { localStorage.setItem('h1t_settings_v1_demo', JSON.stringify({installPrompt:{dismissCount:0,snoozeUntil:0,done:true,firstSeenIso:'2026-01-01'}})) } catch (e) {}"


def new_page(browser, **extra):
    ctx = browser.new_context(**PHONE, **extra)
    ctx.add_init_script(SEED)
    ctx.add_init_script(RECORDER)
    return ctx, ctx.new_page()


def sample(pg, sel, action, ms=900):
    pg.evaluate("(sel) => window.__s.start(sel)", sel)
    action()
    pg.wait_for_timeout(ms)
    return pg.evaluate("() => window.__s.stop()")


def moving(f):
    return f["op"] < 0.99 or abs(f["tx"]) > 0.5


def summary(res):
    fr = [f for f in res["frames"] if f["found"]]
    pops = sum(1 for a, b in zip(fr, fr[1:]) if a["sig"] != b["sig"] and not moving(a) and not moving(b))
    peak = max((f["tx"] for f in fr), key=abs, default=0)
    return {
        "frames": len(fr),
        "animated": sum(1 for f in fr if moving(f)),
        "min_op": min((f["op"] for f in fr), default=1),
        "peak_tx": peak,
        "pops": pops,
        "changed": len({f["sig"] for f in fr}) > 1,
        "end_op": fr[-1]["op"] if fr else None,
        "end_tx": fr[-1]["tx"] if fr else None,
        "min_h": min((f["h"] for f in fr), default=0),
        "vt": res["vt"],
    }


def settled(pg, sel):
    return pg.evaluate(
        """(sel) => { const el = [...document.querySelectorAll(sel)].find((e) => e.getClientRects().length > 0);
        return el ? [el.style.minHeight || '', el.getAnimations().length, getComputedStyle(el).transform] : null }""",
        sel,
    )


def part_add(browser):
    ctx, pg = new_page(browser)
    pg.goto(f"{BASE}/add", wait_until="networkidle")
    pg.locator("[data-food-row]:visible").first.wait_for(timeout=15000)
    pg.wait_for_timeout(1200)
    sel = "[data-glide]"
    check(pg.evaluate("(s) => document.querySelector(s).getAnimations().length", sel) == 0, "add: no animation on first mount")
    chips = pg.locator("[role=group][aria-label='Lọc món theo nhóm']:visible").first
    dam = chips.get_by_role("button", name="Đạm", exact=True)
    all_ = chips.get_by_role("button", name="Tất cả", exact=True)

    s = summary(sample(pg, sel, lambda: dam.tap()))
    check(s["changed"] and s["animated"] >= 6, f"add Tất cả → Đạm: the list animates ({s['animated']} frames in motion, changed {s['changed']})")
    check(s["min_op"] < 0.5, f"add Tất cả → Đạm: it fades (lowest opacity {s['min_op']:.2f})")
    check(0 < s["peak_tx"] <= 16.5, f"add Tất cả → Đạm: a later chip comes in from the right, at most 16 px (peak {s['peak_tx']:.1f})")
    check(s["pops"] == 0, f"add Tất cả → Đạm: no pop ({s['pops']})")
    check(s["end_op"] == 1 and abs(s["end_tx"]) < 0.01 and s["min_h"] > 0, f"add Tất cả → Đạm: ends in place, opacity 1 (op {s['end_op']}, tx {s['end_tx']}, lowest height {s['min_h']:.0f})")
    check(settled(pg, sel)[:2] == ["", 0], f"add Tất cả → Đạm: no held height and nothing left running ({settled(pg, sel)})")

    s = summary(sample(pg, sel, lambda: all_.tap()))
    check(s["changed"] and s["pops"] == 0 and s["animated"] >= 6, f"add Đạm → Tất cả: animates, no pop ({s['animated']} frames, {s['pops']} pops)")
    check(-16.5 <= s["peak_tx"] < 0, f"add Đạm → Tất cả: an earlier chip comes in from the left (peak {s['peak_tx']:.1f})")

    # An empty state glides like a list (no pop of "Chưa có món yêu thích"): the demo account has no favourite
    s = summary(sample(pg, sel, lambda: chips.get_by_role("button", name="Yêu thích", exact=True).tap()))
    check("Chưa có món yêu thích" in pg.inner_text("body"), "add: Yêu thích shows its empty state in the demo")
    check(s["changed"] and s["animated"] >= 6 and s["pops"] == 0, f"add Đạm… → Yêu thích: the empty state glides in, no pop ({s['animated']} frames, {s['pops']} pops)")
    all_.tap()
    pg.wait_for_timeout(700)

    # A second tap while the first is still moving: no queue, it lands on the second chip's list
    def two_taps():
        dam.tap()
        pg.wait_for_timeout(40)
        chips.get_by_role("button", name="Tinh bột", exact=True).tap()

    s = summary(sample(pg, sel, two_taps, 1100))
    shown = pg.evaluate("(s) => document.querySelector(s).getAttribute('data-glide')", sel)
    check(shown == "tinh_bot" and s["end_op"] == 1 and s["pops"] == 0, f"add: a tap while it moves lands on the second chip, no pop (shows {shown}, pops {s['pops']})")
    check(chips.get_by_role("button", name="Tinh bột", exact=True).get_attribute("aria-pressed") == "true", "add: the second chip is the lit one")
    check(settled(pg, sel)[:2] == ["", 0], f"add: after the interrupted switch nothing is held or running ({settled(pg, sel)})")
    ctx.close()


def part_rich(browser):
    ctx, pg = new_page(browser)
    pg.goto(f"{BASE}/explore/rich/calcium", wait_until="networkidle")
    pg.locator("a[data-food-row]:visible").first.wait_for(timeout=15000)
    pg.wait_for_timeout(1200)
    sel = "[data-glide]"
    check(pg.evaluate("(s) => document.querySelector(s).getAnimations().length", sel) == 0, "Giàu: no animation on first mount")
    s = summary(sample(pg, sel, lambda: pg.get_by_role("button", name="Mỗi khẩu phần").tap()))
    check(s["changed"] and s["animated"] >= 6 and s["pops"] == 0 and s["vt"] == 0, f"Giàu Mỗi khẩu phần: animates, no pop, no view transition ({s['animated']} frames, {s['pops']} pops, vt {s['vt']})")
    s = summary(sample(pg, sel, lambda: pg.get_by_role("tab", name="Thực phẩm bổ sung", exact=True).tap()))
    check(s["changed"] and s["animated"] >= 6 and s["pops"] == 0 and s["vt"] == 0, f"Giàu Thực phẩm bổ sung: animates, no pop, no view transition ({s['animated']} frames, {s['pops']} pops, vt {s['vt']})")
    check(0 < s["peak_tx"] <= 16.5, f"Giàu: the later tab comes in from the right (peak {s['peak_tx']:.1f})")
    s = summary(sample(pg, sel, lambda: pg.get_by_role("tab", name="Thực phẩm", exact=True).tap()))
    check(-16.5 <= s["peak_tx"] < 0 and s["pops"] == 0, f"Giàu: the earlier tab comes in from the left (peak {s['peak_tx']:.1f}, pops {s['pops']})")
    ctx.close()


def part_tabs(browser):
    ctx, pg = new_page(browser)
    pg.goto(f"{BASE}/app", wait_until="networkidle")
    pg.wait_for_timeout(1500)
    sel = "[data-glide-enter]"
    check(pg.evaluate("() => document.querySelectorAll('.m-tab-in').length") == 0, "tabs: no glide on first load")

    def nav(name):
        return pg.get_by_role("link", name=name).locator("visible=true").first

    s = summary(sample(pg, sel, lambda: nav("Khám phá").tap(), 700))
    check(s["animated"] >= 4 and s["vt"] == 0, f"tabs Hôm nay → Khám phá: it glides ({s['animated']} frames in motion), no view transition ({s['vt']})")
    check(0 < s["peak_tx"] <= 12.5, f"tabs Hôm nay → Khám phá: from the right, at most 12 px (peak {s['peak_tx']:.1f})")
    check(0.4 < s["min_op"] < 0.6 and s["end_op"] == 1 and abs(s["end_tx"]) < 0.01, f"tabs Hôm nay → Khám phá: fades in and ends in place (lowest {s['min_op']:.2f}, end {s['end_op']}, {s['end_tx']})")
    check(pg.evaluate("() => document.querySelectorAll('.m-tab-in').length") == 1 and settled(pg, sel)[1] == 0, "tabs: nothing is left running or held after it")
    s = summary(sample(pg, sel, lambda: nav("Hôm nay").tap(), 700))
    check(-12.5 <= s["peak_tx"] < 0 and s["animated"] >= 4 and s["vt"] == 0, f"tabs Khám phá → Hôm nay: from the left (peak {s['peak_tx']:.1f}, {s['animated']} frames, vt {s['vt']})")

    # Tổng quan sub-tabs: the content inside the frame glides, the frame (header, tab bar) stays
    pg.goto(f"{BASE}/trends", wait_until="networkidle")
    pg.wait_for_timeout(1500)
    inner = "main [data-glide-enter]"
    s = summary(sample(pg, inner, lambda: pg.get_by_role("link", name="Năng lượng", exact=True).locator("visible=true").first.tap(), 800))
    check(s["animated"] >= 4 and 0 < s["peak_tx"] <= 12.5 and s["vt"] == 0, f"Tổng quan Tóm tắt → Năng lượng: glides from the right ({s['animated']} frames, peak {s['peak_tx']:.1f}, vt {s['vt']})")
    ctx.close()


def part_reduced(browser):
    ctx, pg = new_page(browser, reduced_motion="reduce")
    pg.goto(f"{BASE}/add", wait_until="networkidle")
    pg.locator("[data-food-row]:visible").first.wait_for(timeout=15000)
    pg.wait_for_timeout(1200)
    chips = pg.locator("[role=group][aria-label='Lọc món theo nhóm']:visible").first
    res = sample(pg, "[data-glide]", lambda: chips.get_by_role("button", name="Đạm", exact=True).tap())
    s = summary(res)
    fr = [f for f in res["frames"] if f["found"] and f["op"] < 0.99]
    span = (fr[-1]["t"] - fr[0]["t"]) if fr else 0
    check(s["changed"] and s["animated"] >= 1 and all(abs(f["tx"]) < 0.01 for f in res["frames"]), f"reduced motion: a cross-fade, nothing slides ({s['animated']} frames, peak {s['peak_tx']:.1f})")
    check(span <= 220, f"reduced motion: the fade is 120 ms, not more than ~200 (spanned {span:.0f} ms)")
    pg.goto(f"{BASE}/app", wait_until="networkidle")
    pg.wait_for_timeout(1200)
    s = summary(sample(pg, "[data-glide-enter]", lambda: pg.get_by_role("link", name="Khám phá").locator("visible=true").first.tap(), 600))
    check(all(abs(f["tx"]) < 0.01 for f in []) and abs(s["peak_tx"]) < 0.01, f"reduced motion: a tab fades in without sliding (peak {s['peak_tx']:.1f})")
    ctx.close()


def main():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        part_add(browser)
        part_rich(browser)
        part_tabs(browser)
        part_reduced(browser)
        browser.close()
    print(f"\n{len(problems)} problem(s)")
    sys.exit(1 if problems else 0)


if __name__ == "__main__":
    main()
