"""cc-28c: linking to a coach and finding out about Level.

Production build, clock fixed at 2026-10-15 10:00, demo mode (the sample account), 390x844 and 1440x900.
- Level 0: the one-time hint card on Hôm nay (44 px close, gone for good once closed) leads to /settings/coach.
- /settings/coach: no coach -> the code field; a wrong code shows the error; the right code (any case) links;
  with a coach: name, "Level 1 · do HLV đặt", the explainer, Rời HLV with its confirm.
- Hôm nay: the "Level 1 · HLV Khánh" label opens the explainer; the linked card; a raise or a lower by the coach
  (the mock server) shows its card once. None of this is in the share image.
- /join/<code>: confirm sheet then Hôm nay; a wrong code; signed out keeps the code and goes to sign-up.
- Setup: the optional coach code field, used when setup is done.
Run with: ALIGN_BASE_URL=http://localhost:3104 npm run probe -- tests/probes/cc_28c.py
"""
import json
import os
import re
import sys

import _demo
from playwright.sync_api import sync_playwright

_demo.hint(False)

BASE = os.environ.get("ALIGN_BASE_URL", "http://localhost:3104")
NOW = "2026-10-15T10:00:00+07:00"
SHOTS = os.path.join(os.path.dirname(__file__), "..", "..", ".screenshots")
HERO = "section[aria-label='Tổng kcal và dinh dưỡng đa lượng']"
HINT = "Có huấn luyện viên? Nhập mã để HLV theo dõi và mở thêm chỉ số"
WATCH = """
window.__shareSnaps = [];
(() => { let seen = false; setInterval(() => {
  const r = document.querySelector('[data-share-root]');
  if (!r) { seen = false; return; }
  if (seen || !r.querySelector('[data-share-footer]')) return;
  seen = true;
  window.__shareSnaps.push({ text: r.innerText.replace(/\\s+/g, ' ') });
}, 5); })();
"""
problems, notes = [], []


def check(cond, msg):
    (notes if cond else problems).append(("ok: " if cond else "") + msg)


def squash(t):
    return re.sub(r"\s+", " ", t).strip()


NAMED = '{"sex":"male","birthYear":2003,"weightKg":65,"goal":"maintain","periodMode":false,"trainingMinutesDefault":60,"displayName":"Học viên A"}'


def new_page(browser, size):
    ctx = browser.new_context(viewport=size, accept_downloads=True)
    ctx.add_init_script(WATCH)
    # The invite code is random per browser (v0.2.1): the probe fixes it
    ctx.add_init_script("try { localStorage.setItem('h1t_mock_coach_codes_v1', JSON.stringify({ 'coach-khanh': 'TESTCODE23' })); } catch (e) {}")
    # a named account that has not dismissed the Level 0 hint (the share image never draws without a name)
    ctx.add_init_script("try { if (localStorage.getItem('h1t_profile_v1_demo') === null) localStorage.setItem('h1t_profile_v1_demo', JSON.stringify(%s)); } catch (e) {}" % NAMED)
    pg = ctx.new_page()
    errors = []
    pg.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
    pg.on("pageerror", lambda e: errors.append(str(e)))
    pg.clock.set_fixed_time(NOW)
    return ctx, pg, errors


def home(pg, query=""):
    pg.goto(BASE + "/" + query, wait_until="networkidle")
    pg.locator(HERO + " >> visible=true").first.wait_for(state="visible", timeout=8000)
    pg.wait_for_timeout(500)


def body(pg):
    return squash(pg.inner_text("body"))


def set_server_level(pg, level):
    pg.evaluate(
        """(level) => {
          const key = 'h1t_mock_coach_clients_v1';
          const list = JSON.parse(localStorage.getItem(key) || 'null');
          if (!list) throw new Error('no clients stored');
          // The client id is opaque (v0.2.1): the one for this account is in the id map, never the email
          const ids = JSON.parse(localStorage.getItem('h1t_mock_client_ids_v1') || '{}');
          const me = list.find(c => c.id === ids['ban@email.com']);
          if (!me) throw new Error('not a client: ' + JSON.stringify(list.map(c => c.id)));
          me.level = level;
          localStorage.setItem(key, JSON.stringify(list));
        }""",
        level,
    )


def run(browser, size, tag):
    w = size["width"]
    ctx, pg, errors = new_page(browser, size)

    # Level 0 hint card
    home(pg)
    card = pg.locator("[data-level-card]")
    check(card.count() == 1 and HINT in squash(card.inner_text()), f"{tag} L0: the hint card ({squash(card.inner_text()) if card.count() else None!r})")
    close = card.get_by_role("button", name="Đóng thông báo")
    check(close.bounding_box()["width"] >= 43.5 and close.bounding_box()["height"] >= 43.5, f"{tag} L0: close is 44 px")
    check(card.get_by_role("link", name="Nhập mã").get_attribute("href") == "/settings/coach", f"{tag} L0: the card leads to /settings/coach")
    pg.screenshot(path=os.path.join(SHOTS, f"cc-28c-hint-{w}.png"))
    close.click()
    pg.wait_for_timeout(300)
    check(pg.locator("[data-level-card]").count() == 0, f"{tag} L0: the card closes")
    home(pg)
    check(pg.locator("[data-level-card]").count() == 0, f"{tag} L0: and stays closed after a reload")

    # Cài đặt row and /settings/coach
    pg.goto(BASE + "/settings", wait_until="networkidle")
    pg.wait_for_timeout(500)
    row = pg.get_by_role("link", name=re.compile("^Huấn luyện viên"))
    check(row.count() == 1 and row.get_attribute("href") == "/settings/coach", f"{tag} Cài đặt: Huấn luyện viên row")
    check("HỌC VIÊN" not in pg.inner_text("body").upper().replace("HỌC VIÊN CỦA", ""), f"{tag} Cài đặt: no Học viên row for a user")
    row.click()
    pg.wait_for_url(re.compile(r".*/settings/coach$"), timeout=8000)
    pg.wait_for_timeout(400)
    check("Bạn chưa có huấn luyện viên" in body(pg), f"{tag} coach: no coach text")
    field = pg.get_by_label("Mã huấn luyện viên")
    pg.get_by_role("button", name="Tham gia", exact=True).click()
    pg.wait_for_timeout(200)
    check("Mã không đúng. Kiểm tra lại với HLV của bạn." in body(pg), f"{tag} coach: an empty or wrong code shows the error")
    field.fill("H1T-NOPE")
    check("Mã không đúng" not in body(pg), f"{tag} coach: typing clears the error")
    pg.get_by_role("button", name="Tham gia", exact=True).click()
    pg.wait_for_timeout(200)
    check("Mã không đúng. Kiểm tra lại với HLV của bạn." in body(pg), f"{tag} coach: H1T-NOPE is wrong")
    pg.screenshot(path=os.path.join(SHOTS, f"cc-28c-coach-none-{w}.png"))
    field.fill("testcode23")
    pg.get_by_role("button", name="Tham gia", exact=True).click()
    pg.wait_for_timeout(400)
    t = body(pg)
    check("HLV Khánh" in t and "Level 1 · do HLV đặt" in t, f"{tag} coach: linked at Level 1 ({t[:160]!r})")
    pg.get_by_role("button", name="Level là gì?").click()
    dlg = pg.get_by_role("dialog", name="Level là gì?")
    dlg.wait_for(state="visible", timeout=4000)
    rows = dlg.locator("li")
    check(rows.count() == 6, f"{tag} explainer: six Levels ({rows.count()})")
    cur = dlg.locator("li[aria-current=true]")
    check(cur.count() == 1 and "Level của bạn" in cur.inner_text(), f"{tag} explainer: the current Level is highlighted")
    check("Hỏi HLV để lên Level" in dlg.inner_text(), f"{tag} explainer: how to move up")
    check(len({round(r.bounding_box()["x"]) for r in rows.all()}) == 1 and len({round(r.bounding_box()["width"]) for r in rows.all()}) == 1, f"{tag} explainer: rows share edges")
    pg.screenshot(path=os.path.join(SHOTS, f"cc-28c-explainer-{w}.png"))
    dlg.get_by_role("button", name="Đóng").click()
    pg.wait_for_timeout(300)

    # Hôm nay: the label and the linked card
    home(pg)
    card = pg.locator("[data-level-card]")
    check(card.count() == 1 and "Bạn đang được HLV Khánh theo dõi · Level 1" in squash(card.inner_text()), f"{tag} linked: the card")
    label = pg.get_by_role("button", name="Level 1 · HLV Khánh")
    check(label.count() == 1 and label.bounding_box()["height"] >= 43.5, f"{tag} linked: the label above the column")
    label.click()
    pg.get_by_role("dialog", name="Level là gì?").wait_for(state="visible", timeout=4000)
    pg.keyboard.press("Escape")
    pg.wait_for_timeout(300)
    pg.screenshot(path=os.path.join(SHOTS, f"cc-28c-linked-{w}.png"))
    # not in the share image
    pg.get_by_role("button", name="Chia sẻ ngày này").click()
    pg.get_by_role("dialog").get_by_role("img").wait_for(state="visible", timeout=20000)
    snap = pg.evaluate("window.__shareSnaps[window.__shareSnaps.length - 1]")
    check(snap and "HLV Khánh" not in snap["text"] and "theo dõi" not in snap["text"] and "LEVEL" in snap["text"].upper(), f"{tag} share: no coach label or card in the image")
    pg.keyboard.press("Escape")
    pg.wait_for_timeout(300)
    card.get_by_role("button", name="Đóng thông báo").click()
    pg.wait_for_timeout(300)
    check(pg.locator("[data-level-card]").count() == 0, f"{tag} linked: the card closes")

    # the coach raises to 3, then lowers to 1
    set_server_level(pg, 3)
    home(pg)
    card = pg.locator("[data-level-card]")
    text = squash(card.inner_text()) if card.count() else ""
    check("HLV Khánh đã nâng bạn lên Level 3: thêm" in text and "Phốt pho" in text and "Vitamin B1" in text and "chi tiết béo và xơ" in text, f"{tag} raised: the card ({text!r})")
    check(card.get_by_role("button", name="Xem").count() == 1, f"{tag} raised: Xem opens the explainer")
    card.get_by_role("button", name="Xem").click()
    pg.get_by_role("dialog", name="Level là gì?").wait_for(state="visible", timeout=4000)
    check(pg.get_by_role("dialog").locator("li[aria-current=true]").count() == 1, f"{tag} raised: Level 3 is the current one")
    pg.keyboard.press("Escape")
    pg.wait_for_timeout(300)
    pg.locator("[data-level-card]").get_by_role("button", name="Đóng thông báo").click()
    pg.wait_for_timeout(300)
    home(pg)
    check(pg.locator("[data-level-card]").count() == 0, f"{tag} raised: shown once")
    check(pg.locator("aside[aria-label='Vi chất'] h3").first.inner_text().strip() == "Chi tiết béo & xơ", f"{tag} raised: Hôm nay now lists the Level 3 groups")
    set_server_level(pg, 1)
    home(pg)
    card = pg.locator("[data-level-card]")
    check(card.count() == 1 and "HLV Khánh đã đổi Level của bạn thành 1" in squash(card.inner_text()), f"{tag} lowered: the card")
    card.get_by_role("button", name="Đóng thông báo").click()

    # leave
    pg.goto(BASE + "/settings/coach", wait_until="networkidle")
    pg.wait_for_timeout(400)
    pg.get_by_role("button", name="Rời HLV", exact=True).click()
    dlg = pg.get_by_role("dialog")
    dlg.wait_for(state="visible", timeout=4000)
    check("Rời HLV Khánh? Level của bạn sẽ về 0 và Hôm nay hiện danh sách cơ bản." in squash(dlg.inner_text()), f"{tag} leave: confirm text")
    pg.screenshot(path=os.path.join(SHOTS, f"cc-28c-leave-{w}.png"))
    dlg.get_by_role("button", name="Rời HLV Khánh").click()
    pg.wait_for_timeout(400)
    check("Bạn chưa có huấn luyện viên" in body(pg), f"{tag} leave: back to no coach")
    home(pg)
    check(pg.get_by_role("button", name=re.compile("^Level \\d · HLV")).count() == 0, f"{tag} leave: no label on Hôm nay")
    check(pg.locator("aside[aria-label='Vi chất'] h3").all_inner_texts() == ["Khoáng chất", "Vitamin"], f"{tag} leave: the basic list is back")
    check([e for e in errors if "preloaded using link preload" not in e] == [], f"{tag}: no console errors {errors[:1]}")
    ctx.close()

    # /join/<code>, signed in
    ctx, pg, errors = new_page(browser, size)
    pg.goto(BASE + "/join/TESTCODE23", wait_until="networkidle")
    dlg = pg.get_by_role("dialog", name="Tham gia theo dõi với HLV Khánh?")
    dlg.wait_for(state="visible", timeout=6000)
    pg.screenshot(path=os.path.join(SHOTS, f"cc-28c-join-{w}.png"))
    dlg.get_by_role("button", name="Tham gia", exact=True).click()
    pg.wait_for_url(re.compile(r"^[^?]*/$"), timeout=8000)
    pg.locator(HERO + " >> visible=true").first.wait_for(state="visible", timeout=8000)
    pg.wait_for_timeout(500)
    check("Bạn đang được HLV Khánh theo dõi · Level 1" in body(pg), f"{tag} join: linked and on Hôm nay")
    pg.goto(BASE + "/join/H1T-NOPE", wait_until="networkidle")
    pg.wait_for_timeout(500)
    check("Mã không đúng. Kiểm tra lại với HLV của bạn." in body(pg), f"{tag} join: a wrong code")
    ctx.close()

    # /join/<code>, signed out: the code is kept and sign-up opens
    ctx, pg, errors = new_page(browser, size)
    ctx.add_init_script("try { localStorage.setItem('h1t_mock_auth_v1', JSON.stringify({ current: null, accounts: {} })); } catch (e) {}")
    pg.goto(BASE + "/join/TESTCODE23", wait_until="networkidle")
    pg.wait_for_timeout(800)
    check("/signup" in pg.url, f"{tag} join signed out: goes to sign-up ({pg.url})")
    check(pg.evaluate("sessionStorage.getItem('h1t-pending-coach-code')") == "TESTCODE23", f"{tag} join signed out: the code is kept")
    ctx.close()

    # Setup field
    ctx, pg, errors = new_page(browser, size)
    pg.goto(BASE + "/setup/profile", wait_until="networkidle")
    pg.wait_for_timeout(500)
    field = pg.get_by_label("Mã huấn luyện viên (nếu có)")
    check(field.count() == 1 and field.bounding_box()["height"] >= 43.5, f"{tag} setup: the optional coach code field")
    pg.locator("#setup-display-name").fill("Học viên A")
    pg.screenshot(path=os.path.join(SHOTS, f"cc-28c-setup-{w}.png"))
    field.fill("testcode23")
    finish = pg.get_by_role("button", name=re.compile("^(Tiếp tục|Hoàn tất)$")).locator("visible=true").first
    finish.click()
    pg.wait_for_timeout(500)
    if "/setup/goal" in pg.url:
        pg.get_by_role("button", name="Hoàn tất").locator("visible=true").first.click()
    pg.wait_for_url(re.compile(r".*/setup/done$"), timeout=8000)
    pg.wait_for_timeout(600)
    check("Bạn đang được HLV Khánh theo dõi · Level 1" in body(pg), f"{tag} setup: the code is used when setup is done ({body(pg)[:120]!r})")
    ctx.close()


with sync_playwright() as p:
    os.makedirs(SHOTS, exist_ok=True)
    browser = p.chromium.launch()
    run(browser, {"width": 390, "height": 844}, "390")
    run(browser, {"width": 1440, "height": 900}, "1440")
    browser.close()

for line in notes:
    print(line)
for line in problems:
    print("FAIL: " + line)
print(f"{len(notes)} ok, {len(problems)} FAIL")
sys.exit(1 if problems else 0)
