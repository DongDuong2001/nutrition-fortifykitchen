"""feat/hero-macro-kcal (overnight 22→23/10, job 7): tapping a macro on the Hôm nay hero shows the kcal from it.

At 390 (demo build, the sample day): Đạm is a button (≥ 44 px, aria-pressed, aria-label "Đạm <x> g, <y> kcal"); a tap picks it (the
sky ring), the label reads "Đạm · <x> g", the big number is round(<x> × 4) and the percent line "<p>% tổng kcal"; a second tap clears
it; a tap on the card clears it too; a meal picked first gives that meal's protein kcal, and picking another meal clears the macro.
Screenshots: .screenshots/hero-macro-kcal-{day,protein,meal}.png.
Run with: ALIGN_BASE_URL=http://localhost:3101 npm run probe -- tests/probes/hero_macro_kcal.py
"""
# PROBE_COVERS: app/(app)/(tabs)/app/** components/home/home-hero.tsx components/home/home-screen.tsx lib/macro-kcal.ts
import os
import re
import sys
from pathlib import Path

import _demo  # noqa: F401
from playwright.sync_api import sync_playwright

BASE = os.environ.get("ALIGN_BASE_URL", "http://localhost:3101")
SHOTS = Path(__file__).resolve().parent.parent.parent / ".screenshots"
SHOTS.mkdir(exist_ok=True)
HERO = "section[aria-label='Tổng kcal và dinh dưỡng đa lượng']"
problems = []


def check(cond, msg):
    print(("[PASS] " if cond else "[FAIL] ") + msg)
    if not cond:
        problems.append(msg)


def num(text):
    digits = re.sub(r"[^0-9]", "", text)
    return int(digits) if digits else None


def run(browser):
    ctx = browser.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2, reduced_motion="reduce")
    pg = ctx.new_page()
    pg.goto(BASE + "/app", wait_until="networkidle")
    pg.wait_for_timeout(1000)
    hero = pg.locator(HERO).first
    big = hero.locator(".font-display").first
    day_kcal = num(big.inner_text())
    pg.screenshot(path=str(SHOTS / "hero-macro-kcal-day.png"))

    btn = hero.locator("button[data-hero-macro=protein]")
    check(btn.count() == 1, "Đạm is a button on the hero")
    box = btn.bounding_box()
    check(box is not None and box["height"] >= 44, f"Đạm is at least 44 px tall ({box})")
    aria = btn.get_attribute("aria-label") or ""
    m = re.match(r"Đạm ([\d.,]+) g, ([\d.]+) kcal", aria)
    check(m is not None, f"aria-label reads Đạm <x> g, <y> kcal ({aria!r})")
    check(btn.get_attribute("aria-pressed") == "false", "not pressed before the tap")
    btn.click()
    pg.wait_for_timeout(500)
    check(btn.get_attribute("aria-pressed") == "true", "a tap picks it (aria-pressed)")
    label = hero.locator("h2").inner_text()
    check(label.startswith("Đạm · ") and label.endswith(" g"), f"the mode label reads Đạm · <x> g ({label!r})")
    if m:
        grams = float(m.group(1).replace(".", "").replace(",", "."))
        kcal = num(big.inner_text())
        check(kcal == round(grams * 4), f"the big number is the protein kcal ({kcal} = round({grams} × 4))")
        check(kcal == num(m.group(2)), "…the same as the button says")
    check("tổng kcal" in hero.inner_text(), "the percent line says tổng kcal")
    ring = pg.evaluate("(el) => getComputedStyle(el).boxShadow", btn.element_handle())
    check(ring not in ("none", ""), f"the picked macro has the sky ring ({ring[:40]})")
    pg.screenshot(path=str(SHOTS / "hero-macro-kcal-protein.png"))
    btn.click()
    pg.wait_for_timeout(500)
    check(btn.get_attribute("aria-pressed") == "false" and num(big.inner_text()) == day_kcal, "a second tap clears it (the day's kcal again)")

    btn.click()
    pg.wait_for_timeout(400)
    hero.locator("h2").click()
    pg.wait_for_timeout(400)
    check(btn.get_attribute("aria-pressed") == "false", "a tap on the card clears it")

    # With a meal picked: that meal's protein kcal; another meal clears the macro
    pg.locator("[data-testid=meal-header]").first.click()
    pg.wait_for_timeout(500)
    btn.click()
    pg.wait_for_timeout(500)
    aria = btn.get_attribute("aria-label") or ""
    m2 = re.match(r"Đạm ([\d.,]+) g, ([\d.]+) kcal", aria)
    check(m2 is not None and num(big.inner_text()) == num(m2.group(2)), f"with a meal picked it shows that meal's protein kcal ({aria!r})")
    pg.screenshot(path=str(SHOTS / "hero-macro-kcal-meal.png"))
    pg.locator("[data-testid=meal-header]").nth(1).click()
    pg.wait_for_timeout(500)
    check(btn.get_attribute("aria-pressed") == "false", "picking another meal clears the macro")
    ctx.close()


with sync_playwright() as p:
    browser = p.chromium.launch()
    try:
        run(browser)
    finally:
        browser.close()

print(f"\n{len(problems)} problem(s)")
sys.exit(1 if problems else 0)
