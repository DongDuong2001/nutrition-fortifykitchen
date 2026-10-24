"""feat/sound-goals §5b: the course moments (390 x 844 and 1440 x 900, demo build, Level 2 learner).

1  Lesson done by a tap: the check draws in once (m-check-draw, the path whole after), the success ring is the button's data-done overlay, the save cue
   makes 1 sound, the polite line says "Đã xong bài này"; the un-mark makes no sound and the overlay fades; no class is left over.
2  The reader marking a lesson by itself (a written lesson shown to its end) looks the same and makes no sound; when it is the lesson that finishes the
   course the button rings once (m-goal-ring) and reads "Xong khóa học" for 2,4 s, no sound; "Xong khóa học Ăn quanh buổi tập" is announced.
3  Once per course: marking it again plays nothing more than the save cue.
4  The tap that finishes the course (any lesson, not only the last in order): the day cue only (1 sound, not 2), the ring and the words.
5  Reduced motion: the check and the shackle have no animation, nothing rings, the words still change.
6  Code accepted: the sheet's own tile has the state pill (lock + "Cần mã"); a wrong code keeps its line and makes no sound; the right one swings the shackle
   open (m-lock-open), the word reads "Đã mở", 1 sound, "Đã mở khóa Nhập môn HIT1SET" is announced, the sheet is still there at 250 ms and the course
   opens ~450 ms after the code was accepted; closing the sheet during the pause opens the course at once.
Screenshots: out/goal-moments/course-*.png. Run with: ALIGN_BASE_URL=http://localhost:3105 npm run probe -- tests/probes/course_moments.py
"""
# PROBE_COVERS: app/(app)/explore/documents/** components/courses/** components/ui/goal-label.tsx lib/course-moments.ts lib/goal-fx.ts lib/cue.ts
import re
import sys

from playwright.sync_api import sync_playwright

from _goals_lib import BASE, DESKTOP, PHONE, SHOTS, WATCH, Report, fx, sound_count
import _demo  # noqa: F401

R = Report()
check = R.check
NO_INSTALL = "try { sessionStorage.setItem('h1t_install_shown', '1'); } catch (e) {}"


def page(browser, vp, **extra):
    ctx = browser.new_context(**vp, **extra)
    ctx.add_init_script(NO_INSTALL)
    return ctx, ctx.new_page()


def go(pg, path):
    pg.goto(BASE + path, wait_until="networkidle")
    pg.wait_for_timeout(1200)


def done_button(pg):
    return pg.locator("section[aria-label='Kết thúc bài'] button[aria-pressed]").first


def polite(pg):
    return pg.evaluate("[...document.querySelectorAll('p[aria-live=polite].sr-only')].map((e) => e.textContent.trim()).join('|')")


def seen(pg, cls):
    return [e for e in fx(pg) if e["cls"] == cls]


def overlay_opacity(pg):
    return pg.evaluate("getComputedStyle(document.querySelector(\"section[aria-label='Kết thúc bài'] button[aria-pressed]\"), '::before').opacity")


def dash(pg):
    return pg.evaluate("(() => { const p = document.querySelector(\"section[aria-label='Kết thúc bài'] button svg path\"); return p ? getComputedStyle(p).strokeDashoffset : null; })()")


def mid_draw(pg):
    """Holds the check's draw at 40 ms of its 200 (the shot and the reading cannot catch it finished) and reads the dash array and offset there."""
    return pg.evaluate("(() => { const p = document.querySelector(\"section[aria-label='Kết thúc bài'] button svg path\"); if (!p) return null; const a = p.getAnimations(); a.forEach((x) => { x.pause(); x.currentTime = 40; }); const c = getComputedStyle(p); return { anims: a.length, array: c.strokeDasharray, offset: parseFloat(c.strokeDashoffset) }; })()")


def resume_draw(pg):
    pg.evaluate("document.querySelector(\"section[aria-label='Kết thúc bài'] button svg path\").getAnimations().forEach((x) => x.play())")


def lesson_by_tap(browser, vp, tag):
    ctx, pg = page(browser, vp)
    # ?trang=1: the last page is not on screen, so the lesson is not finished by the reader
    go(pg, "/explore/documents/c-an-quanh/l-aq-3?as=user2&trang=1")
    btn = done_button(pg)
    check("Đánh dấu đã xong" in btn.inner_text(), f"{tag} lesson: not done yet")
    pg.evaluate(WATCH)
    before = sound_count(pg)
    btn.click()
    pg.wait_for_timeout(40)
    mid = mid_draw(pg)
    pg.screenshot(path=f"{SHOTS}/course-lesson-done-{tag}.png", animations="allow")
    resume_draw(pg)
    pg.wait_for_timeout(700)
    # a dash offset does nothing without a dash array: mid-draw the path must be dashed and partly drawn
    check(mid is not None and mid["anims"] >= 1 and mid["array"] != "none" and 0 < mid["offset"] < 1, f"{tag} lesson: the check at a mid-draw frame (dash array and offset {mid})")
    check("Đã xong bài này" in btn.inner_text() and btn.get_attribute("aria-pressed") == "true", f"{tag} lesson: the button reads Đã xong bài này")
    check(btn.get_attribute("data-done") is not None and overlay_opacity(pg) == "1", f"{tag} lesson: the success ring is the overlay, in ({overlay_opacity(pg)})")
    check(len(seen(pg, "m-check-draw")) >= 1, f"{tag} lesson: the check draws in once")
    check(seen(pg, "m-goal-ring") == [], f"{tag} lesson: no course ring for a lesson that is not the last")
    check(sound_count(pg) - before == 1, f"{tag} lesson: the tap made 1 sound, the save cue ({sound_count(pg) - before})")
    check(polite(pg) == "Đã xong bài này", f"{tag} lesson: the polite line ({polite(pg)!r})")
    check(dash(pg) == "0px", f"{tag} lesson: the path is whole once drawn ({dash(pg)})")
    check(pg.evaluate("document.querySelectorAll('.m-check-draw').length") == 0, f"{tag} lesson: the draw class is taken off")
    # the un-mark: no sound, the overlay fades out
    before = sound_count(pg)
    btn.click()
    pg.wait_for_timeout(350)
    check(btn.get_attribute("data-done") is None and overlay_opacity(pg) == "0", f"{tag} un-mark: the overlay is out ({overlay_opacity(pg)})")
    check(sound_count(pg) == before, f"{tag} un-mark: no sound")
    check("Đánh dấu đã xong" in btn.inner_text(), f"{tag} un-mark: the button reads Đánh dấu đã xong")
    ctx.close()


def ensure_done(pg):
    """The lesson is marked done, by the reader or by a tap (a page of a PDF may or may not be on screen)."""
    btn = done_button(pg)
    pg.wait_for_timeout(500)
    if btn.get_attribute("aria-pressed") != "true":
        btn.click()
        pg.wait_for_timeout(500)


def course_by_itself_then_once(browser, vp, tag):
    ctx, pg = page(browser, vp)
    go(pg, "/explore/documents/c-an-quanh/l-aq-3?as=user2&trang=1")
    ensure_done(pg)
    # the written lesson shown to its end finishes the course by itself
    # The reader marks a written lesson as soon as it is shown: watch from the start of the page
    pg.context.add_init_script("window.addEventListener('DOMContentLoaded', (%s))" % WATCH)
    go(pg, "/explore/documents/c-an-quanh/l-aq-4?as=user2")
    btn = done_button(pg)
    pg.wait_for_timeout(300)
    check(btn.get_attribute("aria-pressed") == "true", f"{tag} by itself: the written lesson is marked by the reader")
    pg.screenshot(path=f"{SHOTS}/course-finished-{tag}.png", animations="allow")
    check("Xong khóa học" in btn.inner_text(), f"{tag} course: the button reads Xong khóa học ({btn.inner_text()!r})")
    check(len(seen(pg, "m-goal-ring")) >= 1, f"{tag} course: the button rings once")
    check(sound_count(pg) == 0, f"{tag} course: finished by itself makes no sound ({sound_count(pg)})")
    check(polite(pg) == "Xong khóa học Ăn quanh buổi tập", f"{tag} course: announced ({polite(pg)!r})")
    pg.wait_for_timeout(2900)
    check("Đã xong bài này" in btn.inner_text(), f"{tag} course: Đã xong bài này glides back ({btn.inner_text()!r})")
    check(pg.evaluate("document.querySelectorAll('[class*=m-goal-], .m-check-draw').length") == 0, f"{tag} course: no class is left over")
    # once per course: unmark and mark again by a tap
    btn.click()
    pg.wait_for_timeout(300)
    pg.evaluate("window.__fx.length = 0")
    before = sound_count(pg)
    btn.click()
    pg.wait_for_timeout(900)
    check("Xong khóa học" not in btn.inner_text() and not seen(pg, "m-goal-ring"), f"{tag} once: marking it again does not ring ({btn.inner_text()!r})")
    check(sound_count(pg) - before == 1, f"{tag} once: only the save cue ({sound_count(pg) - before})")
    ctx.close()


def course_by_tap(browser, vp, tag):
    ctx, pg = page(browser, vp)
    # Bài 4 (a written lesson) is done by the reader first; the tap on Bài 3, not the last in order, then finishes the course
    go(pg, "/explore/documents/c-an-quanh/l-aq-4?as=user2")
    ensure_done(pg)
    go(pg, "/explore/documents/c-an-quanh/l-aq-3?as=user2&trang=1")
    btn = done_button(pg)
    check("Đánh dấu đã xong" in btn.inner_text(), f"{tag} tap: the one lesson left is not done")
    pg.evaluate(WATCH)
    before = sound_count(pg)
    btn.click()
    pg.wait_for_timeout(250)
    check("Xong khóa học" in btn.inner_text(), f"{tag} tap: the tap that finishes the course says Xong khóa học ({btn.inner_text()!r})")
    check(len(seen(pg, "m-goal-ring")) >= 1, f"{tag} tap: and rings the button ({[(e['cls'], e['what']) for e in fx(pg)]})")
    pg.wait_for_timeout(700)
    check(sound_count(pg) - before == 1, f"{tag} tap: the day cue alone, 1 sound ({sound_count(pg) - before})")
    check(polite(pg) == "Xong khóa học Ăn quanh buổi tập", f"{tag} tap: announced ({polite(pg)!r})")
    ctx.close()


def reduced(browser):
    ctx, pg = page(browser, PHONE, reduced_motion="reduce")
    go(pg, "/explore/documents/c-an-quanh/l-aq-3?as=user2&trang=1")
    pg.evaluate(WATCH)
    done_button(pg).click()
    pg.wait_for_timeout(400)
    name = pg.evaluate("(() => { const p = document.querySelector(\"section[aria-label='Kết thúc bài'] button svg path\"); return p ? getComputedStyle(p).animationName : null; })()")
    check(name == "none", f"reduced: the check has no draw animation ({name})")
    check(dash(pg) == "0px", "reduced: the check is whole")
    check(not seen(pg, "m-goal-ring"), "reduced: nothing rings")
    check(overlay_opacity(pg) == "1", "reduced: the ring still shows (it only fades)")
    ctx.close()


def code_accepted(browser, vp, tag):
    ctx, pg = page(browser, vp)
    go(pg, "/explore/documents?as=user2")
    pg.locator("[data-course=c-hit1set]").click()
    pg.wait_for_timeout(800)
    dlg = pg.get_by_role("dialog")
    pill = dlg.locator("span.rounded-full:has-text('Cần mã')")
    check(pill.count() == 1, f"{tag} code: the sheet's own tile has the state pill with Cần mã")
    check(dlg.locator(".m-shackle").count() == 1, f"{tag} code: and the shackle as its own path")
    pg.screenshot(path=f"{SHOTS}/course-code-sheet-{tag}.png")
    before = sound_count(pg)
    pg.locator("#course-code").fill("AAAAAAAAAA")
    pg.get_by_role("button", name="Mở khóa").click()
    pg.wait_for_timeout(600)
    check(pg.locator("#course-code-error").count() == 1 and sound_count(pg) == before, f"{tag} code: a wrong code keeps its line and makes no sound ({sound_count(pg) - before})")
    pg.evaluate(WATCH)
    pg.locator("#course-code").fill("hkx7-m2pb 4d")
    pg.get_by_role("button", name="Mở khóa").click()
    pg.wait_for_function("document.querySelector('[role=dialog] .m-lock-open')", timeout=3000)
    pg.wait_for_timeout(120)
    pg.screenshot(path=f"{SHOTS}/course-code-accepted-{tag}.png", animations="allow")
    check("Đã mở" in dlg.inner_text() and "Cần mã" not in dlg.inner_text(), f"{tag} code: the word glides to Đã mở")
    check(sound_count(pg) - before == 1, f"{tag} code: the save cue, 1 sound ({sound_count(pg) - before})")
    check(polite(pg) == "Đã mở khóa Nhập môn HIT1SET", f"{tag} code: announced ({polite(pg)!r})")
    pg.wait_for_timeout(130)
    check(pg.get_by_role("dialog").count() == 1 and "/explore/documents/c-hit1set" not in pg.url, f"{tag} code: the sheet is still there ~250 ms in")
    pg.wait_for_url("**/explore/documents/c-hit1set", timeout=3000)
    check(pg.get_by_role("dialog").count() == 0, f"{tag} code: the course opens and the sheet has gone")
    ctx.close()


def code_closed_early(browser):
    ctx, pg = page(browser, PHONE)
    go(pg, "/explore/documents?as=user2")
    pg.locator("[data-course=c-an-ngoai]").click()
    pg.wait_for_timeout(800)
    pg.locator("#course-code").fill("nq3t-v8wz 6c")
    pg.get_by_role("button", name="Mở khóa").click()
    pg.wait_for_function("document.querySelector('[role=dialog] .m-lock-open')", timeout=3000)
    pg.keyboard.press("Escape")
    pg.wait_for_url("**/explore/documents/c-an-ngoai", timeout=1500)
    check("/explore/documents/c-an-ngoai" in pg.url, "closed early: Esc during the pause opens the course at once")
    ctx.close()


with sync_playwright() as p:
    browser = p.chromium.launch()
    for vp, tag in ((PHONE, "390"), (DESKTOP, "1440")):
        lesson_by_tap(browser, vp, tag)
        course_by_itself_then_once(browser, vp, tag)
        course_by_tap(browser, vp, tag)
        code_accepted(browser, vp, tag)
    reduced(browser)
    code_closed_early(browser)
    browser.close()

print(f"\n{len(R.problems)} problem(s)")
sys.exit(1 if R.problems else 0)
