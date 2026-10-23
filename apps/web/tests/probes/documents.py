"""feat/documents: Tài liệu (Cài đặt › Hỗ trợ › Tài liệu).

Demo build (the documents live in the server's memory outside live mode). At 390 and 1280:
- Cài đặt has the Tài liệu row; /documents shows its header, the list (or Chưa có tài liệu) and Cập nhật tài liệu (≥ 44 px);
- Cập nhật tài liệu opens the Mã truy cập sheet; an empty code and a wrong code each say so under the field (a server without
  ACCESS_CODE says "Máy chủ chưa đặt mã truy cập" instead, and the write path below is skipped);
- with ACCESS_CODE in the probe's environment (the same server's): the code unlocks, Tải lên tệp adds probe-rules.md (toast
  "Đã tải lên probe-rules.md", a row), the row opens the editor, Lưu writes the edit (toast "Đã lưu probe-rules.md") and the
  edit is what the document holds after a reload, which stays unlocked (sessionStorage); a stale code locks the tab again on
  its first write, with the message in place.
Screenshots: .screenshots/documents-{list,code,editor}-<width>.png.
Run with: ACCESS_CODE=<the server's> ALIGN_BASE_URL=http://localhost:3101 npm run probe -- tests/probes/documents.py
"""
# PROBE_COVERS: app/(app)/documents/** app/api/documents/** components/documents/** lib/documents.ts lib/documents-server.ts lib/access-code.ts
import os
import sys
from pathlib import Path

import _demo  # noqa: F401
from playwright.sync_api import sync_playwright

BASE = os.environ.get("ALIGN_BASE_URL", "http://localhost:3101")
CODE = os.environ.get("ACCESS_CODE")
SHOTS = Path(__file__).resolve().parent.parent.parent / ".screenshots"
SHOTS.mkdir(exist_ok=True)
DOC = "probe-rules.md"
FIRST = "# Quy tắc\n\nDòng 1\n"
EDITED = "# Quy tắc\n\nDòng 1\nDòng 2\n"
problems = []


def check(cond, msg):
    print(("[PASS] " if cond else "[FAIL] ") + msg)
    if not cond:
        problems.append(msg)


def dialog(pg, title_id):
    return pg.locator(f"[role=dialog]:has(#{title_id})").last


def code_sheet(pg, tag):
    pg.get_by_role("button", name="Cập nhật tài liệu").click()
    sheet = dialog(pg, "documents-code-title")
    sheet.wait_for(state="visible")
    pg.wait_for_timeout(400)
    return sheet


def run(browser, width):
    tag = str(width)
    ctx = browser.new_context(viewport={"width": width, "height": 844}, device_scale_factor=1, is_mobile=width < 1024, has_touch=width < 1024)
    pg = ctx.new_page()
    errors = []
    pg.on("pageerror", lambda e: errors.append(str(e)))

    # 1. Cài đặt › Tài liệu
    pg.goto(BASE + "/settings", wait_until="networkidle")
    row = pg.locator("section[aria-label='Hỗ trợ']").get_by_role("link", name="Tài liệu")
    check(row.count() == 1, f"{tag}: Cài đặt › Hỗ trợ has the Tài liệu row")
    row.click()
    pg.wait_for_url("**/documents")
    pg.wait_for_timeout(800)
    check(pg.get_by_role("heading", name="Tài liệu").count() >= 1, f"{tag}: /documents has its header")
    update = pg.get_by_role("button", name="Cập nhật tài liệu")
    bb = update.bounding_box()
    check(bb is not None and bb["height"] >= 44, f"{tag}: Cập nhật tài liệu is there and ≥ 44 px ({bb and round(bb['height'])})")
    check(pg.get_by_text("Chưa có tài liệu").count() + pg.locator("section[aria-label='Danh sách tài liệu']").count() == 1, f"{tag}: the list or the empty state is shown")
    pg.screenshot(path=str(SHOTS / f"documents-list-{tag}.png"), full_page=True)

    # 2. The access code sheet: empty, then wrong
    sheet = code_sheet(pg, tag)
    sheet.get_by_role("button", name="Mở khóa").click()
    check(sheet.get_by_text("Nhập mã truy cập").count() == 1, f"{tag}: an empty code says Nhập mã truy cập under the field")
    sheet.locator("#documents-code").fill("not-the-code-" + tag)
    sheet.get_by_role("button", name="Mở khóa").click()
    pg.wait_for_timeout(800)
    wrong = sheet.get_by_text("Mã truy cập không đúng").count() == 1
    unset = sheet.get_by_text("Máy chủ chưa đặt mã truy cập").count() == 1
    check(wrong or unset, f"{tag}: a wrong code is refused under the field ({'wrong' if wrong else 'no ACCESS_CODE on the server' if unset else 'no message'})")
    pg.screenshot(path=str(SHOTS / f"documents-code-{tag}.png"))
    if not CODE or unset:
        print(f"[SKIP] {tag}: the write path needs ACCESS_CODE in the probe's and the server's environment")
        pg.keyboard.press("Escape")
        pg.wait_for_timeout(400)
        check(sheet.count() == 0 or not sheet.is_visible(), f"{tag}: Esc closes the sheet")
        check(not errors, f"{tag}: no page errors ({errors[:2]})")
        ctx.close()
        return

    # 3. The right code unlocks the tab
    sheet.locator("#documents-code").fill(CODE)
    sheet.get_by_role("button", name="Mở khóa").click()
    upload = pg.get_by_role("button", name="Tải lên tệp")
    upload.wait_for(state="visible")
    check(pg.get_by_role("button", name="Cập nhật tài liệu").count() == 0, f"{tag}: unlocked: Tải lên tệp replaces Cập nhật tài liệu")

    # 4. Upload a file, open it, edit it, save it
    pg.locator("input[type=file]").set_input_files({"name": DOC, "mimeType": "text/markdown", "buffer": FIRST.encode()})
    pg.get_by_text(f"Đã tải lên {DOC}").wait_for(state="visible")
    check(True, f"{tag}: the toast says Đã tải lên {DOC}")
    doc_row = pg.locator("section[aria-label='Danh sách tài liệu']").get_by_role("button", name=DOC)
    doc_row.wait_for(state="visible")
    doc_row.click()
    editor = dialog(pg, "documents-document-title")
    editor.wait_for(state="visible")
    area = editor.locator("#documents-editor")
    area.wait_for(state="visible")
    check(area.input_value() == FIRST, f"{tag}: the editor holds the uploaded text")
    check(editor.get_by_role("button", name="Lưu").is_disabled(), f"{tag}: Lưu waits for a change")
    area.fill(EDITED)
    pg.screenshot(path=str(SHOTS / f"documents-editor-{tag}.png"))
    editor.get_by_role("button", name="Lưu").click()
    pg.get_by_text(f"Đã lưu {DOC}").wait_for(state="visible")
    check(True, f"{tag}: the toast says Đã lưu {DOC}")
    pg.wait_for_timeout(400)

    # 5. A reload keeps the unlock (sessionStorage) and shows the saved text
    pg.reload(wait_until="networkidle")
    pg.wait_for_timeout(800)
    check(pg.get_by_role("button", name="Tải lên tệp").count() == 1, f"{tag}: still unlocked after a reload")
    pg.locator("section[aria-label='Danh sách tài liệu']").get_by_role("button", name=DOC).click()
    area = dialog(pg, "documents-document-title").locator("#documents-editor")
    area.wait_for(state="visible")
    check(area.input_value() == EDITED, f"{tag}: the document holds the saved edit")
    pg.keyboard.press("Escape")
    pg.wait_for_timeout(400)

    # 6. A stale code (changed on the server) locks the tab again at its first write, in place
    if width < 1024:
        pg.evaluate("sessionStorage.setItem('h1t_documents_code', 'stale')")
        pg.reload(wait_until="networkidle")
        pg.wait_for_timeout(800)
        pg.locator("input[type=file]").set_input_files({"name": "other.md", "mimeType": "text/markdown", "buffer": b"x"})
        pg.get_by_role("button", name="Cập nhật tài liệu").wait_for(state="visible")
        check(pg.get_by_role("alert").filter(has_text="Mã truy cập không đúng").count() == 1, f"{tag}: a stale code says Mã truy cập không đúng in place and locks the tab")
        check(pg.locator("section[aria-label='Danh sách tài liệu']").get_by_role("button", name="other.md").count() == 0, f"{tag}: nothing was written with the stale code")

    check(not errors, f"{tag}: no page errors ({errors[:2]})")
    ctx.close()


with sync_playwright() as p:
    browser = p.chromium.launch()
    for width in (390, 1280):
        run(browser, width)
    browser.close()

print(f"{len(problems)} problem(s)")
sys.exit(1 if problems else 0)
