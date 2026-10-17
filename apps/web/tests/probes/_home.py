"""cc2-32: shared readers for Hôm nay ("/app" since cc-45), used by the probes that walked the old day screens.

Not a probe (run_all.py skips names that start with "_").
"""
import re

HERO = "section[aria-label='Tổng kcal và dinh dưỡng đa lượng']"
MEAL_NAME = {"breakfast": "Bữa sáng", "lunch": "Bữa trưa", "snack": "Bữa phụ", "dinner": "Bữa tối"}


def vis(pg, selector):
    return pg.locator(selector + " >> visible=true").first


def wait_home(pg):
    """The hero card is drawn only after the diary is read from storage."""
    vis(pg, HERO).wait_for(state="visible", timeout=8000)
    pg.wait_for_timeout(200)


def hero_kcal(pg):
    """The eaten kcal in the hero ("1.041"), or None."""
    m = re.search(r"([\d.]+)\s*/\s*[\d.]+–", vis(pg, HERO).inner_text())
    return m.group(1) if m else None


def is_past(pg):
    """A past day is the only day that has a next day: › is enabled."""
    return vis(pg, 'button[aria-label="Ngày sau"]').is_enabled()


def meal_text(pg, slot):
    """One meal on Hôm nay as one line: "Sáng 459 kcal Yến mạch 60 g ..."."""
    return re.sub(r"\s+", " ", vis(pg, f"section[aria-label='{MEAL_NAME[slot]}']").inner_text())
