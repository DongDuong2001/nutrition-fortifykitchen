"""Shared by courses.py (the learner and the coach flows) and courses_upload.py (the PDF upload checks): the helpers, the page-side scripts
and the fixtures. The underscore keeps run_all away from this file."""
import os
import re
from pathlib import Path

import _demo  # noqa: F401

BASE = os.environ.get("ALIGN_BASE_URL", "http://localhost:3120")
SHOTS = Path(__file__).resolve().parent.parent.parent / ".screenshots" / "courses"
SHOTS.mkdir(parents=True, exist_ok=True)
PDF = Path(__file__).resolve().parent / "fixtures" / "three-pages.pdf"
SIXTY = Path(__file__).resolve().parent / "fixtures" / "sixty-pages.pdf"
# Counts the canvases the page makes (pdfjs and lib/pdf-pages): Safari refuses new ones after a few dozen big ones, so a 60-page PDF must reuse one
# A slow server: each page the mock stores takes 150 ms, so the 60 pages take long enough to answer a question in the middle
SLOW_PAGES = "(() => { const o = Storage.prototype.setItem; Storage.prototype.setItem = function (k, v) { if (String(k).startsWith('h1t_mock_course_page_v1_')) { const t = Date.now(); while (Date.now() - t < 150); } return o.call(this, k, v); }; })();"
# What the mock was sent for each page: the first bytes, as the server would read them (the mock itself wraps anything as image/webp)
RECORD_PAGES = "window.__pageHeads = []; (() => { const o = Storage.prototype.setItem; Storage.prototype.setItem = function (k, v) { if (String(k).startsWith('h1t_mock_course_page_v1_')) { const b = atob(String(v).split(',')[1].slice(0, 16)); window.__pageHeads.push({ riff: b.slice(0, 4), webp: b.slice(8, 12) }); } return o.call(this, k, v); }; })();"
# The workers the page starts (pdf.js's own, and the WASM encoder's: lib/webp-worker, a chunk) and what toBlob answers, and the longest the main thread went without answering a 50 ms timer
WATCH_THREADS = "window.__workers = []; (() => { const W = window.Worker; window.Worker = class extends W { constructor(u, o) { window.__workers.push(String(u)); super(u, o); } }; })(); window.__toBlob = []; (() => { const t = HTMLCanvasElement.prototype.toBlob; HTMLCanvasElement.prototype.toBlob = function (cb, type, q) { return t.call(this, (b) => { window.__toBlob.push(b && b.type); cb(b); }, type, q); }; })(); window.__maxGap = 0; (() => { let last = performance.now(); setInterval(() => { const n = performance.now(); window.__maxGap = Math.max(window.__maxGap, n - last); last = n; }, 50); })();"
COUNT_CANVASES = "window.__canvases = 0; (() => { const o = Document.prototype.createElement; Document.prototype.createElement = function (t, ...r) { if (String(t).toLowerCase() === 'canvas') window.__canvases++; return o.call(this, t, ...r); }; })();"
NO_INSTALL = "try { sessionStorage.setItem('h1t_install_shown', '1'); } catch (e) {}"
problems = []


def check(cond, msg):
    print(("[PASS] " if cond else "[FAIL] ") + msg)
    if not cond:
        problems.append(msg)


REQUESTS = []  # every URL any page of this probe asked for, in order


def new_page(browser, w=390, h=844, touch=False):
    ctx = browser.new_context(viewport={"width": w, "height": h}, device_scale_factor=2 if w < 800 else 1, has_touch=touch)
    ctx.add_init_script(NO_INSTALL)
    pg = ctx.new_page()
    pg.on("request", lambda r: REQUESTS.append(r.url))
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
