"""cc-28d: /coach "Học viên" and /coach/clients/[id] (coach and admin).

Production build, clock fixed at 2026-10-15 10:00, demo mode as the coach (?as=coach), 390x844 and 1440x900.
- The invite code, Sao chép mã and Sao chép liên kết (the clipboard holds the code, then /join/<code>), Chia sẻ when
  the device can share; the empty state; four mock clients with Level badge, last logged day and "Chưa ghi hôm nay".
- A client: current Level, the 1-5 picker, "Học viên sẽ thấy" with added items marked, Lưu disabled until changed,
  the toast "Đã đổi Level của <tên> thành 3", the list shows the new Level.
- Cài đặt shows the Học viên row for a coach and an admin only.
Run with: ALIGN_BASE_URL=http://localhost:3104 npm run probe -- tests/probes/cc_28d.py
"""
import os
import re
import sys

import _demo  # noqa: F401
from playwright.sync_api import sync_playwright

BASE = os.environ.get("ALIGN_BASE_URL", "http://localhost:3104")
NOW = "2026-10-15T10:00:00+07:00"
SHOTS = os.path.join(os.path.dirname(__file__), "..", "..", ".screenshots")
problems, notes = [], []


def check(cond, msg):
    (notes if cond else problems).append(("ok: " if cond else "") + msg)


def squash(t):
    return re.sub(r"\s+", " ", t).strip()


def page(browser, size, init=None):
    ctx = browser.new_context(viewport=size, permissions=["clipboard-read", "clipboard-write"])
    if init:
        ctx.add_init_script(init)
    pg = ctx.new_page()
    errors = []
    pg.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
    pg.on("pageerror", lambda e: errors.append(str(e)))
    pg.clock.set_fixed_time(NOW)
    return ctx, pg, errors


def run(browser, size, tag):
    w = size["width"]
    ctx, pg, errors = page(browser, size, "navigator.share = (d) => { window.__shared = d; return Promise.resolve(); };")
    pg.goto(BASE + "/coach?as=coach", wait_until="networkidle")
    pg.wait_for_timeout(800)
    t = squash(pg.inner_text("body"))
    check("H1T-KHANH" in t, f"{tag}: the invite code")
    for name in ["Sao chép mã", "Sao chép liên kết", "Chia sẻ"]:
        b = pg.get_by_role("button", name=name, exact=True)
        check(b.count() == 1 and b.bounding_box()["height"] >= 43.5, f"{tag}: {name} (44 px)")
    pg.get_by_role("button", name="Sao chép mã", exact=True).click()
    pg.wait_for_timeout(300)
    check(pg.evaluate("navigator.clipboard.readText()") == "H1T-KHANH", f"{tag}: the code is on the clipboard")
    check("Đã sao chép mã" in squash(pg.inner_text("body")), f"{tag}: the copy is confirmed")
    pg.get_by_role("button", name="Sao chép liên kết", exact=True).click()
    pg.wait_for_timeout(300)
    check(pg.evaluate("navigator.clipboard.readText()") == BASE + "/join/H1T-KHANH", f"{tag}: the link is on the clipboard")
    pg.get_by_role("button", name="Chia sẻ", exact=True).click()
    pg.wait_for_timeout(200)
    shared = pg.evaluate("window.__shared")
    check(shared and shared["url"].endswith("/join/H1T-KHANH"), f"{tag}: native share gets the link ({shared})")

    rows = pg.locator("[data-align-group=client-row]")
    check(rows.count() == 4, f"{tag}: four clients ({rows.count()})")
    texts = [squash(rows.nth(i).inner_text()) for i in range(rows.count())]
    check("Nguyễn Minh Anh" in texts[0] and "Hôm nay" in texts[0] and "Chưa ghi hôm nay" not in texts[0], f"{tag}: logged today ({texts[0]!r})")
    check("Chưa ghi hôm nay" in texts[1] and "Hôm qua" in texts[1], f"{tag}: logged yesterday ({texts[1]!r})")
    check("Chưa ghi món nào" in texts[3] and "Chưa ghi hôm nay" in texts[3], f"{tag}: never logged ({texts[3]!r})")
    badges = [b.get_attribute("data-level-badge") for b in pg.locator("[data-level-badge]").all()]
    check(badges == ["2", "1", "4", "3"], f"{tag}: Level badges {badges}")
    xs = {round(rows.nth(i).bounding_box()["x"]) for i in range(4)}
    ws = {round(rows.nth(i).bounding_box()["width"]) for i in range(4)}
    check(len(xs) == 1 and len(ws) == 1 and rows.nth(0).bounding_box()["height"] >= 63.5, f"{tag}: rows share edges and are 64 px")
    pg.screenshot(path=os.path.join(SHOTS, f"cc-28d-coach-{w}.png"), full_page=True)

    # a client
    rows.nth(1).click()
    pg.wait_for_url(re.compile(r".*/coach/clients/client-2$"), timeout=8000)
    pg.wait_for_timeout(500)
    body = squash(pg.inner_text("body"))
    check("Level hiện tại" in body and "Level 1" in body and "TRẦN QUỐC BẢO" in pg.inner_text("body").upper(), f"{tag}: name and current Level")
    save = pg.get_by_role("button", name="Lưu", exact=True)
    check(save.is_disabled(), f"{tag}: Lưu is disabled until changed")
    picks = pg.get_by_role("button", name=re.compile(r"^Level [1-5]$"))
    check(picks.count() == 5 and all(p.bounding_box()["height"] >= 43.5 for p in picks.all()), f"{tag}: five 44 px choices")
    check(pg.get_by_role("button", name="Level 1", exact=True).get_attribute("aria-pressed") == "true", f"{tag}: the current Level is pressed")
    pg.get_by_role("button", name="Level 3", exact=True).click()
    check(save.is_enabled(), f"{tag}: Lưu enables when the Level changes")
    added = [li.inner_text().strip() for li in pg.locator("li[data-status=added]").all()]
    joined = " | ".join(added)
    check("+ Phốt pho" in joined and "+ Vitamin B1" in joined and "+ Omega-3" in joined, f"{tag}: the preview marks added items ({added[:4]})")
    removed = [li.inner_text().strip() for li in pg.locator("li[data-status=removed]").all()]
    check("− Vitamin C" in " | ".join(removed), f"{tag}: and removed ones ({removed})")
    pg.screenshot(path=os.path.join(SHOTS, f"cc-28d-client-{w}.png"), full_page=True)
    pg.get_by_role("button", name="Level 1", exact=True).click()
    check(save.is_disabled(), f"{tag}: back to the current Level disables Lưu")
    pg.get_by_role("button", name="Level 3", exact=True).click()
    save.click()
    pg.wait_for_timeout(400)
    toast = squash(pg.locator("[role=status] >> visible=true").first.inner_text())
    check("Đã đổi Level của Trần Quốc Bảo thành 3" in toast, f"{tag}: toast ({toast!r})")
    check(save.is_disabled(), f"{tag}: Lưu is disabled again after saving")

    pg.goto(BASE + "/coach", wait_until="networkidle")
    pg.wait_for_timeout(500)
    badges = [b.get_attribute("data-level-badge") for b in pg.locator("[data-level-badge]").all()]
    check(badges[1] == "3", f"{tag}: the list shows Level 3 for Trần Quốc Bảo ({badges})")
    check(not [e for e in errors if "preloaded using link preload" not in e], f"{tag}: no console errors {errors[:1]}")
    ctx.close()

    # empty
    ctx, pg, errors = page(browser, size, "try { localStorage.setItem('h1t_mock_coach_clients_v1', '[]'); } catch (e) {}")
    pg.goto(BASE + "/coach?as=coach", wait_until="networkidle")
    pg.wait_for_timeout(500)
    check("Chưa có học viên. Gửi mã cho học viên để bắt đầu." in squash(pg.inner_text("body")), f"{tag}: empty state")
    ctx.close()

    # Cài đặt row
    for persona, expect in [("coach", True), ("admin", True), ("user2", False)]:
        ctx, pg, errors = page(browser, size)
        pg.goto(BASE + f"/settings?as={persona}", wait_until="networkidle")
        pg.wait_for_timeout(600)
        link = pg.get_by_role("link", name=re.compile("^Học viên"))
        check((link.count() == 1 and link.get_attribute("href") == "/coach") == expect, f"{tag}: Cài đặt Học viên row for {persona}: {expect}")
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
