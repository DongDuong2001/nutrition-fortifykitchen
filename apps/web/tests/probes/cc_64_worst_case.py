"""cc-64 (break-ui): the worst cases on Hôm nay, + Thêm, Tổng quan and Cài đặt, at 390 and 320 px, with the text at 125 %,
and offline.

The worst-case data set is written into the demo account's storage by this probe only (demo build), so it can never
reach a live account: names that start with Ắ, Ổ and Ế, a 90-character name, a meal of 40 foods, a food with no known
kcal, one of 0 g, one of 100.000 g, one of 99.999 kcal, a vitamin B12 amount at about 20.833 % of its target, and a
display name that starts with an emoji followed by 40 letters with no space.
Fails on: text drawn past its card or panel (scroll areas and invisible 44 px hit areas excepted), any
"NaN" or "Infinity" on screen, and "0 kcal" on the row of the food whose kcal is unknown.
Screenshots: .screenshots/cc-64/worst-<screen>-<width>.png
Run with: ALIGN_BASE_URL=http://localhost:3101 npm run probe -- tests/probes/cc_64_worst_case.py
"""
# PROBE_COVERS: app/(app)/(tabs)/app/** app/(app)/add/** app/(app)/(tabs)/trends/** app/(app)/(tabs)/settings/**
import json
import os
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

from playwright.sync_api import sync_playwright
import _demo  # noqa: F401
import _seed  # noqa: F401

BASE = os.environ.get("ALIGN_BASE_URL", "http://localhost:3101")
SHOTS = Path(__file__).resolve().parent.parent.parent / ".screenshots" / "cc-64"
SHOTS.mkdir(parents=True, exist_ok=True)
NOW = datetime(2026, 10, 20, 10, 0, tzinfo=timezone(timedelta(hours=7)))
ADDED_AT = "2026-10-20T02:00:00.000Z"
SETTINGS_KEY = "h1t_settings_v1_demo"
problems = []


def check(cond, msg):
    print(("[PASS] " if cond else "[FAIL] ") + msg)
    if not cond:
        problems.append(msg)


def entry(i, name, grams, kcal, slot="lunch", nutrients=None):
    n = {"energy": kcal, "protein": 5, "carbs": 10, "fat": 2, "fiber": 1}
    n.update(nutrients or {})
    return {
        "id": f"worst-{i}", "foodId": f"worst-food-{i}", "foodName": name, "grams": grams, "displayQty": f"{grams} g",
        "mealSlot": slot, "calories": kcal, "protein": 5, "carbs": 10, "fat": 2, "fiber": 1, "nutrients": n, "addedAt": ADDED_AT,
    }


UNKNOWN = "Ổi ruột đỏ xay không đường loại đặc biệt"
ENTRIES = [
    entry(1, "Ắc quy năng lượng: bánh yến mạch nướng mật ong hạnh nhân", 60, 228, "breakfast"),
    entry(2, UNKNOWN, 200, None, "breakfast"),
    entry(3, "Ếch đồng chiên giòn sốt me chua ngọt kiểu miền Tây Nam Bộ thêm rau răm và đậu phộng rang", 150, 320, "lunch"),
    entry(4, "Nước lọc", 0, 0, "lunch"),
    entry(5, "Cơm trắng nồi đất", 100000, 130000, "lunch"),
    entry(6, "Bánh kem bơ siêu to", 500, 99999, "dinner"),
    entry(7, "Viên uống B12", 1, 0, "dinner", {"b12": 500}),
] + [entry(100 + i, f"Món ăn vặt số {i}", 10 + i, 20 + i, "snack") for i in range(40)]
PROFILE = {"sex": "male", "birthYear": 2003, "weightKg": 65, "goal": "maintain", "periodMode": False, "trainingMinutesDefault": 60,
           "displayName": "🦄" + "Nguyễn" * 7, "hintSeen": True}
SEED = (
    f"localStorage.setItem('h1t_added_entries_v1_demo', {json.dumps(json.dumps(ENTRIES))});"
    f"localStorage.setItem('h1t_profile_v1_demo', {json.dumps(json.dumps(PROFILE))});"
    f"localStorage.setItem('{SETTINGS_KEY}', {json.dumps(json.dumps({'installPrompt': {'dismissCount': 0, 'snoozeUntil': 0, 'done': True, 'firstSeenIso': '2026-01-01'}}))});"
    "document.addEventListener('DOMContentLoaded', () => { document.documentElement.style.fontSize = '125%'; });"
)

OVERFLOW = """() => {
  // Text that is drawn past its card or panel (a 44 px hit area reaching past the edge is invisible and does not count)
  const bad = [];
  for (const el of document.querySelectorAll('section, article, [data-align-group], .rounded-card, [role=dialog]')) {
    const s = getComputedStyle(el);
    if (['auto', 'scroll'].includes(s.overflowX) || s.display === 'none' || el.closest('[data-food-scroll], [aria-roledescription=carousel]')) continue;
    const box = el.getBoundingClientRect();
    if (box.width === 0) continue;
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    for (let t = walker.nextNode(); t; t = walker.nextNode()) {
      if (!t.textContent.trim()) continue;
      const host = t.parentElement;
      if (host.closest('[aria-hidden=true], .sr-only')) continue;
      // Inside a scroller or a clipping box (between the text and the card) the text is scrolled or cut on purpose
      let scrolled = false;
      for (let a = host; a && a !== el; a = a.parentElement) if (['auto', 'scroll', 'hidden', 'clip'].includes(getComputedStyle(a).overflowX)) scrolled = true;
      if (scrolled) continue;
      const range = document.createRange();
      range.selectNodeContents(t);
      for (const r of range.getClientRects()) {
        if (r.width && (r.right > box.right + 1 || r.left < box.left - 1)) {
          bad.push(`${el.tagName.toLowerCase()} "${t.textContent.trim().slice(0, 24)}" (${Math.round(r.left)}–${Math.round(r.right)} outside ${Math.round(box.left)}–${Math.round(box.right)})`);
          break;
        }
      }
      if (bad.length > 8) return bad;
    }
  }
  return bad.slice(0, 8);
}"""


def run(browser, width, offline=False):
    ctx = browser.new_context(viewport={"width": width, "height": 800}, is_mobile=True, has_touch=True)
    ctx.add_init_script("try { if (!sessionStorage.getItem('worst-seeded')) { " + SEED + " sessionStorage.setItem('worst-seeded', '1'); } else { document.addEventListener('DOMContentLoaded', () => { document.documentElement.style.fontSize = '125%'; }); } } catch (e) {}")
    pg = ctx.new_page()
    pg.clock.set_fixed_time(NOW)
    tag = f"{width}{'-offline' if offline else ''}"
    for name, route in [("home", "/app"), ("add", "/add?meal=snack"), ("overview", "/trends"), ("settings", "/settings")]:
        pg.goto(BASE + route, wait_until="networkidle")
        if offline and name == "home":
            ctx.set_offline(True)
        pg.wait_for_timeout(900)
        body = pg.locator("body").inner_text()
        check("NaN" not in body and "Infinity" not in body, f"{name} @{tag}: no NaN or Infinity")
        bad = pg.evaluate(OVERFLOW)
        check(not bad, f"{name} @{tag}: nothing wider than its box ({bad})")
        if name == "home":
            row = pg.locator("[data-entry-id]").filter(has_text=UNKNOWN[:12]).first
            if row.count():
                check("0 kcal" not in row.inner_text(), f"home @{tag}: the food with unknown kcal does not read 0 kcal ({row.inner_text()[:60]!r})")
            else:
                check(False, f"home @{tag}: the food with unknown kcal is listed")
        pg.screenshot(path=str(SHOTS / f"worst-{name}-{tag}.png"), full_page=True)
    ctx.close()


def main():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        run(browser, 390)
        run(browser, 320)
        run(browser, 390, offline=True)
        browser.close()
    print(f"\n{len(problems)} problem(s)")
    sys.exit(1 if problems else 0)


if __name__ == "__main__":
    main()
