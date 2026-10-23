"""feat/documents: Tài liệu (Cài đặt › Hỗ trợ › Tài liệu), with access codes a coach makes.

Demo build (mock mode: documents and codes live in this browser's localStorage, one context so the coach and the learner
share them). At 390 and 1280:
- Cài đặt has the Tài liệu row; /documents shows its header, the list (or Chưa có tài liệu) and Cập nhật tài liệu (≥ 44 px);
- a learner (?as=user0) sees no "Mã truy cập cho học viên" card; an empty code and a wrong code each say so under the field;
- the coach (?as=coach) has the card, Tạo mã mới shows a 10-symbol code once and lists it;
- the learner unlocks with that code typed in lower case, Tải lên tệp adds probe-rules.md (toast "Đã tải lên probe-rules.md"),
  the row opens the editor, Lưu writes the edit (toast "Đã lưu probe-rules.md"), and a reload keeps the unlock and the edit;
- the coach revokes the code (toast "Đã thu hồi mã"); the learner's next write is refused in place and locks the tab again.
Screenshots: .screenshots/documents-{list,coach,code,editor}-<width>.png.
Run with: ALIGN_BASE_URL=http://localhost:3101 npm run probe -- tests/probes/documents.py
"""
# PROBE_COVERS: app/(app)/documents/** components/documents/** lib/documents.ts
import os
import re
import sys
from pathlib import Path

import _demo  # noqa: F401
from playwright.sync_api import sync_playwright

BASE = os.environ.get("ALIGN_BASE_URL", "http://localhost:3101")
SHOTS = Path(__file__).resolve().parent.parent.parent / ".screenshots"
SHOTS.mkdir(exist_ok=True)
DOC = "probe-rules.md"
FIRST = "# Quy tắc\n\nDòng 1\n"
EDITED = "# Quy tắc\n\nDòng 1\nDòng 2\n"
CARD = "section[aria-labelledby='documents-codes-title']"
LIST = "section[aria-label='Danh sách tài liệu']"
problems = []


def check(cond, msg):
    print(("[PASS] " if cond else "[FAIL] ") + msg)
    if not cond:
        problems.append(msg)


def dialog(pg, title_id):
    return pg.locator(f"[role=dialog]:has(#{title_id})").last


def go(pg, persona):
    pg.goto(f"{BASE}/documents?as={persona}", wait_until="networkidle")
    pg.wait_for_timeout(800)


def unlock(pg, code):
    pg.get_by_role("button", name="Cập nhật tài liệu").click()
    sheet = dialog(pg, "documents-code-title")
    sheet.wait_for(state="visible")
    pg.wait_for_timeout(400)
    sheet.locator("#documents-code").fill(code)
    sheet.get_by_role("button", name="Mở khóa").click()
    return sheet


def run(browser, width):
    tag = str(width)
    ctx = browser.new_context(viewport={"width": width, "height": 844}, device_scale_factor=1, is_mobile=width < 1024, has_touch=width < 1024)
    ctx.grant_permissions(["clipboard-read", "clipboard-write"])
    pg = ctx.new_page()
    errors = []
    pg.on("pageerror", lambda e: errors.append(str(e)))

    # 1. Cài đặt › Tài liệu, as a learner
    pg.goto(BASE + "/settings?as=user0", wait_until="networkidle")
    row = pg.locator("section[aria-label='Hỗ trợ']").get_by_role("link", name="Tài liệu")
    check(row.count() == 1, f"{tag}: Cài đặt › Hỗ trợ has the Tài liệu row")
    row.click()
    pg.wait_for_url("**/documents")
    pg.wait_for_timeout(800)
    check(pg.get_by_role("heading", name="Tài liệu").count() >= 1, f"{tag}: /documents has its header")
    bb = pg.get_by_role("button", name="Cập nhật tài liệu").bounding_box()
    check(bb is not None and bb["height"] >= 44, f"{tag}: Cập nhật tài liệu is there and ≥ 44 px ({bb and round(bb['height'])})")
    check(pg.locator(CARD).count() == 0, f"{tag}: a learner has no code card")
    pg.screenshot(path=str(SHOTS / f"documents-list-{tag}.png"), full_page=True)

    # 2. Empty and wrong codes
    sheet = unlock(pg, "")
    check(sheet.get_by_text("Nhập mã truy cập").count() == 1, f"{tag}: an empty code says Nhập mã truy cập")
    sheet.locator("#documents-code").fill("WRONGCODE2")
    sheet.get_by_role("button", name="Mở khóa").click()
    pg.wait_for_timeout(400)
    check(sheet.get_by_text("Mã truy cập không đúng").count() == 1, f"{tag}: a wrong code is refused under the field")
    pg.screenshot(path=str(SHOTS / f"documents-code-{tag}.png"))
    pg.keyboard.press("Escape")
    pg.wait_for_timeout(400)

    # 3. The coach makes a code
    go(pg, "coach")
    card = pg.locator(CARD)
    check(card.count() == 1, f"{tag}: the coach has the Mã truy cập cho học viên card")
    card.get_by_role("button", name="Tạo mã mới").click()
    shown = card.get_by_label("Mã truy cập mới")
    shown.wait_for(state="visible")
    code = shown.inner_text().strip()
    check(re.fullmatch(r"[A-HJ-NP-Z2-9]{10}", code) is not None, f"{tag}: the new code is 10 symbols ({code})")
    check(card.get_by_role("button", name=re.compile("^Thu hồi")).count() == 1, f"{tag}: the code is listed with Thu hồi")
    card.get_by_role("button", name="Sao chép").click()
    pg.get_by_text("Đã sao chép mã").wait_for(state="visible")
    check(True, f"{tag}: Sao chép says Đã sao chép mã")
    pg.screenshot(path=str(SHOTS / f"documents-coach-{tag}.png"), full_page=True)

    # 4. The learner unlocks with it (lower case), uploads, edits, saves
    go(pg, "user0")
    unlock(pg, code.lower())
    pg.get_by_role("button", name="Tải lên tệp").wait_for(state="visible")
    check(True, f"{tag}: the coach's code unlocks the learner's tab")
    pg.locator("input[type=file]").set_input_files({"name": DOC, "mimeType": "text/markdown", "buffer": FIRST.encode()})
    pg.get_by_text(f"Đã tải lên {DOC}").wait_for(state="visible")
    check(True, f"{tag}: the toast says Đã tải lên {DOC}")
    pg.locator(LIST).get_by_role("button", name=DOC).click()
    editor = dialog(pg, "documents-document-title")
    area = editor.locator("#documents-editor")
    area.wait_for(state="visible")
    check(area.input_value() == FIRST, f"{tag}: the editor holds the uploaded text")
    check(editor.get_by_role("button", name="Lưu").is_disabled(), f"{tag}: Lưu waits for a change")
    area.fill(EDITED)
    pg.screenshot(path=str(SHOTS / f"documents-editor-{tag}.png"))
    editor.get_by_role("button", name="Lưu").click()
    pg.get_by_text(f"Đã lưu {DOC}").wait_for(state="visible")
    check(True, f"{tag}: the toast says Đã lưu {DOC}")
    pg.reload(wait_until="networkidle")
    pg.wait_for_timeout(800)
    check(pg.get_by_role("button", name="Tải lên tệp").count() == 1, f"{tag}: still unlocked after a reload")
    pg.locator(LIST).get_by_role("button", name=DOC).click()
    area = dialog(pg, "documents-document-title").locator("#documents-editor")
    area.wait_for(state="visible")
    check(area.input_value() == EDITED, f"{tag}: the document holds the saved edit")
    pg.keyboard.press("Escape")
    pg.wait_for_timeout(400)

    # 5. The coach revokes it; the learner's next write is refused and locks the tab
    go(pg, "coach")
    pg.locator(CARD).get_by_role("button", name=re.compile("^Thu hồi")).click()
    pg.get_by_text("Đã thu hồi mã").wait_for(state="visible")
    check(True, f"{tag}: Thu hồi says Đã thu hồi mã")
    go(pg, "user0")
    pg.locator("input[type=file]").set_input_files({"name": "other.md", "mimeType": "text/markdown", "buffer": b"x"})
    pg.get_by_role("button", name="Cập nhật tài liệu").wait_for(state="visible")
    check(pg.get_by_role("alert").filter(has_text="đã bị thu hồi").count() == 1, f"{tag}: a revoked code is refused in place and locks the tab")
    check(pg.locator(LIST).get_by_role("button", name="other.md").count() == 0, f"{tag}: nothing was written with the revoked code")

    check(not errors, f"{tag}: no page errors ({errors[:2]})")
    ctx.close()


with sync_playwright() as p:
    browser = p.chromium.launch()
    for width in (390, 1280):
        run(browser, width)
    browser.close()

print(f"{len(problems)} problem(s)")
sys.exit(1 if problems else 0)
