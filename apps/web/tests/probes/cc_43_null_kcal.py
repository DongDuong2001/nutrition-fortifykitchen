"""cc-43: a day with unknown kcal on Hôm nay (390 and 1280). Run on a demo build; the accounts below turn demo off.

- every food unknown: the hero shows a dash for the kcal and for the percent, no Level text, and the note
  "{n} món chưa rõ kcal" (13 px, secondary) sits under the card
- some foods unknown: the total counts the known ones, the note counts the unknown ones
- no unknown food: no note
Screenshots: .screenshots/cc-43-null-kcal-*.png
Run with: ALIGN_BASE_URL=http://localhost:3101 npm run probe -- tests/probes/cc_43_null_kcal.py
"""
import datetime
import json
import os
import re
from pathlib import Path

from playwright.sync_api import sync_playwright
import _demo  # noqa: F401  (the account contexts below turn demo off)
from _home import HERO, wait_home

BASE = os.environ.get("ALIGN_BASE_URL", "http://localhost:3101")
SHOTS = Path(__file__).resolve().parent.parent.parent / ".screenshots"
SHOTS.mkdir(exist_ok=True)
SIZES = [("390", {"width": 390, "height": 844}), ("1280", {"width": 1280, "height": 800})]
EMAIL = "nullkcal@example.com"
problems = []


def check(cond, msg):
    print(("[PASS] " if cond else "[FAIL] ") + msg)
    if not cond:
        problems.append(msg)


def entry(entry_id, kcal):
    now = datetime.datetime.now(datetime.timezone.utc).isoformat()
    return {
        "id": entry_id, "foodId": "food-x", "foodName": f"Món {entry_id}", "grams": 100, "displayQty": "100 g",
        "mealSlot": "lunch", "calories": kcal, "protein": None, "carbs": None, "fat": None, "fiber": None,
        "nutrients": {}, "addedAt": now,
    }


def account_context(browser, size, entries):
    _demo.enable(False)
    ctx = browser.new_context(viewport=size)
    _demo.enable(True)
    profile = {"sex": "male", "birthYear": 2003, "weightKg": 65, "goal": "maintain", "periodMode": False,
               "trainingMinutesDefault": 60, "displayName": "", "hintSeen": True}
    store = {"current": EMAIL, "accounts": {EMAIL: {"hash": None, "providers": ["magic_link"]}}}
    ctx.add_init_script(
        "try {"
        f"localStorage.setItem('h1t_mock_auth_v1', {json.dumps(json.dumps(store))});"
        f"localStorage.setItem('h1t_profile_v1_{EMAIL}', {json.dumps(json.dumps(profile))});"
        f"localStorage.setItem('h1t_added_entries_v1_{EMAIL}', {json.dumps(json.dumps(entries))});"
        "} catch (e) {}"
    )
    return ctx


def hero_slots(pg):
    """The kcal, the target and the percent of the hero's second row."""
    return pg.evaluate(
        """() => {
          const hero = [...document.querySelectorAll("section[aria-label='Tổng kcal và dinh dưỡng đa lượng']")].find(e => e.getBoundingClientRect().width > 0);
          const row = hero.querySelectorAll('div[data-align-group="home-hero"]')[1];
          return [...row.querySelectorAll('span')].map(s => s.textContent.trim());
        }"""
    )


def note_info(pg):
    return pg.evaluate(
        """() => {
          const hero = [...document.querySelectorAll("section[aria-label='Tổng kcal và dinh dưỡng đa lượng']")].find(e => e.getBoundingClientRect().width > 0);
          const p = hero.nextElementSibling;
          if (!p || p.tagName !== 'P') return null;
          const cs = getComputedStyle(p);
          return { text: p.textContent.trim(), size: cs.fontSize, left: p.getBoundingClientRect().left, heroLeft: hero.getBoundingClientRect().left };
        }"""
    )


def scenario(browser, name, size_name, size, entries, kcal, pct, note):
    ctx = account_context(browser, size, entries)
    pg = ctx.new_page()
    pg.goto(BASE + "/app", wait_until="networkidle")
    wait_home(pg)
    slots = hero_slots(pg)
    where = f"{size_name} {name}"
    check(slots[0] == kcal, f"{where}: hero kcal is '{kcal}' (got {slots[0]!r})")
    check(slots[-1] == pct, f"{where}: hero percent is '{pct}' (got {slots[-1]!r})")
    info = note_info(pg)
    if note is None:
        check(info is None, f"{where}: no note under the hero ({info})")
    else:
        check(info is not None and info["text"] == note, f"{where}: note '{note}' ({info})")
        if info:
            check(info["size"] == "13px", f"{where}: note is 13 px ({info['size']})")
            check(abs(info["left"] - info["heroLeft"]) < 1.5, f"{where}: note shares the hero's left edge ({info['left']} vs {info['heroLeft']})")
    hero_text = re.sub(r"\s+", " ", pg.locator(HERO + " >> visible=true").first.inner_text())
    check("0%" not in hero_text.split("kcal")[-1][:12] or kcal != "—", f"{where}: an unknown total is never 0")
    pg.screenshot(path=str(SHOTS / f"cc-43-null-kcal-{name.replace(' ', '-')}-{size_name}.png"), animations="disabled")
    ctx.close()


def main():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        for size_name, size in SIZES:
            scenario(browser, "all unknown", size_name, size, [entry("a", None), entry("b", None)], "—", "—", "2 món chưa rõ kcal")
            scenario(browser, "one unknown", size_name, size, [entry("a", None), entry("b", 500)], "500", "26%", "1 món chưa rõ kcal")
            scenario(browser, "all known", size_name, size, [entry("a", 300), entry("b", 500)], "800", "41%", None)
        browser.close()
    print()
    print(f"{len(problems)} problem(s)")
    for m in problems:
        print("  - " + m)
    raise SystemExit(1 if problems else 0)


if __name__ == "__main__":
    main()
