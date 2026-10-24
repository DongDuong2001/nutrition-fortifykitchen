"""The scenarios of goal_moments.py and goal_moments_day.py (feat/sound-goals). Not a probe (run_all.py skips names that start with \"_\")."""
import re

import _demo

from _goals_lib import *  # noqa: F401,F403

R = Report()
SAVED_PROFILE = '{"sex":"male","birthYear":2003,"weightKg":65,"goal":"maintain","periodMode":false,"trainingMinutesDefault":60,"displayName":""}'
check = R.check


def seen(pg, cls=None, what=None):
    return {(e["cls"], e["what"]) for e in fx(pg) if (cls is None or e["cls"] == cls) and (what is None or e["what"] == what)}


def hero_label(pg):
    return pg.evaluate("document.querySelector('[data-fx=hero] h2')?.innerText.replace(/\\s+/g, ' ').trim() || ''")


def polite(pg):
    return pg.evaluate("[...document.querySelectorAll('p[aria-live=polite].sr-only')].map((e) => e.textContent.trim()).join('|')")


def wait_class(pg, cls, timeout=5000):
    try:
        pg.wait_for_function("(c) => document.querySelector('.' + c)", arg=cls, timeout=timeout)
        return True
    except Exception:
        return False


def t1(browser, vp, tag):
    ctx = new_context(browser, vp)
    pg = ctx.new_page()
    errors = []
    pg.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
    open_home(pg)
    before = row_pct(pg, "vitamin_c")
    check(before is not None and before < 100, f"{tag} T1: the demo day's Vitamin C is under 100 % ({before})")
    pg.evaluate(WATCH)
    sounds = sound_count(pg)
    add_from_sheet(pg, "Bưởi da xanh", 150)
    check(wait_class(pg, "m-goal-pop"), f"{tag} T1: a percent pops after the sheet has left")
    pg.screenshot(path=f"{SHOTS}/t1-{tag}.png", animations="allow")
    pg.wait_for_timeout(900)
    check(row_pct(pg, "vitamin_c") >= 100, f"{tag} T1: Vitamin C is at {row_pct(pg, 'vitamin_c')} %")
    check(("m-goal-pop", "vitamin_c") in seen(pg), f"{tag} T1: the Vitamin C percent pops")
    check(("m-goal-sheen", "vitamin_c") in seen(pg), f"{tag} T1: its bar gets one sheen")
    check(("m-goal-pop", "count") in seen(pg), f"{tag} T1: the counter pops")
    check(not seen(pg, "m-goal-ring") and not seen(pg, "m-goal-sparks"), f"{tag} T1: no ring, no sparks")
    check(polite(pg) == "Vitamin C đạt mục tiêu", f"{tag} T1: the polite line says it ({polite(pg)!r})")
    pg.wait_for_timeout(1600)
    check(live_classes(pg) == [], f"{tag} T1: every goal class is gone 1.6 s later ({live_classes(pg)})")
    check(sound_count(pg) - sounds == 2, f"{tag} T1: the add and the goal made 2 sounds ({sound_count(pg) - sounds})")
    # 2: the same goal again today
    pg.evaluate("window.__fx.length = 0")
    sounds = sound_count(pg)
    add_from_sheet(pg, "Bưởi da xanh", 50)
    pg.wait_for_timeout(1800)
    check(not fx(pg), f"{tag} 2: a second add the same day plays nothing ({[(e['cls'], e['what']) for e in fx(pg)]})")
    check(sound_count(pg) - sounds == 1, f"{tag} 2: only the add makes a sound ({sound_count(pg) - sounds})")
    check(not [e for e in errors if "favicon" not in e], f"{tag}: no console errors {errors}")
    ctx.close()


def t2(browser, vp, tag):
    ctx = new_context(browser, vp)
    pg = ctx.new_page()
    open_home(pg)
    usual = hero_label(pg)
    pg.evaluate(WATCH)
    add_from_sheet(pg, "Cơm ngũ đậu", 1000)
    check(wait_class(pg, "m-goal-ring"), f"{tag} T2: the hero gets its ring")
    pg.screenshot(path=f"{SHOTS}/t2-{tag}.png", animations="allow")
    check(hero_label(pg) == "Đủ kcal hôm nay", f"{tag} T2: the label reads it ({hero_label(pg)!r})")
    pg.wait_for_timeout(500)
    check(("m-goal-pop", "kcal-pct") in seen(pg), f"{tag} T2: the kcal percent pops")
    check(("m-goal-sheen", "kcal-bar") in seen(pg) or any(w == "hero" or w == "kcal-bar" or w == "div" for _, w in seen(pg, "m-goal-sheen")), f"{tag} T2: the kcal bar sheens ({seen(pg, 'm-goal-sheen')})")
    pg.wait_for_timeout(2600)
    check(hero_label(pg) == usual or hero_label(pg).startswith("Cả ngày"), f"{tag} T2: the usual label glides back ({hero_label(pg)!r})")
    check(live_classes(pg) == [], f"{tag} T2: every goal class is gone ({live_classes(pg)})")
    ctx.close()


def spark_bounds_ok(pg):
    return pg.evaluate("""() => {
      const card = document.querySelector('aside[data-fx=column]').getBoundingClientRect();
      const layer = document.querySelector('[data-fx=sparks]').getBoundingClientRect();
      const host = document.querySelector('.m-goal-sparks');
      if (!host) return { n: 0 };
      const hx = parseFloat(host.style.left), hy = parseFloat(host.style.top);
      const out = [];
      for (const i of host.children) {
        const a = parseFloat(i.style.getPropertyValue('--a')) * Math.PI / 180, d = parseFloat(i.style.getPropertyValue('--d'));
        const x = hx + d * Math.cos(a), y = hy + d * Math.sin(a);
        out.push([x - 3 >= -8, y - 3 >= -8, x + 3 <= card.width + 8, y + 3 <= card.height + 8].every(Boolean));
      }
      return { n: out.length, ok: out.every(Boolean), sameBox: Math.abs(layer.left - card.left) < 1 && Math.abs(layer.top - card.top) < 1 };
    }""")


def t3(browser, vp, tag):
    ctx = new_context(browser, vp)
    pg = ctx.new_page()
    open_home(pg)
    pg.evaluate(WATCH)
    add_from_sheet(pg, "Bưởi da xanh", 150)
    pg.wait_for_timeout(2200)
    add_from_sheet(pg, "Sữa", 700)
    pg.wait_for_timeout(2200)
    pg.evaluate("window.__fx.length = 0")
    add_from_sheet(pg, "Cải bó xôi", 300)
    pg.wait_for_timeout(2200)
    check("8/8" in column_text(pg), f"{tag} T3: the counter is 8/8 ({column_text(pg)!r})")
    check("Thiếu nhiều nhất: Chất xơ" in column_text(pg), f"{tag} T3: with Chất xơ short the slot names it ({column_text(pg)!r})")
    check(not seen(pg, "m-goal-sparks") and ("m-goal-pop", "count") in seen(pg), f"{tag} T3: no Đủ chất yet, only the T1 of Vitamin A")
    pg.evaluate("window.__fx.length = 0")
    add_from_sheet(pg, "Đậu gà", 120)
    check(wait_class(pg, "m-goal-sparks"), f"{tag} T3: the sparks fly")
    # ~350 ms into the 600 ms flight (the screenshot itself takes ~100 ms): the sparks in the air and the Đủ chất line on the card
    pg.wait_for_timeout(250)
    got = pg.evaluate("document.querySelectorAll('.m-goal-sparks > i').length")
    pg.screenshot(path=f"{SHOTS}/t3-{tag}.png", animations="allow")
    check(pg.evaluate("document.querySelector('[data-fx=done-line]')?.textContent.trim()") == "Đủ chất hôm nay", f"{tag} T3: the line is on the card while the sparks fly")
    check(("m-goal-sheen", "fiber") in seen(pg) or any(e["cls"] == "m-goal-sheen" for e in fx(pg)), f"{tag} T3: the bars sheen")
    check(got == 10, f"{tag} T3: ten sparks ({got})")
    bounds = spark_bounds_ok(pg)
    check(bounds.get("n") == 10 and bounds.get("ok") and bounds.get("sameBox"), f"{tag} T3: every spark ends within the card ±8 px, in a layer beside it ({bounds})")
    check(pg.evaluate("document.querySelector('aside[data-fx=column]').contains(document.querySelector('.m-goal-sparks'))") is False, f"{tag} T3: the sparks are not inside the clipped card")
    pg.wait_for_timeout(900)
    sheens = [e for e in fx(pg) if e["cls"] == "m-goal-sheen"]
    check(2 <= len({e["what"] for e in sheens}) <= 10, f"{tag} T3: the visible bars sheen, at most 10 ({len({e['what'] for e in sheens})})")
    check("Đủ chất hôm nay" in column_text(pg), f"{tag} T3: the slot reads Đủ chất hôm nay ({column_text(pg)!r})")
    check(polite(pg) == "Đủ chất hôm nay", f"{tag} T3: the polite line ({polite(pg)!r})")
    # RA3: Hoàn tác (it takes out the adds that share its toast) brings Thiếu nhiều nhất back, silently; adding the foods again replays nothing
    pg.evaluate("window.__fx.length = 0")
    sounds = sound_count(pg)
    undo = pg.get_by_role("button", name="Hoàn tác").locator("visible=true")
    check(undo.count() > 0, f"{tag} RA3: the add's toast still offers Hoàn tác")
    if undo.count():
        undo.first.click()
        pg.wait_for_timeout(1500)
        text = column_text(pg)
        check("Thiếu nhiều nhất" in text and "Đủ chất" not in text, f"{tag} RA3: after Hoàn tác the slot is back to Thiếu nhiều nhất ({text!r})")
        check(not fx(pg), f"{tag} RA3: the way down has no motion ({[(e['cls'], e['what']) for e in fx(pg)]})")
        check(sound_count(pg) - sounds == 1, f"{tag} RA3: only the undo's own sound ({sound_count(pg) - sounds})")
        for name, grams in (("Bưởi da xanh", 150), ("Sữa", 700), ("Cải bó xôi", 300), ("Đậu gà", 120)):
            add_from_sheet(pg, name, grams)
            pg.wait_for_timeout(1200)
        check("Đủ chất hôm nay" in column_text(pg), f"{tag} RA3: back to Đủ chất with the numbers ({column_text(pg)!r})")
        check(not seen(pg, "m-goal-sheen") and not seen(pg, "m-goal-sparks") and not seen(pg, "m-goal-pop"), f"{tag} RA3: and no replay that day ({[(e['cls'], e['what']) for e in fx(pg)]})")
    pg.wait_for_timeout(1200)
    check(live_classes(pg) == [] and pg.evaluate("document.querySelectorAll('.m-goal-sparks').length") == 0, f"{tag} T3: nothing is left over ({live_classes(pg)})")
    ctx.close()


def reduced(browser):
    ctx = new_context(browser, PHONE, reduced_motion="reduce")
    pg = ctx.new_page()
    open_home(pg)
    pg.evaluate(WATCH)
    add_from_sheet(pg, "Bưởi da xanh", 150)
    pg.wait_for_timeout(1800)
    check(not fx(pg), f"reduced: no goal class at all ({[(e['cls'], e['what']) for e in fx(pg)]})")
    check(polite(pg) == "Vitamin C đạt mục tiêu", f"reduced: the words still change ({polite(pg)!r})")
    pg.evaluate("window.__fx.length = 0")
    add_from_sheet(pg, "Cơm ngũ đậu", 1000)
    pg.wait_for_timeout(700)
    check(hero_label(pg) == "Đủ kcal hôm nay", f"reduced: the label still says Đủ kcal hôm nay ({hero_label(pg)!r})")
    check(not seen(pg, "m-goal-pop") and not seen(pg, "m-goal-ring") and not seen(pg, "m-goal-sheen") and not seen(pg, "m-goal-sparks"), "reduced: no pop, ring, sheen or sparks")
    ctx.close()


def sound_off(browser):
    ctx = new_context(browser, PHONE, sound=False)
    pg = ctx.new_page()
    open_home(pg)
    add_from_sheet(pg, "Bưởi da xanh", 150)
    pg.wait_for_timeout(1500)
    check(sound_count(pg) == 0, f"Âm thanh off: no sound node ({sound_count(pg)})")
    ctx.close()


def first_food(browser, demo):
    _demo.enable(demo)
    try:
        ctx = new_context(browser, PHONE)
        if not demo:
            # An account that has set up its profile and logged nothing (as smoke.py's empty-account pass)
            ctx.add_init_script("try { localStorage.setItem('h1t_profile_v1_first.food@example.com', JSON.stringify(%s)); } catch (e) {}" % SAVED_PROFILE)
        pg = ctx.new_page()
        if not demo:
            # Outside demo mode the mock store has no account until someone signs in (the magic-link request signs the email in)
            pg.goto(BASE + "/signin", wait_until="networkidle")
            pg.locator('input[type="email"]').fill("first.food@example.com")
            pg.get_by_role("button", name="Gửi liên kết đăng nhập qua email").click()
            pg.wait_for_url("**/signin/check-email")
        open_home(pg)
        usual = hero_label(pg)
        sounds = sound_count(pg)
        add_from_sheet(pg, "Bưởi da xanh", 100)
        pg.wait_for_timeout(700)
        label = hero_label(pg)
        if demo:
            check(label != "Món đầu tiên!", "demo: never a first-food moment")
        else:
            check(label == "Món đầu tiên!", f"first food: the hero label reads Món đầu tiên! ({label!r})")
            pg.screenshot(path=f"{SHOTS}/first-food-390.png", animations="allow")
            pg.wait_for_timeout(2900)
            check(hero_label(pg) != "Món đầu tiên!", f"first food: the usual label is back ({hero_label(pg)!r})")
            check(sound_count(pg) - sounds >= 2, f"first food: the add and the goal made sounds ({sound_count(pg) - sounds})")
            try:
                add_from_sheet(pg, "Bưởi da xanh", 100)
            except Exception:
                pg.screenshot(path=f"{SHOTS}/_second-add-fail.png")
                raise
            pg.wait_for_timeout(1200)
            check(hero_label(pg) != "Món đầu tiên!", "first food: the second add has none")
        ctx.close()
    finally:
        _demo.enable(True)


def training(browser, vp, tag):
    ctx = new_context(browser, vp)
    pg = ctx.new_page()
    pg.goto(BASE + "/training?duration=45", wait_until="networkidle")
    pg.wait_for_timeout(1500)
    boxes = pg.locator('input[type=checkbox]:visible')
    n = boxes.count()
    check(n >= 2, f"{tag} Ngày tập: the checklist has items ({n})")
    pg.evaluate(WATCH)
    for i in range(n):
        box = pg.locator('input[type=checkbox]:visible').nth(i)
        if box.is_checked():
            continue
        box.click()
        pg.wait_for_timeout(500)
        add = pg.get_by_role("button", name=re.compile("^Thêm")).locator("visible=true")
        if add.count():
            add.last.click()
            pg.wait_for_timeout(900)
        pg.wait_for_timeout(300)
    headers = lambda: pg.evaluate("[...document.querySelectorAll('[data-tour=training-checklist] h2')].filter((e) => e.getBoundingClientRect().width > 0).map((e) => e.innerText.trim())")
    check(wait_text(pg, "Xong Ngày tập hôm nay"), f"{tag} Ngày tập: the completing phase's header says Xong Ngày tập hôm nay")
    pg.screenshot(path=f"{SHOTS}/day-{tag}.png", animations="allow")
    check(sum("xong ngày tập hôm nay" in h.lower() for h in headers()) == 1, f"{tag} Ngày tập: on one phase only ({headers()})")
    check(("m-goal-pop", "span") in seen(pg), f"{tag} Ngày tập: its x / y pops ({sorted(seen(pg))})")
    check("Xong Ngày tập hôm nay" in polite(pg), f"{tag} Ngày tập: the polite line ({polite(pg)!r})")
    check(not seen(pg, "m-goal-ring"), f"{tag} Ngày tập: no ring")
    pg.wait_for_timeout(3000)
    check(not any("xong" in h.lower() for h in headers()), f"{tag} Ngày tập: the phase name glides back ({headers()})")
    pg.wait_for_timeout(800)
    check(live_classes(pg) == [], f"{tag} Ngày tập: no class is left ({live_classes(pg)})")
    # an untick then a tick again plays nothing
    box = pg.locator('input[type=checkbox]:visible').nth(0)
    box.click()
    pg.wait_for_timeout(700)
    box = pg.locator('input[type=checkbox]:visible').nth(0)
    box.click()
    pg.wait_for_timeout(700)
    add = pg.get_by_role("button", name=re.compile("^Thêm")).locator("visible=true")
    if add.count():
        add.last.click()
    pg.wait_for_timeout(1200)
    check(not any("xong" in h.lower() for h in headers()), f"{tag} Ngày tập: untick then tick again plays nothing ({headers()})")
    ctx.close()


def wait_text(pg, text, timeout=6000):
    try:
        pg.wait_for_function("(t) => document.body.innerText.includes(t)", arg=text, timeout=timeout)
        return True
    except Exception:
        return False


def sound_row(browser):
    for vp, tag in ((PHONE, "390"), (DESKTOP, "1440")):
        ctx = new_context(browser, vp)
        pg = ctx.new_page()
        pg.goto(BASE + "/settings", wait_until="networkidle")
        pg.wait_for_timeout(1500)
        row = pg.locator('[role=switch][aria-label="Âm thanh"]:visible').first
        check(row.count() == 1, f"{tag} Cài đặt: the Âm thanh switch is there")
        card = pg.locator("section[aria-label='Ứng dụng']:visible").first
        # Scrolled clear of the bottom nav, with Rung khi chạm above it (a phone that can vibrate shows that row)
        card.evaluate("el => el.scrollIntoView({ block: 'start' })")
        pg.evaluate("window.scrollBy(0, -80)")
        pg.wait_for_timeout(300)
        check(row.get_attribute("aria-checked") == "true", f"{tag} Cài đặt: on by default")
        before = sound_count(pg)
        row.click()
        pg.wait_for_timeout(300)
        row.click()
        pg.wait_for_timeout(600)
        check(sound_count(pg) - before == 1, f"{tag} Cài đặt: switching it on plays the add sound once ({sound_count(pg) - before})")
        haptics = pg.locator('[role=switch][aria-label="Rung khi chạm"]:visible').count()
        nav_top = pg.evaluate("(() => { const n = document.querySelector('#mobile-add-fab')?.closest('nav, [role=navigation]'); const r = n && n.getBoundingClientRect(); return r && r.width > 0 ? r.top : null; })()")
        box = card.bounding_box()
        if tag == "390":
            sw = row.bounding_box()
            check(nav_top is not None and sw["y"] + sw["height"] < nav_top, f"{tag} Cài đặt: the Âm thanh row is clear of the bottom nav (its bottom {sw['y'] + sw['height']:.0f}, nav top {nav_top})")
        if tag == "390":
            check(haptics == 1, f"{tag} Cài đặt: Rung khi chạm is the row above Âm thanh on a phone")
        pg.screenshot(path=f"{SHOTS}/sound-row-{tag}.png", clip={"x": 0, "y": max(0, box["y"] - 8), "width": vp["viewport"]["width"], "height": min(box["height"] + 16, vp["viewport"]["height"] - max(0, box["y"] - 8))})
        ctx.close()


