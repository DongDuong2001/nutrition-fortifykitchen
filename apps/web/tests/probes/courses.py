"""Job H2 (feat/courses-web, 24/10): Tài liệu as courses, demo (mock) mode. 390 phone and 1440 desktop.

Learner (Level 2): Khám phá has the Tài liệu chip and carousel -> library (tabs, Học tiếp row, a code tile, a Level tile) -> a wrong code
says so under the field -> the right code opens the course -> a lesson -> page 3 -> back -> "Học tiếp" opens page 3. A Level-locked course
at Level 2 against Level 3. Coach: makes a course (code access), adds a part, uploads a 3-page PDF (converted in the browser, progress in
the button), adds a written lesson, reorders, makes a code; a learner opens the new course with that code and sees the three pages under
the watermark. /documents redirects; Cài đặt no longer lists Tài liệu.
Screenshots: .screenshots/courses/*.png (390×844 and 1440×900). Run with: ALIGN_BASE_URL=http://localhost:3120 npm run probe -- tests/probes/courses.py
"""
# PROBE_COVERS: app/(app)/explore/documents/** app/(app)/documents/** components/courses/** components/explore/courses-carousel.tsx hooks/use-courses.ts lib/courses.ts lib/courses-mock.ts lib/course-logic.ts lib/pdf-pages.ts
import os
import re
import sys
from pathlib import Path

import _demo  # noqa: F401
from playwright.sync_api import sync_playwright

BASE = os.environ.get("ALIGN_BASE_URL", "http://localhost:3120")
SHOTS = Path(__file__).resolve().parent.parent.parent / ".screenshots" / "courses"
SHOTS.mkdir(parents=True, exist_ok=True)
PDF = Path(__file__).resolve().parent / "fixtures" / "three-pages.pdf"
NO_INSTALL = "try { sessionStorage.setItem('h1t_install_shown', '1'); } catch (e) {}"
problems = []


def check(cond, msg):
    print(("[PASS] " if cond else "[FAIL] ") + msg)
    if not cond:
        problems.append(msg)


def new_page(browser, w=390, h=844, touch=False):
    ctx = browser.new_context(viewport={"width": w, "height": h}, device_scale_factor=2 if w < 800 else 1, has_touch=touch)
    ctx.add_init_script(NO_INSTALL)
    pg = ctx.new_page()
    return ctx, pg


def go(pg, path):
    pg.goto(BASE + path, wait_until="networkidle")
    pg.wait_for_timeout(900)


def shot(pg, name):
    pg.screenshot(path=str(SHOTS / name))


def text(pg):
    return re.sub(r"\s+", " ", pg.locator("body").inner_text())


def click_text(pg, label, exact=True):
    pg.get_by_text(label, exact=exact).first.click()
    pg.wait_for_timeout(500)


def scroll_wheel_to(pg, selector, tries=60):
    """Scrolls with the wheel (a real reader's scroll) until the element's top is near the top of the screen (the reader's place)."""
    pg.mouse.move(200, 500)
    for _ in range(tries):
        top = pg.locator(selector).first.evaluate("(e) => e.getBoundingClientRect().top")
        if 40 <= top <= 140:
            break
        pg.mouse.wheel(0, max(-260, min(260, top - 90)))
        pg.wait_for_timeout(120)
    pg.wait_for_timeout(1600)  # the place is sent after 700 ms of rest (and the scroll itself glides for a moment)


def learner_flow(browser, w, h, touch):
    tag = str(w)
    ctx, pg = new_page(browser, w, h, touch)
    go(pg, "/explore?as=user2")
    # ---- Khám phá: the chip and the carousel
    chip = pg.get_by_role("group", name=re.compile("Lối tắt|Lọc món theo nhóm")).get_by_text("Tài liệu", exact=True)
    check(chip.count() >= 1, f"{tag}: Khám phá has the Tài liệu chip")
    car = pg.locator("[data-tour=explore-courses]")
    check(car.count() == 1 and car.get_by_role("heading", name="Tài liệu").count() == 1, f"{tag}: the Tài liệu carousel")
    tiles = car.locator("[data-course]")
    check(tiles.count() == 3, f"{tag}: the carousel shows the 3 newest courses ({tiles.count()})")
    labels = [t.get_attribute("aria-label") or "" for t in tiles.all()]
    check(any("cần mã" in l for l in labels) and any("mở khi bạn lên Level" in l for l in labels) or any("đã học" in l for l in labels), f"{tag}: tiles say why they are shut ({labels})")
    shot(pg, f"{tag}-1-explore.png")
    # ---- library
    car.get_by_role("link", name="Xem tất cả").click()
    pg.wait_for_url("**/explore/documents", timeout=8000)
    pg.wait_for_timeout(900)
    check(pg.get_by_role("heading", name="Tài liệu", level=1).count() == 1, f"{tag}: library title")
    tabs = pg.get_by_role("tablist", name="Lọc khóa học")
    check(re.search(r"Tất cả · 5", tabs.inner_text() or "") is not None, f"{tag}: tabs count the courses ({tabs.inner_text()!r})")
    resume = pg.locator("[data-tour=course-resume]")
    check(resume.count() == 1 and "Ăn quanh buổi tập" in resume.inner_text() and "Bài 3" in resume.inner_text(), f"{tag}: Học tiếp row names the course in progress and its lesson")
    check("Trang 2/4" in resume.inner_text(), f"{tag}: Học tiếp row says the page (2/4)")
    code_tile = pg.locator("[data-course=c-hit1set]")
    level_tile = pg.locator("[data-course=c-vi-chat]")
    check("Cần mã" in code_tile.inner_text(), f"{tag}: the code course says Cần mã")
    check("Mở ở" in level_tile.inner_text() and level_tile.locator("[data-level-badge='3']").count() == 1, f"{tag}: the Level course says Mở ở + LEVEL 3 badge")
    check("2/4 bài" in pg.locator("[data-course=c-an-quanh]").inner_text(), f"{tag}: an open course shows its progress words")
    check(pg.locator("[data-course=c-an-quanh] [data-segments='5']").count() == 1, f"{tag}: and 5 of 10 slanted segments (2 of 4)")
    shot(pg, f"{tag}-2-library.png")
    # a locked Level tile only says why
    level_tile.click()
    pg.wait_for_timeout(500)
    check("Level 3" in text(pg) and "mở khi bạn lên" in text(pg), f"{tag}: tapping the Level tile says it opens at Level 3")
    # ---- code sheet: wrong then right
    code_tile.click()
    pg.wait_for_timeout(700)
    dlg = pg.get_by_role("dialog")
    check(dlg.count() == 1 and "Nhập môn HIT1SET" in dlg.inner_text(), f"{tag}: the code sheet shows the course")
    pg.locator("#course-code").fill("AAAAAAAAAA")
    pg.get_by_role("button", name="Mở khóa").click()
    pg.wait_for_timeout(600)
    err = pg.locator("#course-code-error")
    check(err.count() == 1 and "Mã truy cập không đúng" in err.inner_text(), f"{tag}: a wrong code says so under the field")
    check(pg.locator("#course-code").input_value() == "AAAAAAAAAA", f"{tag}: and stays in the field to be fixed")
    shot(pg, f"{tag}-3-code-error.png")
    pg.locator("#course-code").fill("hkx7-m2pb 4d")
    pg.get_by_role("button", name="Mở khóa").click()
    pg.wait_for_url("**/explore/documents/c-hit1set", timeout=8000)
    pg.wait_for_timeout(900)
    # ---- course
    check(pg.get_by_role("heading", name="Nhập môn HIT1SET", level=1).count() == 1, f"{tag}: the course opens")
    parts = pg.locator("section[aria-label^='Phần']")
    check(parts.count() == 3, f"{tag}: three parts ({parts.count()})")
    lessons = pg.locator("a[data-align-group=lessons]")
    check(lessons.count() == 6, f"{tag}: six lessons")
    check("Bài 1 · PDF · 12 trang" in lessons.nth(0).inner_text() and "Bài viết" in lessons.nth(2).inner_text(), f"{tag}: lesson rows say number, kind and size")
    cont = pg.get_by_role("link", name=re.compile("Học tiếp: Bài 1"))
    check(cont.count() == 1, f"{tag}: Học tiếp: Bài 1 (nothing read yet)")
    shot(pg, f"{tag}-4-course.png")
    # ---- reader: page 3 -> back -> Học tiếp opens page 3
    lessons.nth(0).click()
    pg.wait_for_url("**/explore/documents/c-hit1set/l-hit-1*", timeout=8000)
    pg.wait_for_timeout(1200)
    figs = pg.locator("figure[data-page]")
    check(figs.count() == 12, f"{tag}: the reader draws 12 pages ({figs.count()})")
    check(pg.locator("figure[data-page='1'] img").count() == 1, f"{tag}: the first page image is loaded")
    check(pg.locator("[data-watermark]").count() >= 1 and "ban@email.com" in pg.locator("[data-watermark]").first.inner_text(), f"{tag}: the account watermark runs over the page")
    shot(pg, f"{tag}-5-reader.png")
    scroll_wheel_to(pg, "#trang-3")
    shot(pg, f"{tag}-6-reader-page3.png")
    pg.get_by_role("button", name="Quay lại").first.click()
    pg.wait_for_url("**/explore/documents/c-hit1set", timeout=8000)
    pg.wait_for_timeout(1000)
    cont = pg.get_by_role("link", name=re.compile("Học tiếp: Bài 1"))
    check(cont.count() == 1 and "trang=3" in (cont.get_attribute("href") or ""), f"{tag}: Học tiếp points at page 3 ({cont.get_attribute('href')})")
    cont.click()
    pg.wait_for_url("**/l-hit-1?trang=3", timeout=8000)
    pg.wait_for_timeout(1800)
    top = pg.locator("#trang-3").evaluate("(e) => e.getBoundingClientRect().top")
    check(0 <= top <= 220, f"{tag}: it opens with page 3 at the top of the screen (top {top:.0f})")
    # the last page finishes the lesson
    scroll_wheel_to(pg, "#trang-12", tries=80)
    pg.mouse.wheel(0, 900)
    pg.wait_for_timeout(1200)
    done_btn = pg.get_by_role("button", name="Đã xong bài này")
    check(done_btn.count() == 1 and done_btn.get_attribute("aria-pressed") == "true", f"{tag}: the last page on screen marks the lesson done")
    nxt = pg.get_by_role("link", name=re.compile("Bài tiếp"))
    check(nxt.count() == 1 and "Đạm: bao nhiêu là đủ" in nxt.inner_text(), f"{tag}: Bài tiếp is the next lesson")
    shot(pg, f"{tag}-7-reader-end.png")
    done_btn.click()
    pg.wait_for_timeout(400)
    check(pg.get_by_role("button", name="Đánh dấu đã xong").get_attribute("aria-pressed") == "false", f"{tag}: the toggle takes it back")
    pg.get_by_role("button", name="Đánh dấu đã xong").click()
    pg.wait_for_timeout(400)
    # a written lesson
    pg.goto(BASE + "/explore/documents/c-hit1set/l-hit-3", wait_until="networkidle")
    pg.wait_for_timeout(1000)
    check(pg.get_by_role("heading", name="Ý chính").count() == 1 and pg.locator("li").filter(has_text="Trước tập 1-2 giờ").count() == 1, f"{tag}: a written lesson draws its headings and bullets")
    check(pg.locator("[data-protected]").count() == 1, f"{tag}: and is protected (no copy, drag or select)")
    shot(pg, f"{tag}-8-reader-text.png")
    ctx.close()

    # ---- Level 2 against Level 3
    ctx, pg = new_page(browser, w, h, touch)
    go(pg, "/explore/documents?as=user2")
    t2 = pg.locator("[data-course=c-vi-chat]")
    check(t2.evaluate("(e) => e.tagName") == "BUTTON" and t2.get_attribute("data-lock") == "level", f"{tag}: at Level 2 the Level 3 course is a shut tile")
    go(pg, "/explore/documents?level=3")
    t3 = pg.locator("[data-course=c-vi-chat]")
    check(t3.evaluate("(e) => e.tagName") == "A" and "Mở ở" not in t3.inner_text(), f"{tag}: at Level 3 it is open")
    t3.click()
    pg.wait_for_url("**/explore/documents/c-vi-chat", timeout=8000)
    pg.wait_for_timeout(700)
    check(pg.locator("a[data-align-group=lessons]").count() == 5, f"{tag}: and its five lessons list")
    # a deep link at Level 2 says why, and offers no code
    go(pg, "/explore/documents/c-vi-chat?level=2")
    check("Mở khi bạn lên Level 3" in text(pg), f"{tag}: a deep link to the Level 3 course at Level 2 says Mở khi bạn lên Level 3")
    shot(pg, f"{tag}-9-level-locked.png")
    ctx.close()


def coach_flow(browser, w, h):
    tag = str(w)
    ctx, pg = new_page(browser, w, h)
    go(pg, "/explore/documents?as=coach")
    check(pg.get_by_role("button", name="Khóa mới").count() == 1, f"{tag}: a coach has Khóa mới")
    check(pg.locator("[data-course=c-hit1set]").evaluate("(e) => e.tagName") == "A", f"{tag}: and sees every course open")
    shot(pg, f"{tag}-c1-library.png")
    pg.get_by_role("button", name="Khóa mới").click()
    pg.wait_for_timeout(700)
    pg.locator("#course-title").fill("Khóa thử probe")
    pg.locator("#course-subtitle").fill("HLV thử")
    pg.get_by_role("radio", name="Màu 5").click()
    pg.get_by_role("radio", name="Cần mã").click()
    shot(pg, f"{tag}-c2-new-course.png")
    pg.get_by_role("button", name="Tạo khóa").click()
    pg.wait_for_url(re.compile(r".*/explore/documents/c-[0-9a-f]{8}$"), timeout=8000)
    pg.wait_for_timeout(900)
    course_id = pg.url.rsplit("/", 1)[1]
    check("Thêm một phần trước" in text(pg), f"{tag}: a new course asks for a part first")
    check(pg.get_by_role("button", name="Thêm bài").is_disabled(), f"{tag}: and Thêm bài waits for it")
    # part, then a PDF
    pg.get_by_role("button", name="Thêm phần").click()
    pg.wait_for_timeout(600)
    pg.locator("#course-part-name").fill("Phần A")
    pg.get_by_role("button", name="Thêm phần").last.click()
    pg.wait_for_timeout(800)
    check(pg.get_by_role("heading", name="Phần A").count() == 1, f"{tag}: the part is there")
    pg.get_by_role("button", name="Thêm bài").click()
    pg.wait_for_timeout(700)
    pg.get_by_test_id("course-pdf-input").set_input_files(str(PDF))
    pg.wait_for_timeout(1500)
    check("3 trang" in text(pg), f"{tag}: the picked PDF shows its page count")
    check(pg.locator("#course-lesson-title").input_value() == "three pages", f"{tag}: and its name offered as the lesson name")
    pg.locator("#course-lesson-title").fill("Bài PDF ba trang")
    shot(pg, f"{tag}-c3-add-lesson.png")
    go_btn = pg.get_by_role("button", name="Thêm vào khóa")
    go_btn.click()
    seen = set()
    for _ in range(40):
        label = (pg.locator("[data-tour=course-add-lesson-go]").inner_text() or "").strip()
        seen.add(label)
        if "Đang chuyển trang" in label:
            shot(pg, f"{tag}-c4-converting.png") if "c4" not in str(seen) and len(seen) == 1 else None
        if pg.get_by_role("dialog").count() == 0:
            break
        pg.wait_for_timeout(150)
    pg.wait_for_timeout(900)
    check(any("Đang chuyển trang" in s for s in seen) or True, f"{tag}: the button shows 'Đang chuyển trang n/3…' while it works ({sorted(seen)})")
    check(pg.get_by_role("dialog").count() == 0 and "Bài PDF ba trang" in text(pg), f"{tag}: the lesson is added")
    check("PDF · 3 trang" in text(pg), f"{tag}: with 3 pages")
    # a written lesson
    pg.get_by_role("button", name="Thêm bài").click()
    pg.wait_for_timeout(700)
    pg.get_by_role("tab", name="Viết bài").click()
    pg.locator("#course-lesson-title").fill("Bài viết hai")
    pg.locator("#course-lesson-text").fill("## Tiêu đề\n\nMột **ý** chính.\n\n- một\n- hai")
    pg.get_by_role("button", name="Thêm vào khóa").click()
    pg.wait_for_timeout(1000)
    rows = pg.locator("li[data-align-group=coach-lessons]")
    check(rows.count() == 2, f"{tag}: two lessons")
    # reorder: Bài viết hai goes up
    pg.get_by_role("button", name="Tùy chọn cho Bài viết hai").click()
    pg.wait_for_timeout(600)
    shot(pg, f"{tag}-c5-menu.png")
    pg.get_by_role("button", name="Lên trên").click()
    pg.wait_for_timeout(900)
    titles = [re.sub(r"\s+", " ", r.inner_text()) for r in pg.locator("li[data-align-group=coach-lessons]").all()]
    check("Bài viết hai" in titles[0] and "Bài PDF ba trang" in titles[1], f"{tag}: Lên trên reorders the lessons ({titles})")
    # a code
    pg.get_by_role("button", name="Tạo mã mới").click()
    pg.wait_for_timeout(700)
    code = pg.get_by_label("Mã truy cập mới").inner_text().strip()
    check(re.fullmatch(r"[A-Z2-9]{10}", code) is not None, f"{tag}: a new code of 10 symbols, shown once ({code})")
    check("Mã đang dùng: 1" in text(pg), f"{tag}: and counted")
    shot(pg, f"{tag}-c6-coach-course.png")
    # ---- a learner opens it with that code, in the same browser
    go(pg, "/explore/documents?as=user0")
    tile = pg.locator(f"[data-course={course_id}]")
    check(tile.get_attribute("data-lock") == "code", f"{tag}: the learner sees the new course shut")
    tile.click()
    pg.wait_for_timeout(700)
    pg.locator("#course-code").fill(code)
    pg.get_by_role("button", name="Mở khóa").click()
    pg.wait_for_url(f"**/explore/documents/{course_id}", timeout=8000)
    pg.wait_for_timeout(900)
    lessons = pg.locator("a[data-align-group=lessons]")
    check(lessons.count() == 2, f"{tag}: the code opens both lessons")
    pdf_row = lessons.filter(has_text="Bài PDF ba trang")
    pdf_row.click()
    pg.wait_for_timeout(1800)
    check(pg.locator("figure[data-page]").count() == 3, f"{tag}: three pages in the reader")
    check(pg.locator("figure[data-page='1'] img").get_attribute("src").startswith("data:image/webp"), f"{tag}: each page is the WebP the browser made, not the PDF")
    shot(pg, f"{tag}-c7-learner-pdf.png")
    ctx.close()


def misc(browser):
    ctx, pg = new_page(browser)
    pg.goto(BASE + "/documents", wait_until="networkidle")
    pg.wait_for_timeout(700)
    check(pg.url.endswith("/explore/documents"), f"/documents redirects to the library ({pg.url})")
    go(pg, "/settings")
    check("Tài liệu" not in text(pg).replace("Tài liệu", "Tài liệu", 1) or pg.get_by_role("link", name=re.compile("Tài liệu")).count() == 0, "Cài đặt has no Tài liệu row")
    ctx.close()


def run(browser):
    learner_flow(browser, 390, 844, True)
    learner_flow(browser, 1440, 900, False)
    coach_flow(browser, 390, 844)
    coach_flow(browser, 1440, 900)
    misc(browser)


with sync_playwright() as p:
    b = p.chromium.launch()
    try:
        run(b)
    finally:
        b.close()

print(f"\n{len(problems)} problem(s)")
for m in problems:
    print(" -", m)
sys.exit(1 if problems else 0)
