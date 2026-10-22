"""feat/v3-redesign: screenshots of V3 screens at 390 (and 1440) for the side-by-side check against design/v3/renders.

Not a probe (run_all.py skips names that start with "_"). Demo mode, the sample day, the clock at 10:00 on 15/10.
  V3_SHOTS   comma list of name=/route (default: every screen below); a route may end in #<action> (see ACTIONS)
  V3_TAG     file suffix, e.g. "before" or "after" (default "after")
  V3_WIDTHS  comma list (default "390"); 1440 for screens with a desktop layout
  V3_FULL    "0" for the viewport only (default full page, the tab bar kept at the bottom)
Files: .screenshots/v3/<name>-<width>-<tag>.png
Run with: V3_SHOTS=HomNay=/app V3_TAG=after npm run probe -- tests/probes/_v3_shots.py
"""
# PROBE_COVERS:
import os
import sys
from pathlib import Path

import _demo  # noqa: F401
from playwright.sync_api import sync_playwright

BASE = os.environ.get("ALIGN_BASE_URL", "http://localhost:3101")
NOW = "2026-10-15T10:00:00+07:00"
OUT = Path(__file__).resolve().parent.parent.parent / ".screenshots" / "v3"
OUT.mkdir(parents=True, exist_ok=True)

SCREENS = {
    "HomNay": "/app",
    "KhamPha": "/explore",
    "Add": "/add",
    "TongQuan": "/trends",
    "TrendsEnergy": "/trends/energy",
    "TrendsMicros": "/trends/micros",
    "TrendsBody": "/trends/body",
    "Micros": "/micros",
    "NutrientDetail": "/micros/iron",
    "Rich": "/explore/rich/iron",
    "Category": "/explore/rau",
    "Meals": "/explore/meals",
    "FoodDetail": "/foods/food-com-gao-lut",
    "Compare": "/foods/compare?ids=food-com-gao-lut,food-yogurt-kefir",
    "CreateFood": "/foods/new",
    "Training": "/training",
    "CaiDat": "/settings",
    "Account": "/settings/account",
    "Profile": "/settings/profile",
    "Weight": "/settings/profile/weight",
    "Targets": "/settings/targets",
    "Macros": "/settings/targets/macros",
    "Language": "/settings/language",
    "Notifications": "/settings/notifications",
    "DataSources": "/settings/data-sources",
    "WhatsNew": "/settings/whats-new",
    "DeleteAccount": "/settings/delete-account",
    "SignIn": "/signin",
    "CheckEmail": "/signin/check-email",
    "Expired": "/signin/expired",
    "SetupProfile": "/setup/profile",
    "SetupGoal": "/setup/goal",
    "SetupDone": "/setup/done",
    "Offline": "/offline",
    "Install": "/install",
    "NotFound": "/khong-co-trang-nay",
}


def actions(pg, name):
    """Screens that need a tap before the shot (a sheet open, a row chosen)."""
    if name == "Portion":
        pg.locator("[role='option'], ul button").first.click()
        pg.wait_for_timeout(600)
    if name == "AddSearch":  # the + sheet with "gà" typed, as design/v3/renders/V3Add.png shows it (V3_SHOTS="AddSearch=/add")
        pg.locator("[data-add-panel] [data-testid=food-search]").first.fill("gà")
        pg.wait_for_timeout(800)
    if name == "EditEntry":  # a page of its own: V3_SHOTS="EditEntry=/entry/item-1" (no tap needed)
        pg.wait_for_selector("text=Chuyển sang bữa", timeout=8000)
        pg.wait_for_timeout(300)


    if name == "CreateFood":  # as design/v3/renders/V3CreateFood.png: Tự nhập, the kcal error shown, the micros open
        pg.get_by_role("button", name="Tự nhập", exact=True).click()
        pg.locator("#cf-name").fill("Bánh tráng trộn")
        pg.locator("#cf-kcal").focus()
        pg.locator("#cf-kcal").blur()
        pg.get_by_role("button", name="+ Thêm vi chất", exact=False).click()
        pg.wait_for_timeout(500)


def main():
    wanted = os.environ.get("V3_SHOTS")
    shots = dict(s.split("=", 1) for s in wanted.split(",")) if wanted else dict(SCREENS)
    tag = os.environ.get("V3_TAG", "after")
    widths = [int(w) for w in os.environ.get("V3_WIDTHS", "390").split(",")]
    full = os.environ.get("V3_FULL", "1") != "0"
    with sync_playwright() as p:
        browser = p.chromium.launch()
        for width in widths:
            ctx = browser.new_context(viewport={"width": width, "height": 844 if width < 1024 else 900})
            pg = ctx.new_page()
            pg.clock.set_fixed_time(NOW)
            for name, route in shots.items():
                try:
                    pg.goto(BASE + route, wait_until="networkidle")
                    pg.wait_for_timeout(900)
                    actions(pg, name)
                    if full:
                        h = pg.evaluate("document.documentElement.scrollHeight")
                        pg.set_viewport_size({"width": width, "height": max(844, min(h, 4000))})
                        pg.wait_for_timeout(250)
                    path = OUT / f"{name}-{width}-{tag}.png"
                    pg.screenshot(path=str(path))
                    pg.set_viewport_size({"width": width, "height": 844 if width < 1024 else 900})
                    print(f"{name} {width}: {path}")
                except Exception as e:  # one screen failing must not stop the rest
                    print(f"{name} {width}: FAILED {e}", file=sys.stderr)
            ctx.close()
        browser.close()


if __name__ == "__main__":
    main()
