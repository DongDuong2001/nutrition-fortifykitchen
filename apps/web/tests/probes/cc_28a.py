"""cc-28a: page gates.

Production build, demo mode, 390x844 and 1280x800.
- /admin/review: the standard 404 unless the role is admin (user with Level 0, user with Level 2, coach); no admin
  markup in the DOM; the page asks not to be indexed (robots meta); admin sees the queue.
- /coach and /coach/clients/[id]: 404 for a user and an unsigned visitor; coach and admin open them.
- The role is read before the page decides: a coach who opens /coach straight from the URL never flashes the 404.
Run with: ALIGN_BASE_URL=http://localhost:3104 npm run probe -- tests/probes/cc_28a.py
"""
# PROBE_COVERS: app/(app)/admin/review/** app/(app)/coach/** app/(app)/coach/clients/[id]/**
import os
import re
import sys

import _demo  # noqa: F401
from playwright.sync_api import sync_playwright

BASE = os.environ.get("ALIGN_BASE_URL", "http://localhost:3104")
problems, notes = [], []
ADMIN = "/admin/review"
COACH = "/coach"
CLIENT = "/coach/clients/client-1"


def check(cond, msg):
    (notes if cond else problems).append(("ok: " if cond else "") + msg)


def open_route(browser, size, route, persona=None):
    ctx = browser.new_context(viewport=size)
    pg = ctx.new_page()
    errors = []
    pg.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
    pg.on("pageerror", lambda e: errors.append(str(e)))
    url = BASE + route + (f"{'&' if '?' in route else '?'}as={persona}" if persona else "")
    pg.goto(url, wait_until="networkidle")
    pg.wait_for_timeout(700)
    return ctx, pg, errors


def body(pg):
    """Visible text in capitals: headers are set in capitals by CSS, so compare everything the same way."""
    return pg.inner_text("body").upper()


def is_404(pg):
    return "KHÔNG TÌM THẤY TRANG" in body(pg)


def run(browser, size, tag):
    for persona, label in [(None, "user (Level 0)"), ("user2", "user (Level 2)"), ("coach", "coach")]:
        ctx, pg, errors = open_route(browser, size, ADMIN, persona)
        check(is_404(pg), f"{tag} /admin/review is a 404 for a {label}")
        check(pg.locator("[data-align-group=admin-card]").count() == 0 and "KIỂM DUYỆT" not in body(pg), f"{tag} no admin markup for a {label}")
        check(pg.locator("meta[name=robots]").count() >= 1 and "noindex" in (pg.locator("meta[name=robots]").first.get_attribute("content") or ""), f"{tag} robots noindex ({label})")
        ctx.close()
    ctx, pg, errors = open_route(browser, size, ADMIN, "admin")
    check("KIỂM DUYỆT" in body(pg) and not is_404(pg), f"{tag} admin opens the review queue")
    check(not [e for e in errors if "preloaded using link preload" not in e], f"{tag} admin: no console errors {errors[:1]}")
    ctx.close()

    for route in (COACH, CLIENT):
        for persona, label in [(None, "user (Level 0)"), ("user2", "user (Level 2)")]:
            ctx, pg, errors = open_route(browser, size, route, persona)
            check(is_404(pg), f"{tag} {route} is a 404 for a {label}")
            check("HỌC VIÊN" not in body(pg), f"{tag} no coach markup for a {label}")
            check("noindex" in (pg.locator("meta[name=robots]").first.get_attribute("content") or ""), f"{tag} {route} noindex")
            ctx.close()
        for persona in ("coach", "admin"):
            ctx, pg, errors = open_route(browser, size, route, persona)
            check(not is_404(pg) and "HỌC VIÊN" in body(pg), f"{tag} {route} opens for {persona}")
            ctx.close()

    # no flash: the gate shows nothing, then the page, never the 404, while the role is being read
    ctx = browser.new_context(viewport=size)
    ctx.add_init_script(
        """window.__seen404 = false; setInterval(() => { if (document.body && document.body.innerText.toUpperCase().includes('KHÔNG TÌM THẤY TRANG')) window.__seen404 = true; }, 2);"""
    )
    pg = ctx.new_page()
    pg.goto(BASE + COACH + "?as=coach", wait_until="networkidle")
    pg.wait_for_timeout(500)
    check(pg.evaluate("window.__seen404") is False, f"{tag} a coach never sees the 404 flash")
    ctx.close()


with sync_playwright() as p:
    browser = p.chromium.launch()
    run(browser, {"width": 390, "height": 844}, "390")
    run(browser, {"width": 1280, "height": 800}, "1280")
    browser.close()

for line in notes:
    print(line)
for line in problems:
    print("FAIL: " + line)
print(f"{len(notes)} ok, {len(problems)} FAIL")
sys.exit(1 if problems else 0)
