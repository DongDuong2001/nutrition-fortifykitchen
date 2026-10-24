"""Job H2 review fixes (feat/courses-web, 24/10): the PDF upload of Thêm bài, demo (mock) mode at 390 wide.

Thêm bài is marked unsaved while a lesson is written or a PDF is converted and sent, closing it mid-upload asks (Dừng / Tiếp tục tải), a page
that fails once is sent again (the mock fails page 2 once on sessionStorage h1t_mock_fail_page; a 507 says the server's disk is full, at once),
and 60 pages are drawn on one canvas and every page is a real WebP, on Chromium and on WebKit (which cannot make WebP from a canvas: its pages
come from the WASM encoder). Split from courses.py so neither takes longer than run_all's 180 s on a busy machine.
Screenshots: .screenshots/courses/390-*.png. Run with: ALIGN_BASE_URL=http://localhost:3120 npm run probe -- tests/probes/courses_upload.py
"""
# PROBE_COVERS: components/courses/add-lesson-sheet.tsx lib/lesson-upload.ts lib/pdf-pages.ts lib/webp-wasm.ts lib/webp-worker.ts lib/courses-types.ts lib/courses.ts lib/mock/courses-mock.ts next.config.ts lib/csp.ts
import re
import sys
import time

from playwright.sync_api import sync_playwright

from _courses_lib import (
    COUNT_CANVASES,
    PDF,
    RECORD_PAGES,
    REQUESTS,
    SIXTY,
    SLOW_PAGES,
    WATCH_THREADS,
    check,
    go,
    new_page,
    problems,
    shot,
    text,
)


def unsaved(pg):
    """What the app update reads (components/unsaved-work-watch.tsx): true while the page holds work a reload would lose."""
    return pg.evaluate("() => !!(window.h1tUnsaved && window.h1tUnsaved())")


def open_add_lesson(pg):
    """A coach makes a course with a part and opens Thêm bài."""
    go(pg, "/explore/documents?as=coach")
    pg.get_by_role("button", name="Khóa mới").click()
    pg.wait_for_timeout(700)
    pg.locator("#course-title").fill("Khóa tải lên")
    pg.get_by_role("button", name="Tạo khóa").click()
    pg.wait_for_url(re.compile(r".*/explore/documents/c-[0-9a-f]{8}$"), timeout=8000)
    pg.wait_for_timeout(900)
    pg.get_by_role("button", name="Thêm phần").click()
    pg.wait_for_timeout(600)
    pg.locator("#course-part-name").fill("Phần A")
    pg.get_by_role("button", name="Thêm phần").last.click()
    pg.wait_for_timeout(800)
    # The toast of the part has gone before the sheet opens, or it sits over the buttons in the screenshots
    pg.get_by_role("status").filter(has_text="Đã thêm phần").wait_for(state="hidden", timeout=10000)
    pg.get_by_role("button", name="Thêm bài").click()
    pg.wait_for_timeout(700)


def pick_pdf(pg, path, name, pages):
    pg.get_by_test_id("course-pdf-input").set_input_files(str(path))
    pg.locator(f"text={pages} trang").first.wait_for(timeout=15000)
    pg.locator("#course-lesson-title").fill(name)


def upload_label(pg):
    loc = pg.locator("[data-tour=course-add-lesson-go]")
    return (loc.inner_text() or "").strip() if loc.count() else ""


def stop_upload_flow(browser):
    """Closing the sheet while pages are on their way asks first; Tiếp tục tải goes on, Dừng keeps nothing half-made. Marked unsaved all along."""
    tag = "390"
    ctx, pg = new_page(browser, 390, 844)
    ctx.add_init_script(SLOW_PAGES)
    open_add_lesson(pg)
    check(not unsaved(pg), f"{tag}: an open, empty Thêm bài holds nothing back")
    pick_pdf(pg, SIXTY, "Bài tải lên dở", 60)
    pg.get_by_role("button", name="Thêm vào khóa").click()
    pg.locator("[data-tour=course-add-lesson-go]", has_text="Đang chuyển trang").wait_for(timeout=10000)
    check(unsaved(pg), f"{tag}: the conversion and upload are marked unsaved (an update would not reload)")
    pg.keyboard.press("Escape")
    pg.wait_for_timeout(500)
    ask = pg.get_by_role("alertdialog")
    check(ask.count() == 1 and "Đang tải bài lên. Dừng lại?" in ask.inner_text(), f"{tag}: closing the sheet asks 'Đang tải bài lên. Dừng lại?' ({ask.inner_text()[:60] if ask.count() else ''!r})")
    check(ask.get_by_role("button", name="Tiếp tục tải").count() == 1 and ask.get_by_role("button", name="Dừng").count() == 1, f"{tag}: with Tiếp tục tải and Dừng")
    check(pg.get_by_role("dialog", name="Thêm bài").count() == 1, f"{tag}: and the sheet is still there")
    shot(pg, f"{tag}-c5-stop-upload-question.png")
    ask.get_by_role("button", name="Tiếp tục tải").click()
    pg.wait_for_timeout(600)
    check(pg.get_by_role("alertdialog").count() == 0 and "Đang chuyển trang" in upload_label(pg), f"{tag}: Tiếp tục tải goes on ({upload_label(pg)!r})")
    pg.keyboard.press("Escape")
    pg.wait_for_timeout(400)
    pg.get_by_role("alertdialog").get_by_role("button", name="Dừng").click()
    pg.wait_for_timeout(1500)
    check(pg.get_by_role("dialog", name="Thêm bài").count() == 0, f"{tag}: Dừng closes the sheet")
    check("Bài tải lên dở" not in text(pg) and pg.locator("li[data-align-group=coach-lessons]").count() == 0, f"{tag}: and the half lesson is gone")
    check(not unsaved(pg), f"{tag}: nothing is held back any more")
    ctx.close()


def retry_flow(browser):
    """A page that fails once is sent again; the coach sees it, and the lesson is not thrown away."""
    tag = "390"
    ctx, pg = new_page(browser, 390, 844)
    ctx.add_init_script("try { sessionStorage.setItem('h1t_mock_fail_page', '2:1'); } catch (e) {}")
    open_add_lesson(pg)
    pick_pdf(pg, PDF, "Bài thử lại", 3)
    pg.get_by_role("button", name="Thêm vào khóa").click()
    note = pg.get_by_role("status").filter(has_text="chưa lên được")
    note.wait_for(timeout=10000)
    check("Trang 2 chưa lên được. Đang thử lại…" in note.inner_text(), f"{tag}: a page that did not go says so and that it is tried again ({note.inner_text()!r})")
    shot(pg, f"{tag}-c6-retried-page.png")
    pg.get_by_role("dialog", name="Thêm bài").wait_for(state="detached", timeout=15000)
    pg.wait_for_timeout(900)
    check("Bài thử lại" in text(pg) and "PDF · 3 trang" in text(pg), f"{tag}: after the second try the lesson is added with its 3 pages")
    ctx.close()


def storage_full_flow(browser):
    """The server's disk is full (the mock answers page 2 with a 507): the sheet says so in words, at once (no 'thử lại'), keeps no half lesson."""
    tag = "390"
    ctx, pg = new_page(browser, 390, 844)
    ctx.add_init_script("try { sessionStorage.setItem('h1t_mock_fail_page', '2:9:507'); } catch (e) {}")
    open_add_lesson(pg)
    pick_pdf(pg, PDF, "Bài đầy ổ đĩa", 3)
    pg.get_by_role("button", name="Thêm vào khóa").click()
    alert = pg.get_by_role("dialog", name="Thêm bài").get_by_role("alert")
    alert.wait_for(timeout=10000)
    check("Máy chủ đã hết chỗ lưu bài. Báo cho HLV nhé." in alert.inner_text(), f"{tag}: a full server disk says 'Máy chủ đã hết chỗ lưu bài. Báo cho HLV nhé.' ({alert.inner_text()!r})")
    check(pg.get_by_role("status").filter(has_text="Đang thử lại").count() == 0, f"{tag}: and it does not try again")
    shot(pg, f"{tag}-c9-storage-full.png")
    pg.keyboard.press("Escape")
    pg.wait_for_timeout(900)
    check("Bài đầy ổ đĩa" not in text(pg) and pg.locator("li[data-align-group=coach-lessons]").count() == 0, f"{tag}: no half lesson is left")
    ctx.close()


def written_lesson_marks(browser):
    tag = "390"
    ctx, pg = new_page(browser, 390, 844)
    open_add_lesson(pg)
    pg.get_by_role("tab", name="Viết bài").click()
    pg.locator("#course-lesson-title").fill("Bài chưa lưu")
    pg.locator("#course-lesson-text").fill("Một ý chưa lưu.")
    pg.wait_for_timeout(300)
    check(unsaved(pg), f"{tag}: a written lesson not yet saved is marked unsaved")
    pg.get_by_role("button", name="Thêm vào khóa").click()
    pg.wait_for_timeout(1200)
    check(not unsaved(pg) and "Bài chưa lưu" in text(pg), f"{tag}: saved, nothing is held back")
    ctx.close()


def sixty_pages(browser, name):
    """60 pages in one go, in every browser: the lesson is ready, every page that was sent is a real WebP (RIFF....WEBP: WebKit cannot make
    one from a canvas, so there the pages come from the WASM encoder), and the pages were drawn on one canvas, not one each."""
    ctx, pg = new_page(browser, 390, 844)
    ctx.add_init_script(COUNT_CANVASES + RECORD_PAGES + WATCH_THREADS)
    first_request = len(REQUESTS)
    open_add_lesson(pg)
    pick_pdf(pg, SIXTY, "Sáu mươi trang", 60)
    started = time.time()
    pg.get_by_role("button", name="Thêm vào khóa").click()
    pg.locator("[data-tour=course-add-lesson-go]", has_text="Đang chuyển trang").wait_for(timeout=30000)
    pg.wait_for_timeout(1500)
    shot(pg, f"390-{name}-c7-uploading.png")
    seen_alert = pg.get_by_role("dialog", name="Thêm bài").get_by_role("alert").count()
    pg.get_by_role("dialog", name="Thêm bài").wait_for(state="detached", timeout=240000)
    pg.wait_for_timeout(900)
    took = time.time() - started
    check("PDF · 60 trang" in text(pg) and seen_alert == 0, f"{name}: 60 pages, the lesson is added, no error on the way ({took:.0f} s)")
    shot(pg, f"390-{name}-c8-lesson-added.png")
    heads = pg.evaluate("() => window.__pageHeads")
    check(len(heads) == 60 and all(h["riff"] == "RIFF" and h["webp"] == "WEBP" for h in heads), f"{name}: all 60 pages were sent as WebP (RIFF…WEBP) ({len(heads)} sent, first {heads[:1]})")
    made = pg.evaluate("() => window.__canvases")
    check(made <= 3, f"{name}: the pages were drawn on {made} canvas(es), not one each")
    answers = set(pg.evaluate("() => window.__toBlob"))
    check(("image/png" in answers) == (name == "webkit"), f"{name}: the browser's own toBlob('image/webp') answered {sorted(map(str, answers))}")
    wasm = [u.rsplit("/", 1)[-1] for u in REQUESTS[first_request:] if u.endswith(".wasm")]
    check(len(wasm) == (1 if name == "webkit" else 0), f"{name}: {'one' if wasm else 'no'} WASM file fetched, only when the browser needed it ({wasm})")
    workers = [w for w in pg.evaluate("() => window.__workers") if "pdf.worker" not in w]
    gap = pg.evaluate("() => window.__maxGap")
    # Chrome and Edge make WebP themselves; where the browser cannot, the encoder runs in its own worker and the page stays alive
    check(bool(workers) == (name == "webkit"), f"{name}: the WASM encoder worker {'ran' if workers else 'did not run'} ({workers[:1]})")
    check(gap < 1000, f"{name}: the page never stopped answering for a second ({gap:.0f} ms at the longest)")
    ctx.close()


def run(browser):
    stop_upload_flow(browser)
    retry_flow(browser)
    storage_full_flow(browser)
    written_lesson_marks(browser)
    sixty_pages(browser, "chromium")


with sync_playwright() as p:
    b = p.chromium.launch()
    try:
        run(b)
    finally:
        b.close()
    # Safari counts canvas memory per tab (and an iPhone refuses new canvases after a few dozen big ones): the same 60 pages on WebKit
    try:
        w = p.webkit.launch()
    except Exception as err:  # the browser is not installed on this machine
        print(f"[SKIP] webkit is not installed ({str(err).splitlines()[0][:80]}): the 60-page check ran on Chromium only")
    else:
        try:
            sixty_pages(w, "webkit")
        finally:
            w.close()

print(f"\n{len(problems)} problem(s)")
for m in problems:
    print(" -", m)
sys.exit(1 if problems else 0)
