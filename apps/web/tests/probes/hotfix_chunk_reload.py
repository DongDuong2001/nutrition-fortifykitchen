"""Hotfix 23/10 (chunk reload): after a deploy a phone still holding the old page asks for JS chunks that no longer exist. The inline
script in the root layout (lib/chunk-reload-script) reloads the page once, never in a loop, never over unsaved work.
Works on the demo build (gate:fast) and a live build alike; service workers are blocked so page.route can answer the chunk requests.
  A  a cold page load where the first /_next/static/chunks/*.js answers 404: the page reloads ONCE (two navigations), the app works,
     the stamp h1t_chunk_reload is set, and it is cleared after the page has run fine for 10 s
  B  a page left open across a deploy: a tap on a tab asks for a chunk that is gone (404): it reloads once, and the app works again
     once the chunks are back
  C  the same, but the chunk is still gone after the reload: the error screen "Có bản cập nhật mới" with Tải lại, and NO third
     navigation (no loop); Tải lại reloads (stamping it again), and works once the chunks are back
  D  something typed in a form (Tự nhập, the name field): the failure does not reload; a toast "Có bản cập nhật" with Tải lại offers
     it; a tap while the field is still in hand waits ("bạn xong việc đang làm là tải lại") and does not reload
  E  a failing script that is not a build file (/_next/static/ only counts) and a failing API fetch do nothing
  F  a second failure inside 60 s that is only a rejection (a background import such as lib/vitals): the toast "Có bản cập nhật", not
     the error screen, and no reload; a failed build <script> in the same state still gets the error screen
Run with: ALIGN_BASE_URL=http://localhost:3101 npm run probe -- tests/probes/hotfix_chunk_reload.py
Pick parts with HCR_ONLY=A,B
"""
# PROBE_COVERS: app/layout.tsx app/error.tsx app/global-error.tsx components/pwa/chunk-*.tsx components/unsaved-work-watch.tsx lib/chunk-reload*.ts
import os
import re
import sys
import time
from pathlib import Path

from playwright.sync_api import sync_playwright
import _demo  # noqa: F401  (demo mode on, tour done, tips off)

BASE = os.environ.get("ALIGN_BASE_URL", "http://localhost:3100")
ONLY = set(filter(None, os.environ.get("HCR_ONLY", "").split(",")))
SHOTS = Path(__file__).resolve().parent.parent.parent / ".screenshots" / "hotfix-chunk-reload"
SHOTS.mkdir(parents=True, exist_ok=True)
PHONE = {"viewport": {"width": 390, "height": 844}}
KEY = "h1t_chunk_reload"
CHUNK = re.compile(r"/_next/static/chunks/.*\.js")
problems = []


def check(cond, msg):
    print(("[PASS] " if cond else "[FAIL] ") + msg)
    if not cond:
        problems.append(msg)


class Page:
    """A phone with service workers blocked, counting its navigations and answering chunk requests as the test says.
    `mode`: "ok" (let everything through), "first" (404 the first chunk request, then ok), "new" (404 every chunk this page did not
    have when `freeze()` was called: the files a deploy removed are the ones a stale page does not know yet), "new-once" (the first
    of those only)."""

    def __init__(self, browser):
        self.ctx = browser.new_context(service_workers="block", **PHONE)
        self.pg = self.ctx.new_page()
        self.navs = []
        self.mode = "ok"
        self.seen = set()
        self.failed = []
        self.console = []
        self.pg.on("request", lambda r: r.is_navigation_request() and r.frame == self.pg.main_frame and self.navs.append(r.url))
        self.pg.on("console", lambda m: self.console.append(m.text))
        self.pg.route(CHUNK, self._route)

    def _route(self, route):
        url = route.request.url
        fail = (self.mode == "first" and not self.failed) or (self.mode == "new" and url not in self.seen) or (self.mode == "new-once" and url not in self.seen and not self.failed)
        if fail:
            self.failed.append(url)
            return route.fulfill(status=404, content_type="text/plain", body="gone")
        self.seen.add(url)
        route.continue_()

    def freeze(self, mode="new"):
        """From now on only the chunks this page already has are there."""
        self.mode = mode

    def stamp(self):
        return self.pg.evaluate("(k) => sessionStorage.getItem(k)", KEY)

    def app_ready(self, timeout=20000):
        self.pg.locator('nav[aria-label="Điều hướng chính"]:visible, nav:visible').first.wait_for(state="visible", timeout=timeout)

    def error_screen(self):
        return self.pg.get_by_text("Có bản cập nhật mới", exact=True)

    def tab(self):
        self.pg.get_by_role("link", name=re.compile("Tổng quan")).first.click()

    def shot(self, name):
        self.pg.screenshot(path=str(SHOTS / f"{name}.png"))


def part(name):
    return not ONLY or name in ONLY


with sync_playwright() as p:
    browser = p.chromium.launch()

    if part("A"):
        print("-- A: cold load, the first chunk answers 404")
        t = Page(browser)
        t.mode = "first"
        t.pg.goto(BASE + "/app", wait_until="domcontentloaded")
        t.app_ready()
        t.pg.wait_for_timeout(1500)
        check(len(t.failed) == 1, f"A: one chunk request was answered 404 ({t.failed[:1]})")
        check(len(t.navs) == 2, f"A: the page loaded twice (once, then one reload): {len(t.navs)} navigations")
        stamp = t.stamp()
        check(stamp is not None and abs(time.time() * 1000 - int(stamp)) < 20000, f"A: the stamp {KEY} is set right after the reload ({stamp})")
        check(t.error_screen().count() == 0, "A: no error screen")
        t.shot("A-after-reload")
        t.pg.wait_for_function("(k) => sessionStorage.getItem(k) === null", arg=KEY, timeout=14000)
        check(True, "A: the stamp is cleared after the page ran fine for 10 s")
        check(len(t.navs) == 2, "A: still two navigations")
        t.ctx.close()

    if part("B"):
        print("-- B: a stale page asks for a chunk that is gone, once")
        t = Page(browser)
        t.pg.goto(BASE + "/app", wait_until="domcontentloaded")
        t.app_ready()
        t.pg.wait_for_timeout(1000)
        t.freeze("new-once")
        t.tab()
        t.pg.wait_for_timeout(3500)
        t.app_ready()
        check(len(t.failed) == 1, f"B: the page asked for a chunk that is gone ({t.failed[:1]})")
        check(len(t.navs) == 2, f"B: the page reloaded once ({len(t.navs)} navigations)")
        check(t.error_screen().count() == 0, "B: no error screen, the app works again")
        check(t.stamp() is not None, "B: the stamp is set")
        t.shot("B-after-reload")
        t.ctx.close()

    if part("C"):
        print("-- C: the chunk is still gone after the reload: the error screen, no loop")
        t = Page(browser)
        t.pg.goto(BASE + "/app", wait_until="domcontentloaded")
        t.app_ready()
        t.pg.wait_for_timeout(1000)
        t.freeze("new")
        t.tab()
        t.error_screen().wait_for(state="visible", timeout=15000)
        n = len(t.navs)
        t.pg.wait_for_timeout(4000)
        check(n == 2 and len(t.navs) == 2, f"C: it reloaded once and then stopped ({n} navigations, {len(t.navs)} after 4 s)")
        reload_btn = t.pg.get_by_role("button", name="Tải lại", exact=True)
        check(reload_btn.is_visible(), "C: the error screen has a Tải lại button")
        check(t.pg.get_by_role("button", name="Thử lại").count() == 0, "C: not the Thử lại that cannot help")
        t.shot("C-error-screen")
        reload_btn.click()
        t.pg.wait_for_timeout(3000)
        check(len(t.navs) == 3, f"C: Tải lại reloads ({len(t.navs)} navigations)")
        t.mode = "ok"
        t.error_screen().wait_for(state="visible", timeout=15000)
        t.pg.get_by_role("button", name="Tải lại", exact=True).click()
        t.pg.wait_for_timeout(2500)
        t.app_ready()
        check(t.error_screen().count() == 0 and len(t.navs) == 4, f"C: with the chunks back, Tải lại brings the app back ({len(t.navs)} navigations)")
        t.ctx.close()

    if part("D"):
        print("-- D: something typed: no reload, a toast")
        t = Page(browser)
        t.pg.goto(BASE + "/foods/new?mode=nutrition", wait_until="domcontentloaded")
        t.pg.locator("#cf-name").wait_for(state="visible", timeout=20000)
        t.pg.wait_for_timeout(800)
        t.pg.locator("#cf-name").click()
        t.pg.keyboard.type("Bánh của mẹ")
        t.pg.wait_for_timeout(300)
        check(t.pg.evaluate("() => window.h1tUnsaved && window.h1tUnsaved()") is True, "D: the page knows something is typed (window.h1tUnsaved)")
        t.pg.evaluate("() => { const s = document.createElement('script'); s.src = '/_next/static/chunks/gone-hcr.js'; document.body.appendChild(s); }")
        toast = t.pg.get_by_text("Có bản cập nhật", exact=True)
        toast.wait_for(state="visible", timeout=8000)
        t.pg.wait_for_timeout(1500)
        check(len(t.navs) == 1, f"D: it did not reload over the typed name ({len(t.navs)} navigation)")
        check(t.stamp() is None, "D: the stamp is not set (nothing was reloaded)")
        check(t.pg.locator("#cf-name").input_value() == "Bánh của mẹ", "D: the name is still there")
        t.shot("D-toast")
        t.pg.get_by_role("button", name="Tải lại", exact=True).click()
        t.pg.wait_for_timeout(1500)
        check(t.pg.get_by_text("bạn xong việc đang làm là tải lại", exact=False).is_visible(), "D: a tap while the name is in hand waits and says so")
        check(len(t.navs) == 1 and t.pg.locator("#cf-name").input_value() == "Bánh của mẹ", "D: and still does not reload")
        t.shot("D-waiting")
        # Leaving the screen lets go of the typed field: the waiting reload happens
        t.tab()
        t.pg.wait_for_timeout(3000)
        check(len(t.navs) == 2, f"D: once the form is gone the waiting reload happens ({len(t.navs)} navigations)")
        t.ctx.close()

    if part("E"):
        print("-- E: things that are not a missing chunk")
        t = Page(browser)
        t.pg.goto(BASE + "/app", wait_until="domcontentloaded")
        t.app_ready()
        t.pg.wait_for_timeout(1000)
        t.pg.evaluate("() => { const s = document.createElement('script'); s.src = '/not-a-build-file-hcr.js'; document.body.appendChild(s); }")
        t.pg.evaluate("() => { fetch('http://127.0.0.1:1/api'); }")
        t.pg.evaluate("() => { Promise.reject(new TypeError('Failed to fetch')); }")
        t.pg.wait_for_timeout(2000)
        check(len(t.navs) == 1 and t.stamp() is None, f"E: no reload for a script outside /_next/static/, a failed fetch or a bare 'Failed to fetch' ({len(t.navs)} navigation)")
        check(t.pg.get_by_text("Có bản cập nhật", exact=False).count() == 0, "E: no toast, no error screen")
        t.ctx.close()

    if part("F"):
        print("-- F: a bare rejection on a second failure offers the update, it does not take the app away")
        t = Page(browser)
        t.pg.goto(BASE + "/app", wait_until="domcontentloaded")
        t.app_ready()
        t.pg.evaluate("(k) => sessionStorage.setItem(k, String(Date.now()))", KEY)
        t.pg.evaluate("() => { Promise.reject(Object.assign(new Error('Loading chunk 9 failed.'), { name: 'ChunkLoadError' })); }")
        t.pg.get_by_text("Có bản cập nhật", exact=True).wait_for(state="visible", timeout=8000)
        t.pg.wait_for_timeout(1500)
        check(t.error_screen().count() == 0, "F: no error screen")
        check(len(t.navs) == 1, f"F: no reload ({len(t.navs)} navigation)")
        check(t.pg.locator("nav:visible").count() > 0, "F: the app is still there")
        t.shot("F-toast")
        t.ctx.close()
        t = Page(browser)
        t.pg.goto(BASE + "/app", wait_until="domcontentloaded")
        t.app_ready()
        t.pg.evaluate("(k) => sessionStorage.setItem(k, String(Date.now()))", KEY)
        t.pg.evaluate("() => { const s = document.createElement('script'); s.src = '/_next/static/chunks/gone-hcr-f.js'; document.body.appendChild(s); }")
        t.error_screen().wait_for(state="visible", timeout=8000)
        check(len(t.navs) == 1, "F: a failed build <script> in the same state gets the error screen, and no reload")
        t.ctx.close()

    browser.close()

print()
print("PROBLEMS:" if problems else "ALL PASS")
for m in problems:
    print(" -", m)
sys.exit(1 if problems else 0)
