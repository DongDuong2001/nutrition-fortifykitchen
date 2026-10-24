"""feat/level-ui (prompts/day-level-ui-1023.md): the Level badge, Hôm nay's header, the explainer, the celebration, the share image.

Production demo build, clock fixed at 2026-10-23 10:00, 390x844 and 1440x900.
- Header: the mini badge right after the logo for Level 1–5 (44 px, logo / badge / Chia sẻ on one row, no pips); Level 0 in demo
  (mock) mode is "+ HLV" (the join screen exists); no "Level · HLV" row under the hero any more.
- Explainer: six rows with mini badges, the user's row tinted ("Level của bạn"), the next row's "Tiếp theo: + …", the footer.
- Celebration 2 → 3: plays once (title, subtitle, a → b count, chips, live region, focus on ✕), the header keeps Level 2 until the
  badge lands, "Xem chỉ số mới" opens the explainer at Level 3 and levelSeen is 3 after it; a tap during the intro skips to the
  waiting state; ✕ closes; reduced motion is a plain fade (no sweep, silhouette, bang or confetti); a lower Level is the calm card.
- Nothing of the celebration loads without a promotion (no script or stylesheet with its text).
- Frames at 390: rAF intervals over the celebration (p95, long frames) and a Chrome trace file for the PR.
- Share PNG for Level 0–5 (1080 wide, the name row at the same place), leaderboard rows with the mini badge.
Screenshots: .screenshots/level-ui/. Run: ALIGN_BASE_URL=http://localhost:3108 npm run probe -- tests/probes/level_ui.py
"""
# PROBE_COVERS: app/(app)/(tabs)/app/** app/(app)/explore/leaderboard/** components/profile/level-badge.tsx components/coaching/** components/home/share-day.tsx
import base64
import json
import os
import re
import statistics
import sys

import _demo  # noqa: F401  (demo mode: the sample day)


def celebration_files(responses):
    """The celebration's chunk (its dialog id) and its stylesheet (the badge's shine class only it defines) among loaded files."""
    out = []
    for r in responses:
        body = r.text() if r.ok else ""
        if "level-up-title" in body or (r.request.resource_type == "stylesheet" and "lv-shine" in body):
            out.append(r.request.resource_type)
    return out
from playwright.sync_api import sync_playwright

BASE = os.environ.get("ALIGN_BASE_URL", "http://localhost:3101")
NOW = "2026-10-23T10:00:00+07:00"
SHOTS = os.path.join(os.path.dirname(__file__), "..", "..", ".screenshots", "level-ui")
HERO = "section[aria-label='Tổng kcal và dinh dưỡng đa lượng']"
COACH = {"id": "coach-khanh", "name": "HLV Khánh"}
problems, notes = [], []


def check(cond, msg):
    (notes if cond else problems).append(("ok: " if cond else "") + msg)
    return cond


def squash(t):
    return re.sub(r"\s+", " ", t or "").strip()


def profile(level, seen, coach=True):
    return {"sex": "male", "birthYear": 2003, "weightKg": 65, "goal": "maintain", "periodMode": False, "trainingMinutesDefault": 60,
            "displayName": "Gabe", "hintSeen": True, "role": "user", "level": level, "levelSeen": seen, "coach": COACH if coach else None}


def new_page(browser, size, prof=None, reduced=False):
    ctx = browser.new_context(viewport=size, accept_downloads=True, reduced_motion="reduce" if reduced else "no-preference")
    if prof is not None:
        # Once per context (a reload keeps what the app wrote, e.g. levelSeen after the celebration)
        ctx.add_init_script(
            "try { if (!sessionStorage.getItem('lv-probe')) { localStorage.setItem('h1t_profile_v1_demo', %s); sessionStorage.setItem('lv-probe', '1'); } } catch (e) {}"
            % json.dumps(json.dumps(prof))
        )
    pg = ctx.new_page()
    errors = []
    pg.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
    pg.on("pageerror", lambda e: errors.append(str(e)))
    pg.clock.set_fixed_time(NOW)
    return ctx, pg, errors


def home(pg, query=""):
    pg.goto(BASE + "/app" + query, wait_until="networkidle")
    pg.locator(HERO + " >> visible=true").first.wait_for(state="visible", timeout=8000)


def header_badge(pg):
    return pg.locator("[data-header-level] >> visible=true").first


def centre_y(box):
    return box["y"] + box["height"] / 2


def header(browser, size, tag):
    w = size["width"]
    for level in range(6):
        ctx, pg, errors = new_page(browser, size)
        home(pg, f"?level={level}")
        pg.wait_for_timeout(400)
        hb = header_badge(pg)
        box = hb.bounding_box()
        if level == 0:
            chip = pg.get_by_role("link", name="Nhập mã huấn luyện viên").locator("visible=true")
            check(chip.count() == 1 and "+ HLV" in chip.first.inner_text(), f"{tag} L0: '+ HLV' in place of the badge (mock mode: the join screen exists)")
        else:
            badge = hb.locator(f"[data-level-badge='{level}']")
            check(badge.count() == 1, f"{tag} L{level}: the header shows the mini badge")
            check(hb.locator("[data-pips]").count() == 0 and hb.locator("[data-level-frame]").count() == 0, f"{tag} L{level}: mini, no pips or frame")
            check(box["height"] >= 43.5 and box["width"] >= 43.5, f"{tag} L{level}: 44 px target ({box['width']:.0f}x{box['height']:.0f})")
            check(hb.get_attribute("aria-label") == f"Level {level}. Xem Level" or hb.get_attribute("aria-label").startswith(f"Level {level},"), f"{tag} L{level}: named ({hb.get_attribute('aria-label')!r})")
        share = pg.locator("[aria-label='Chia sẻ ngày này'] >> visible=true").first.bounding_box()
        if w < 1024:
            logo = pg.get_by_role("link", name="H1T MICRO, về Hôm nay").bounding_box()
            ys = [centre_y(logo), centre_y(box), centre_y(share)]
            check(max(ys) - min(ys) <= 2, f"{tag} L{level}: logo, badge and Chia sẻ centred on one row ({[round(y) for y in ys]})")
            check(box["x"] >= logo["x"] + logo["width"] and box["x"] - (logo["x"] + logo["width"]) <= 12, f"{tag} L{level}: the badge right after the logo")
            badge_box = (hb.locator("[data-level-badge]") if level else hb).bounding_box()
            check(badge_box["y"] >= box["y"] - 0.5 and badge_box["y"] + badge_box["height"] <= box["y"] + box["height"] + 0.5, f"{tag} L{level}: nothing sticks out of the row")
        check(pg.get_by_role("button", name=re.compile(r"^Level \d · ")).count() == 0, f"{tag} L{level}: no 'Level · HLV' row under the hero")
        clip = {"x": 0, "y": 0, "width": min(w, 560), "height": 120}
        pg.screenshot(path=os.path.join(SHOTS, f"header-L{level}-{w}.png"), clip=clip)
        check([e for e in errors if "preloaded using link preload" not in e] == [], f"{tag} L{level}: no console errors {errors[:1]}")
        ctx.close()


def explainer(browser, size, tag):
    w = size["width"]
    ctx, pg, _ = new_page(browser, size)
    home(pg, "?level=2")
    pg.wait_for_timeout(400)
    header_badge(pg).click()
    dlg = pg.get_by_role("dialog", name="Level là gì?")
    dlg.wait_for(state="visible", timeout=6000)
    pg.wait_for_timeout(500)
    text = squash(dlg.inner_text())
    rows = dlg.locator("li")
    check(rows.count() == 6 and dlg.locator("li [data-level-badge]").count() == 6, f"{tag} explainer: six rows with badges")
    check(dlg.locator("li [data-pips]").count() == 0, f"{tag} explainer: mini badges")
    check("HLV đặt Level cho bạn. Level càng cao, Hôm nay càng hiện nhiều vi chất." in text, f"{tag} explainer: the intro line")
    cur = dlg.locator("li[aria-current=true]")
    check(cur.count() == 1 and "Level của bạn" in cur.inner_text() and cur.locator("[data-level-badge='2']").count() == 1, f"{tag} explainer: Level 2 is yours")
    check("Tiếp theo: + Phosphorus, Copper, Vitamin B1, Vitamin B3, chi tiết béo và xơ" in text, f"{tag} explainer: the next row says what it adds")
    check("22 vi chất và chi tiết béo, xơ · khung ảnh chia sẻ vàng" in text, f"{tag} explainer: Level 5's gold frame")
    check("Hỏi HLV để lên Level. Lên Level là có màn chúc mừng và thêm vi chất ngay trong Hôm nay." in text, f"{tag} explainer: the footer")
    check(len({round(r.bounding_box()["x"]) for r in rows.all()}) == 1 and len({round(r.bounding_box()["width"]) for r in rows.all()}) == 1, f"{tag} explainer: rows share edges")
    pg.screenshot(path=os.path.join(SHOTS, f"explainer-L2-{w}.png"))
    ctx.close()


def celebration(browser, size, tag):
    w = size["width"]
    # frames: the celebration left alone (rAF intervals, and a Chrome trace at 390)
    ctx, pg, _ = new_page(browser, size, profile(3, 2))
    trace = w < 1024
    if trace:
        browser.start_tracing(page=pg, path=os.path.join(SHOTS, "celebration-trace-390.json"), screenshots=False, categories=["devtools.timeline", "disabled-by-default-devtools.timeline.frame"])
    home(pg)
    pg.locator("[data-level-up]").wait_for(state="attached", timeout=8000)
    pg.evaluate("""() => { window.__lvFrames = []; let last = performance.now(); const f = (t) => { window.__lvFrames.push(t - last); last = t; if (window.__lvFrames.length < 330) requestAnimationFrame(f); }; requestAnimationFrame(f); }""")
    pg.wait_for_timeout(5600)
    if trace:
        browser.stop_tracing()
    # D-A11Y-04: nothing sounds by itself while the celebration plays (the full chime comes with the badge's landing, after the person's tap)
    check(pg.evaluate("window.__h1tSoundCount || 0") == 0, f"{tag} sound: none through the intro and the waiting card")
    gaps = pg.evaluate("window.__lvFrames || []")[2:]
    gaps_sorted = sorted(gaps)
    p95 = gaps_sorted[int(len(gaps_sorted) * 0.95) - 1] if gaps else 999
    long = sum(1 for g in gaps if g > 25)
    check(len(gaps) > 250 and p95 <= 20, f"{tag} frames: p95 {p95:.1f} ms over {len(gaps)} frames (median {statistics.median(gaps) if gaps else 0:.1f}), {long} over 25 ms")
    ctx.close()

    # play, then Xem chỉ số mới. The shots pause every animation of the scene at a set time (a full-page shot takes ~0.5 s)
    ctx, pg, errors = new_page(browser, size, profile(3, 2))
    loaded = []
    pg.on("response", lambda r: loaded.append(r) if r.request.resource_type in ("script", "stylesheet") else None)
    home(pg)
    pg.locator("[data-level-up]").wait_for(state="attached", timeout=8000)
    hb = pg.locator("[data-header-level]").first
    check(hb.locator("[data-level-badge='2']").count() == 1, f"{tag} play: the header keeps Level 2 while it plays")
    at = "(t) => document.querySelector('[data-level-up]').getAnimations({ subtree: true }).forEach((a) => { a.pause(); a.currentTime = t; })"
    for ms, name in ((250, "sweep-a"), (600, "sweep-b"), (1250, "metamorphosis-a"), (1700, "metamorphosis-b"), (2300, "collapse")):
        pg.evaluate(at, ms)
        pg.screenshot(path=os.path.join(SHOTS, f"celebration-{name}-{w}.png"))
    check(pg.locator("[data-level-up] [aria-hidden=true] [data-level-badge='2']").count() >= 1, f"{tag} play: the old badge sweeps in and turns into the silhouette")
    pg.evaluate("() => document.querySelector('[data-level-up]').getAnimations({ subtree: true }).forEach((a) => a.play())")
    pg.wait_for_timeout(4200)
    for ms, name in ((2520, "hatch"), (2900, "burst"), (6000, "reward")):
        pg.evaluate(at, ms)
        pg.screenshot(path=os.path.join(SHOTS, f"celebration-{name}-{w}.png"))
    pg.evaluate("() => document.querySelector('[data-level-up]').getAnimations({ subtree: true }).forEach((a) => a.play())")
    dlg = pg.get_by_role("dialog", name=re.compile("Lên Level 3"))
    text = squash(dlg.inner_text())
    check("LÊN LEVEL 3!" in text.upper(), f"{tag} play: the title")
    check("HLV Khánh vừa nâng Level cho bạn." in text, f"{tag} play: the subtitle (with a coach, mock mode)")
    check("Hôm nay theo dõi 14 → 18 vi chất, thêm:" in text, f"{tag} play: the count ticked 14 → 18 ({text[:120]!r})")
    chips = [squash(c).replace("+ ", "+") for c in dlg.locator("li").all_inner_texts()]
    check(chips == ["+Phosphorus", "+Copper", "+Vitamin B1", "+Vitamin B3", "+chi tiết béo và xơ"], f"{tag} play: one chip per added nutrient {chips}")
    live = squash(pg.locator("[data-level-up] [aria-live=polite]").inner_text())
    check(live.startswith("Lên Level 3. HLV Khánh vừa nâng Level cho bạn."), f"{tag} play: the polite announcement ({live[:60]!r})")
    close = dlg.get_by_role("button", name="Đóng")
    check(pg.evaluate("document.activeElement && document.activeElement.getAttribute('aria-label')") == "Đóng", f"{tag} play: focus on ✕")
    check(pg.evaluate("getComputedStyle(document.activeElement).outlineStyle") == "none", f"{tag} play: no ring on ✕ when it opens")
    cb, sb = close.bounding_box(), pg.locator("[data-level-up]").bounding_box()
    check(cb["x"] + cb["width"] / 2 < sb["x"] + sb["width"] / 2, f"{tag} play: ✕ on the leading side (D-SHT-05)")
    pg.keyboard.press("Tab")
    first = pg.evaluate("document.activeElement && document.activeElement.textContent.trim()")
    pg.keyboard.press("Tab")
    pg.keyboard.press("Tab")
    third = pg.evaluate("document.activeElement && document.activeElement.textContent.trim()")
    check(first == third and pg.evaluate("!!document.activeElement.closest('[data-level-up]')"), f"{tag} play: Tab stays on its two buttons ({first!r})")
    check(pg.evaluate("getComputedStyle(document.activeElement).outlineStyle") == "solid", f"{tag} play: keyboard focus shows the ring")
    check(pg.locator("[data-level-up] [data-pip-fill]").count() == 1, f"{tag} play: its new pip fills")
    check(sorted(celebration_files(loaded)) == ["script", "stylesheet"], f"{tag} play: the celebration's chunk and stylesheet loaded ({celebration_files(loaded)})")
    dlg.get_by_role("button", name="Xem chỉ số mới").click()
    pg.wait_for_timeout(250)
    pg.screenshot(path=os.path.join(SHOTS, f"celebration-landing-{w}.png"))
    pg.wait_for_timeout(500)
    check(pg.evaluate("window.__h1tSoundCount || 0") == 1, f"{tag} sound: the full chime once, when the badge has landed ({pg.evaluate('window.__h1tSoundCount || 0')})")
    check(pg.locator("[data-level-up]").count() == 0, f"{tag} close: gone")
    check(pg.locator("[data-header-level].m-level-land [data-level-badge='3']").count() == 1, f"{tag} close: the header shows Level 3 and pulses")
    ex = pg.get_by_role("dialog", name="Level là gì?")
    ex.wait_for(state="visible", timeout=4000)
    check(ex.locator("li[aria-current=true] [data-level-badge='3']").count() == 1, f"{tag} close: Xem chỉ số mới opens the explainer at Level 3")
    seen = pg.evaluate("JSON.parse(localStorage.getItem('h1t_profile_v1_demo')).levelSeen")
    check(seen == 3, f"{tag} close: levelSeen written (3, got {seen})")
    pg.keyboard.press("Escape")
    home(pg)
    pg.wait_for_timeout(3000)
    check(pg.locator("[data-level-up]").count() == 0, f"{tag} once: not again after a reload")
    check([e for e in errors if "preloaded using link preload" not in e] == [], f"{tag} play: no console errors {errors[:1]}")
    ctx.close()

    # skip, then ✕
    ctx, pg, _ = new_page(browser, size, profile(5, 4))
    home(pg)
    pg.locator("[data-level-up]").wait_for(state="attached", timeout=8000)
    pg.wait_for_timeout(500)
    pg.mouse.click(size["width"] / 2, 120)
    pg.wait_for_timeout(200)
    dlg = pg.get_by_role("dialog", name=re.compile("Lên Level 5"))
    text = squash(dlg.inner_text())
    title_op = pg.evaluate("getComputedStyle(document.getElementById('level-up-title')).opacity")
    check(title_op == "1" and pg.locator("[data-level-up] [data-level-badge='4']").count() == 0, f"{tag} skip: lands on the waiting state at once (title opacity {title_op})")
    check("Level cao nhất · đủ 22 vi chất · quà mới:" in text and "Khung ảnh chia sẻ vàng" in text, f"{tag} skip: 4 → 5 reward copy ({text[:90]!r})")
    check("Bạn vừa" not in text and "HLV Khánh vừa nâng Level cho bạn." in text, f"{tag} skip: the subtitle")
    pg.wait_for_timeout(600)
    pg.screenshot(path=os.path.join(SHOTS, f"celebration-L5-waiting-{w}.png"))
    check(pg.evaluate("window.__h1tSoundCount || 0") == 0, f"{tag} ✕ sound: still none before the person's tap")
    dlg.get_by_role("button", name="Đóng").click()
    pg.wait_for_timeout(700)
    check(pg.evaluate("window.__h1tSoundCount || 0") == 1, f"{tag} ✕ sound: +1 after ✕ ({pg.evaluate('window.__h1tSoundCount || 0')})")
    check(pg.locator("[data-level-up]").count() == 0 and pg.get_by_role("dialog", name="Level là gì?").count() == 0, f"{tag} ✕: closes, no explainer")
    check(pg.evaluate("document.activeElement && document.activeElement.hasAttribute('data-header-level')"), f"{tag} ✕: the focus goes back to the header badge")
    ctx.close()

    # 0 → 1 with a coach, no coach (live-like copy is unit-tested)
    ctx, pg, _ = new_page(browser, size, profile(1, 0))
    home(pg)
    pg.locator("[data-level-up]").wait_for(state="attached", timeout=8000)
    pg.wait_for_timeout(4200)
    text = squash(pg.get_by_role("dialog", name=re.compile("Lên Level 1")).inner_text())
    check("HLV Khánh đang theo dõi bạn." in text, f"{tag} 0 → 1: the coach starts following ({text[:80]!r})")
    pg.screenshot(path=os.path.join(SHOTS, f"celebration-L1-{w}.png"))
    ctx.close()

    # reduced motion: a plain fade to the result
    ctx, pg, _ = new_page(browser, size, profile(4, 3), reduced=True)
    home(pg)
    pg.locator("[data-level-up]").wait_for(state="attached", timeout=8000)
    pg.wait_for_timeout(450)
    fx = pg.evaluate("""() => [...document.querySelectorAll('[data-level-up] *')].filter(e => e.getAnimations().some(a => a.playState === 'running' && a.effect && a.effect.getComputedTiming().iterations === Infinity)).length""")
    check(fx == 0, f"{tag} reduced: no loops running ({fx})")
    check(pg.locator("[data-level-up] [data-level-badge='3']").count() == 0, f"{tag} reduced: no sweep and no silhouette")
    op = pg.evaluate("getComputedStyle(document.getElementById('level-up-title')).opacity")
    check(op == "1", f"{tag} reduced: the result is there (title opacity {op})")
    pg.screenshot(path=os.path.join(SHOTS, f"celebration-reduced-{w}.png"))
    pg.keyboard.press("Escape")
    pg.wait_for_timeout(400)
    check(pg.locator("[data-level-up]").count() == 0, f"{tag} reduced: Esc closes")
    ctx.close()

    # a lower Level: the calm card, no celebration, and none of its chunk
    ctx, pg, _ = new_page(browser, size, profile(1, 3))
    loaded = []
    pg.on("response", lambda r: loaded.append(r) if r.request.resource_type in ("script", "stylesheet") else None)
    home(pg)
    pg.wait_for_timeout(3000)
    card = pg.locator("[data-level-card]")
    check(pg.locator("[data-level-up]").count() == 0 and card.count() == 1 and "HLV Khánh đã đổi Level của bạn thành 1" in squash(card.inner_text()), f"{tag} lower: the calm card, no celebration")
    check(celebration_files(loaded) == [], f"{tag} lower: nothing of the celebration loaded ({len(loaded)} scripts/styles looked at)")
    ctx.close()


# The share root lives only while the PNG is drawn: measured the moment it is complete
SHARE_WATCH = """
(() => { const t = setInterval(() => {
  const root = document.querySelector('[data-share-root]');
  if (!root || !root.querySelector('[data-share-footer]') || window.__shareMeasure) return;
  const r = (e) => { const b = e.getBoundingClientRect(); return { y: b.y, h: b.height }; };
  const badge = root.querySelector('[data-level-badge]');
  const tag = [...badge.querySelectorAll('span')].find((e) => e.style.backgroundColor);
  const date = root.querySelector('[data-share-header] p');
  const pips = badge.querySelector('[data-pips]');
  window.__shareMeasure = { root: r(root), name: r(root.querySelector('h1')), date: date && r(date), level: badge.dataset.levelBadge, tag: r(tag),
    pips: pips && r(pips), frame: !!root.querySelector('[data-share-gold-frame]') };
  clearInterval(t);
}, 5); })();
"""


def share_png(browser, tag):
    tops = {}
    for level in range(6):
        ctx, pg, _ = new_page(browser, {"width": 390, "height": 844}, profile(level, level, coach=level > 0))
        pg.add_init_script(SHARE_WATCH)
        home(pg)
        pg.wait_for_timeout(500)
        pg.locator("[aria-label='Chia sẻ ngày này'] >> visible=true").first.click()
        dlg = pg.get_by_role("dialog")
        dlg.get_by_role("img").wait_for(state="visible", timeout=30000)
        m = pg.evaluate("window.__shareMeasure")
        tops[level] = round(m["name"]["y"] - m["root"]["y"], 1)
        check(m["level"] == str(level), f"{tag} share L{level}: the badge (Level 0 keeps its grey one)")
        name_mid = m["name"]["y"] + m["name"]["h"] / 2
        tag_mid = m["tag"]["y"] + m["tag"]["h"] / 2
        check(abs(name_mid - tag_mid) <= 3, f"{tag} share L{level}: the tag's centre on the name line ({tag_mid - name_mid:+.1f} px)")
        pip_mid = m["pips"]["y"] + m["pips"]["h"] / 2
        check(m["date"]["y"] - 2 <= pip_mid <= m["date"]["y"] + m["date"]["h"] + 2, f"{tag} share L{level}: the pips on the date line ({pip_mid - m['date']['y']:+.1f} px into it)")
        check(m["frame"] == (level == 5), f"{tag} share L{level}: gold frame only at Level 5")
        with pg.expect_download() as info:
            dlg.get_by_role("button", name="Lưu ảnh").click()
        path = os.path.join(SHOTS, f"share-L{level}.png")
        info.value.save_as(path)
        with open(path, "rb") as fh:
            b64 = base64.b64encode(fh.read()).decode()
        wpx, hpx = pg.evaluate("async (b64) => { const i = new Image(); i.src = 'data:image/png;base64,' + b64; await i.decode(); return [i.naturalWidth, i.naturalHeight]; }", b64)
        check(wpx == 1080 and hpx >= 1920, f"{tag} share L{level}: PNG {wpx}x{hpx} -> {path}")
        ctx.close()
    check(len(set(tops.values())) == 1, f"{tag} share: the name row does not move across Levels {tops}")


def lists(browser, size, tag):
    w = size["width"]
    ctx, pg, _ = new_page(browser, size)
    pg.goto(BASE + "/explore/leaderboard?as=user2&level=5", wait_until="networkidle")
    pg.wait_for_timeout(800)
    badges = pg.locator("[data-level-badge] >> visible=true")
    if badges.count():
        b = badges.first
        check(b.locator("[data-pips]").count() == 0, f"{tag} leaderboard: mini badge")
        row = b.locator("xpath=ancestor::*[self::li or self::div][1]").bounding_box()
        bb = b.bounding_box()
        check(bb["x"] + bb["width"] <= row["x"] + row["width"] + 0.5, f"{tag} leaderboard: the badge fits its row")
    else:
        notes.append(f"{tag} leaderboard: no badge shown on this build (nothing to check)")
    pg.screenshot(path=os.path.join(SHOTS, f"leaderboard-{w}.png"))
    ctx.close()


with sync_playwright() as p:
    os.makedirs(SHOTS, exist_ok=True)
    browser = p.chromium.launch()
    only = os.environ.get("LEVEL_UI_ONLY", "")
    for size, tag in (({"width": 390, "height": 844}, "390"), ({"width": 1440, "height": 900}, "1440")):
        if not only or only == "header":
            header(browser, size, tag)
        if not only or only == "explainer":
            explainer(browser, size, tag)
        if not only or only == "celebration":
            celebration(browser, size, tag)
        if not only or only == "lists":
            lists(browser, size, tag)
    if not only or only == "share":
        share_png(browser, "390")
    browser.close()

for line in notes:
    if line:
        print(line)
for line in problems:
    print("FAIL: " + line)
print(f"{len([n for n in notes if n])} ok, {len(problems)} FAIL")
sys.exit(1 if problems else 0)
