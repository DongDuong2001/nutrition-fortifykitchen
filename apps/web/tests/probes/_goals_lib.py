"""Helpers shared by goal_moments.py and course_moments.py (feat/sound-goals). Not a probe (run_all.py skips names that start with "_")."""
import json
import os
import re

import _demo  # noqa: F401  (demo mode, tour and tips off)

BASE = os.environ.get("ALIGN_BASE_URL", "http://localhost:3105")
PHONE = dict(viewport={"width": 390, "height": 844}, device_scale_factor=2, is_mobile=True, has_touch=True)
DESKTOP = dict(viewport={"width": 1440, "height": 900}, device_scale_factor=1)
SHOTS = os.path.join(os.path.dirname(__file__), "out", "goal-moments")
os.makedirs(SHOTS, exist_ok=True)
SEED = {"installPrompt": {"dismissCount": 0, "snoozeUntil": 0, "done": True, "firstSeenIso": "2026-01-01"}}

# Records every element that gets a goal-moment class (and when), whatever the page does next
WATCH = """() => {
  window.__fx = [];
  const t0 = performance.now();
  const describe = (el) => (el.closest('[data-nutrient-row]')?.getAttribute('data-nutrient-row') || el.closest('[data-hero-macro]')?.getAttribute('data-hero-macro') || el.getAttribute('data-fx') || el.tagName.toLowerCase());
  new MutationObserver((list) => {
    for (const m of list) {
      if (m.type === 'childList') {
        m.addedNodes.forEach((n) => { if (n.nodeType === 1 && n.classList?.contains('m-goal-sparks')) window.__fx.push({ cls: 'm-goal-sparks', at: Math.round(performance.now() - t0), what: 'sparks' }); });
        continue;
      }
      const el = m.target;
      for (const c of el.classList) if (c.startsWith('m-goal-') && !(m.oldValue || '').split(' ').includes(c)) window.__fx.push({ cls: c, at: Math.round(performance.now() - t0), what: describe(el) });
    }
  }).observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['class'], attributeOldValue: true });
}"""


class Report:
    def __init__(self):
        self.problems = []

    def check(self, cond, msg):
        print(("[PASS] " if cond else "[FAIL] ") + msg)
        if not cond:
            self.problems.append(msg)


def new_context(browser, viewport=PHONE, sound=None, **extra):
    ctx = browser.new_context(**viewport, **extra)
    settings = dict(SEED)
    if sound is not None:
        settings["sound"] = sound
    for key in ("h1t_settings_v1_demo", "h1t_settings_v1_first.food@example.com"):
        ctx.add_init_script("try { if (!localStorage.getItem('%s')) localStorage.setItem('%s', %r) } catch (e) {}" % (key, key, json.dumps(settings)))
    return ctx


def open_home(pg):
    pg.goto(BASE + "/app", wait_until="networkidle")
    pg.locator('[data-fx="hero"]').wait_for(state="visible", timeout=15000)
    pg.wait_for_timeout(1500)


def fab(pg):
    return pg.locator("#mobile-add-fab:visible, #desktop-add-btn:visible").first


def add_from_sheet(pg, name, grams=None):
    """+ → search → the food → grams → Thêm. Returns when the address is Hôm nay's again (the sheet has left)."""
    fab(pg).click()
    pg.wait_for_url(re.compile(r".*/add(\?.*)?$"))
    pg.locator("[data-testid=food-search]:visible").first.fill(name)
    row = pg.locator("[data-food-row]:visible", has_text=name).first
    row.wait_for(timeout=20000)
    row.click()
    if grams is not None:
        box = pg.locator('input[aria-label="Số gam"]:visible').first
        box.wait_for(timeout=10000)
        box.fill(str(grams))
    pg.locator("[data-testid=portion-add]:visible").first.click()
    pg.wait_for_url(re.compile(r".*/app(\?.*)?$"), timeout=15000)


def row_pct(pg, key):
    text = pg.evaluate(
        """(key) => { const r = document.querySelector('aside[data-fx=column] [data-nutrient-row="' + key + '"] [data-fx=pct]'); return r ? r.textContent : null; }""",
        key,
    )
    return None if text is None else int(re.sub(r"\D", "", text) or 0)


def column_text(pg):
    return pg.evaluate("document.querySelector('aside[data-fx=column] [data-level-summary]')?.innerText || ''").replace("\n", " ")


def fx(pg):
    return pg.evaluate("window.__fx || []")


def live_classes(pg):
    """The goal-moment classes still on an element right now (they are taken off on animationend)."""
    return pg.evaluate("[...document.querySelectorAll('[class*=\"m-goal-\"]')].map((e) => e.className.split(' ').filter((c) => c.startsWith('m-goal-')).join(' ') + ' @' + (e.getAttribute('data-fx') || e.tagName))")


def sound_count(pg):
    return pg.evaluate("window.__h1tSoundCount || 0")
