"""share-spotlight: make "Chia sẻ" easy to find on Hôm nay.

- The button: the share glyph and "Chia sẻ" in a 44 px pill, one line, not cut, at 360, 360 with 150 % text and 390 (tips off).
- The spotlight, right after "Có gì mới" is closed (Để sau), with food logged today: the page dimmed but the button, a bubble with
  "Chia sẻ ngày ăn của bạn" / "Ảnh tóm tắt đẹp, gửi ngay cho bạn bè hoặc HLV.", Để sau and Thử ngay. Thử ngay opens the share sheet and
  records share-tip-try; the day is saved as the share tip's day.
- Not after Có gì mới on an empty day; the next app open with one food shows it (Có gì mới already seen). Not once the account has shared.
- Để sau counts: shown again (the next day: the 24 h gap is cleared here) after one Để sau, never after two.
- The nudge: Hôm nay reaches 80 % kcal and five vitamins or minerals at Gần đủ or Đạt (a deleted food is put back with Hoàn tác): a toast
  "Hôm nay ăn khá đủ chất — chia sẻ nhé?" with Chia sẻ, after the Hoàn tác toast has gone; once a day; not on the day of the spotlight; not
  with tips off; its Chia sẻ opens the share sheet.
Shots: .screenshots/share-spotlight/<button|spotlight|nudge>-<360|360-text150|390>.png.
Run with: ALIGN_BASE_URL=http://localhost:3101 npm run probe -- tests/probes/share_spotlight.py
"""
# PROBE_COVERS: components/home/home-screen.tsx components/onboarding/** components/diary-toast.tsx lib/tips.ts lib/share-nudge.ts lib/interruption.ts lib/onboarding-flags.ts lib/onboarding-store.ts
import json
import os
import re
import sys
import time
from pathlib import Path

import _demo  # noqa: F401
import _seed
from playwright.sync_api import sync_playwright

BASE = os.environ.get("ALIGN_BASE_URL", "http://localhost:3101")
OUT = Path(__file__).resolve().parent.parent.parent / ".screenshots" / "share-spotlight"
OUT.mkdir(parents=True, exist_ok=True)
ROOT = Path(__file__).resolve().parent.parent.parent
RELEASE = re.search(r'id:\s*"(20\d\d-\d\d-\d\d[a-z]?)"', (ROOT / "lib" / "releases.ts").read_text(encoding="utf-8")).group(1)
SIZES = [("360", {"width": 360, "height": 780}, False), ("360-text150", {"width": 360, "height": 780}, True), ("390", {"width": 390, "height": 844}, False)]
SETTINGS_KEY = "h1t_settings_v1_demo"
NO_INSTALL = {"installPrompt": {"dismissCount": 0, "snoozeUntil": 0, "done": True, "firstSeenIso": "2026-01-01"}}
NAMED_PROFILE = json.dumps({"sex": "male", "birthYear": 2003, "weightKg": 65.4, "goal": "maintain", "periodMode": False, "trainingMinutesDefault": 60, "displayName": "Học viên A", "hintSeen": True})
problems = []


def check(cond, msg):
    print(("[PASS] " if cond else "[FAIL] ") + msg)
    if not cond:
        problems.append(msg)


def page(browser, size, onboarding=None, foods=7, whats_new=False, tips=True):
    """Hôm nay with `foods` of the sample day's 7 foods (item-1..item-7) and these onboarding flags (tour done)."""
    _seed.onboarding(tips)
    _seed.whats_new(whats_new)
    ctx = browser.new_context(viewport=size, accept_downloads=True)
    gone = {f"item-{i}": {"deleted": True} for i in range(foods + 1, 8)}
    settings = {"onboarding": {"tourDone": True, "replayOpened": True, **(onboarding or {})}, **NO_INSTALL}
    ctx.add_init_script(
        "try {"
        f"if (localStorage.getItem('h1t_sample_edits_v1_demo') === null) localStorage.setItem('h1t_sample_edits_v1_demo', {json.dumps(json.dumps(gone))});"
        f"if (localStorage.getItem('{SETTINGS_KEY}') === null) localStorage.setItem('{SETTINGS_KEY}', {json.dumps(json.dumps(settings))});"
        f"localStorage.setItem('h1t_profile_v1_demo', {json.dumps(NAMED_PROFILE)});"
        "} catch (e) {}"
    )
    pg = ctx.new_page()
    errors = []
    pg.on("pageerror", lambda e: errors.append(str(e)))
    return ctx, pg, errors


def home(pg, big=False):
    pg.goto(BASE + "/app", wait_until="networkidle")
    pg.wait_for_timeout(400)
    if big:
        pg.evaluate("document.documentElement.style.fontSize = '150%'")
        pg.wait_for_timeout(300)


def flags(pg):
    raw = pg.evaluate(f"() => localStorage.getItem('{SETTINGS_KEY}')")
    try:
        return (json.loads(raw) or {}).get("onboarding", {}) if raw else {}
    except Exception:
        return {}


def set_flags(pg, **over):
    pg.evaluate(
        "([key, over]) => { const s = JSON.parse(localStorage.getItem(key) || '{}'); s.onboarding = { ...(s.onboarding || {}), ...over }; localStorage.setItem(key, JSON.stringify(s)); }",
        [SETTINGS_KEY, over],
    )


def card(pg):
    return pg.locator('[data-onboarding-card]:not([data-state="closed"])')


def wait_card(pg, timeout=5000):
    try:
        card(pg).first.wait_for(state="visible", timeout=timeout)
        return True
    except Exception:
        return False


def shot(pg, name, tag):
    pg.screenshot(path=str(OUT / f"{name}-{tag}.png"))


def close_whats_new(pg):
    sheet = pg.get_by_role("dialog").filter(has=pg.locator("#whats-new-title"))
    sheet.wait_for(state="visible", timeout=10000)
    check(RELEASE in pg.content() or sheet.count() == 1, "Có gì mới opens")
    sheet.get_by_role("button", name="Để sau").click()
    sheet.wait_for(state="hidden", timeout=6000)


def button_case(browser, tag, size, big):
    ctx, pg, errors = page(browser, size, tips=False)
    home(pg, big)
    btn = pg.locator("[data-tour=home-share]:visible").first
    # C3 (homnay-c2.md item 4b): the glyph and the word sit in a pill span inside the button; the lines are the word's own span
    info = btn.evaluate(
        """b => { const r = b.getBoundingClientRect(), t = [...b.querySelectorAll('span')].find((s) => s.textContent.trim() && !s.querySelector('span')); const q = document.createRange(); q.selectNodeContents(t);
                 const lines = new Set([...q.getClientRects()].map((x) => Math.round(x.top))).size;
                 return { h: r.height, w: r.width, text: t.textContent, lines, cut: b.scrollWidth > b.clientWidth + 1, svg: !!b.querySelector('svg'), right: r.right, vw: innerWidth }; }"""
    )
    check(info["text"] == "Chia sẻ" and info["svg"], f"{tag}: the button is the share glyph and Chia sẻ ({info['text']!r})")
    check(info["h"] >= 44, f"{tag}: the pill is {info['h']:.0f} px high")
    check(info["lines"] == 1 and not info["cut"], f"{tag}: Chia sẻ on one line, not cut ({info['lines']} lines)")
    check(info["right"] <= info["vw"], f"{tag}: the pill is inside the screen ({info['right']:.0f} of {info['vw']})")
    check(btn.get_attribute("aria-label") == "Chia sẻ ngày này", f"{tag}: its name is Chia sẻ ngày này")
    # Nothing else in the header row is cut or pushed off
    header = pg.locator("header").first
    cut = header.evaluate("h => [...h.querySelectorAll('*')].filter((e) => !e.closest('.sr-only') && e.scrollWidth > e.clientWidth + 1 && getComputedStyle(e).overflowX !== 'visible').map((e) => e.textContent.trim().slice(0, 30))")
    check(not cut, f"{tag}: nothing in the header is cut {cut}")
    check(pg.evaluate("document.documentElement.scrollWidth <= innerWidth"), f"{tag}: no sideways scroll")
    shot(pg, "button", tag)
    check(not errors, f"{tag}: no page errors {errors[:1]}")
    ctx.close()


def spotlight_after_whats_new(browser, tag, size, big):
    ctx, pg, errors = page(browser, size, {"whatsNewSeen": "2026-10-21c"}, foods=3, whats_new=True)
    home(pg, big)
    close_whats_new(pg)
    check(wait_card(pg, 5000), f"{tag}: the share spotlight follows Có gì mới")
    body = card(pg).inner_text()
    check("Chia sẻ ngày ăn của bạn" in body and "Ảnh tóm tắt đẹp, gửi ngay cho bạn bè hoặc HLV." in body, f"{tag}: the bubble's copy ({body[:90]!r})")
    names = [b.inner_text().strip() for b in card(pg).get_by_role("button").all()]
    check(names == ["Để sau", "Thử ngay"], f"{tag}: Để sau and Thử ngay ({names})")
    geo = pg.evaluate(
        """() => { const b = document.querySelector("[data-tour='home-share']:not([hidden])").getBoundingClientRect();
                   const hole = [...document.querySelectorAll('[data-onboarding-overlay] > div')].find((d) => d.className.includes('border-sky')).getBoundingClientRect();
                   const c = document.querySelector('[data-onboarding-card]').getBoundingClientRect();
                   return { inHole: hole.left <= b.left + 1 && hole.right >= b.right - 1 && hole.top <= b.top + 1 && hole.bottom >= b.bottom - 1,
                            cardInside: c.left >= 0 && c.right <= innerWidth && c.bottom <= innerHeight, dim: document.querySelectorAll('[data-onboarding-overlay] > div[aria-hidden=true]').length }; }"""
    )
    check(geo["inHole"], f"{tag}: the hole holds the Chia sẻ pill")
    check(geo["dim"] >= 4, f"{tag}: the rest of the page is dimmed")
    check(geo["cardInside"], f"{tag}: the bubble is on screen")
    cut = card(pg).evaluate("c => [...c.querySelectorAll('*')].filter((e) => e.scrollWidth > e.clientWidth + 1 && getComputedStyle(e).overflowX !== 'visible').length")
    check(cut == 0, f"{tag}: nothing in the bubble is cut")
    pg.wait_for_timeout(400)
    shot(pg, "spotlight", tag)
    f = flags(pg)
    check("home-share" in f.get("seen", []) and f.get("tipShownAt") and f.get("shareTipIso"), f"{tag}: it counts as the day's tip and saves its day ({f.get('shareTipIso')})")
    card(pg).get_by_role("button", name="Thử ngay").click()
    pg.wait_for_timeout(500)
    check(card(pg).count() == 0, f"{tag}: Thử ngay closes it")
    sheet = pg.get_by_role("dialog", name="Chia sẻ ngày này")
    try:
        sheet.wait_for(state="visible", timeout=10000)
        opened = True
    except Exception:
        opened = False
    check(opened, f"{tag}: Thử ngay opens the share sheet")
    check("share-tip-try" in flags(pg).get("used", []), f"{tag}: Thử ngay is remembered (never again)")
    check(not errors, f"{tag}: no page errors {errors[:1]}")
    ctx.close()


def not_after(browser):
    size = {"width": 390, "height": 844}
    # An empty day: Có gì mới closes and nothing follows
    ctx, pg, _ = page(browser, size, {"whatsNewSeen": "2026-10-21c"}, foods=0, whats_new=True)
    home(pg)
    close_whats_new(pg)
    check(not wait_card(pg, 3000), "empty day: no spotlight after Có gì mới")
    ctx.close()
    # The next app open, one food logged, Có gì mới already seen: it shows
    ctx, pg, _ = page(browser, size, {"whatsNewSeen": RELEASE}, foods=1)
    home(pg)
    check(wait_card(pg, 6000) and "Chia sẻ ngày ăn của bạn" in card(pg).inner_text(), "one food, the next app open: the spotlight shows")
    ctx.close()
    # The account has shared: Có gì mới closes and nothing follows
    ctx, pg, _ = page(browser, size, {"whatsNewSeen": "2026-10-21c", "used": ["share-day"]}, foods=3, whats_new=True)
    home(pg)
    close_whats_new(pg)
    check(not wait_card(pg, 3000), "after a share: no spotlight")
    ctx.close()


def later_twice(browser):
    size = {"width": 390, "height": 844}
    ctx, pg, _ = page(browser, size, {"whatsNewSeen": RELEASE}, foods=3)
    for n in (1, 2):
        home(pg)
        check(wait_card(pg, 6000) and "Chia sẻ ngày ăn của bạn" in card(pg).inner_text(), f"Để sau {n - 1}×: the spotlight shows")
        card(pg).get_by_role("button", name="Để sau").click()
        pg.wait_for_timeout(500)
        check(card(pg).count() == 0 and flags(pg).get("shareLater") == n, f"Để sau closes it and counts ({flags(pg).get('shareLater')})")
        set_flags(pg, tipShownAt=None)  # the next day
    home(pg)
    pg.wait_for_timeout(2500)
    check(card(pg).count() == 0 or "Chia sẻ ngày ăn của bạn" not in card(pg).inner_text(), "after Để sau twice: never again")
    ctx.close()


def over_the_line(pg):
    """The sample day is 1.041 of 2.275 kcal (46 %) with five nutrients at 80 % or more: Chỉ ghi kcal 900 in the add sheet takes it to 85 %."""
    pg.locator("[data-tour=nav-add]:visible").first.click()
    pg.locator("button[aria-label='Chỉ thêm kcal']:visible").first.click()
    pg.wait_for_timeout(400)
    pg.fill("#quick-kcal", "900")
    pg.get_by_role("button", name=re.compile("^Thêm vào ")).last.click()
    pg.wait_for_url(re.compile(r".*/app(\?.*)?$"), timeout=10000)
    # The pointer off the toast (a toast under the pointer waits)
    pg.mouse.move(5, 5)


def nudge(browser):
    size = {"width": 390, "height": 844}
    # Today's spotlight is done (Thử ngay was tapped once), tips on; a tip was shown an hour ago, so no tip covers the screens (24 h gap)
    base = {"whatsNewSeen": RELEASE, "used": ["share-tip-try"], "tipShownAt": int(time.time() * 1000) - 3600_000}
    ctx, pg, errors = page(browser, size, base, foods=7)
    home(pg)
    pg.wait_for_timeout(1500)
    toast = pg.locator(".m-toast-host")
    check("chia sẻ nhé" not in toast.inner_text(), "under the line: no nudge")
    over_the_line(pg)
    pg.wait_for_timeout(500)
    check("chia sẻ nhé" not in toast.inner_text() and "Đã thêm" in toast.inner_text(), "the add's toast (Hoàn tác) comes first")
    try:
        pg.get_by_text("Hôm nay ăn khá đủ chất — chia sẻ nhé?").wait_for(state="visible", timeout=12000)
        shown = True
    except Exception:
        shown = False
    check(shown, "the day gets over the line: the nudge shows once the add's toast has gone")
    if shown:
        shot(pg, "nudge", "390")
        check(flags(pg).get("shareNudgeIso") is not None, "the nudge saves its day")
        toast.get_by_role("button", name="Chia sẻ").click()
        try:
            pg.get_by_role("dialog", name="Chia sẻ ngày này").wait_for(state="visible", timeout=10000)
            check(True, "the nudge's Chia sẻ opens the share sheet")
        except Exception:
            check(False, "the nudge's Chia sẻ opens the share sheet")
    check(not errors, f"nudge: no page errors {errors[:1]}")
    ctx.close()
    # A day already over the line when the app opens: no nudge (it did not just get there)
    ctx, pg, _ = page(browser, size, base, foods=7)
    home(pg)
    over_the_line(pg)
    pg.wait_for_timeout(500)
    home(pg)
    pg.wait_for_timeout(7000)
    check("chia sẻ nhé" not in pg.locator(".m-toast-host").inner_text(), "a day already over the line at app open: no nudge")
    ctx.close()
    # Once a day, never on the spotlight's day, never with tips off
    for label, over in (
        ("the nudge already came today", {"shareNudgeIso": "TODAY"}),
        ("the spotlight showed today", {"shareTipIso": "TODAY"}),
        ("tips off", {"tipsOff": True}),
    ):
        ctx, pg, _ = page(browser, size, base, foods=7)
        home(pg)
        today = pg.evaluate("() => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date())")
        set_flags(pg, **{k: (today if v == "TODAY" else v) for k, v in over.items()})
        home(pg)
        pg.wait_for_timeout(800)
        over_the_line(pg)
        pg.wait_for_timeout(9000)
        check("chia sẻ nhé" not in pg.locator(".m-toast-host").inner_text(), f"no nudge: {label}")
        ctx.close()


def main():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        for tag, size, big in SIZES:
            button_case(browser, tag, size, big)
        for tag, size, big in SIZES:
            spotlight_after_whats_new(browser, tag, size, big)
        not_after(browser)
        later_twice(browser)
        nudge(browser)
        browser.close()
    print(f"\n{len(problems)} problem(s)")
    sys.exit(1 if problems else 0)


if __name__ == "__main__":
    main()
