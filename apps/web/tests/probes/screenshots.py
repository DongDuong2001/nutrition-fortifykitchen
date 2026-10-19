# PROBE_COVERS: app/(app)/micros/**
import os
import sys
from playwright.sync_api import sync_playwright
import _demo  # noqa: F401  (cc2-15b: demo mode on, see _demo.py)

BASE_URL = os.environ.get("ALIGN_BASE_URL", "http://localhost:3100")
SCREENSHOT_DIR = os.path.join(os.path.dirname(__file__), "..", "..", ".screenshots")

def main():
    os.makedirs(SCREENSHOT_DIR, exist_ok=True)
    print(f"=== Capturing screenshots against {BASE_URL} ===")

    with sync_playwright() as p:
        browser = p.chromium.launch()

        # 1. today-header-390.png (/diary at 390x844, shows "Hôm nay, <today>" + inset panel)
        page = browser.new_page(viewport={"width": 390, "height": 844})
        page.goto(f"{BASE_URL}/diary", wait_until="networkidle")
        page.wait_for_timeout(600)
        p1 = os.path.join(SCREENSHOT_DIR, "today-header-390.png")
        page.screenshot(path=p1)
        print(f"[SAVED] {p1}")

        # 2. micros-header-390.png (/micros at 390x844, top, not scrolled)
        page.goto(f"{BASE_URL}/micros", wait_until="networkidle")
        page.wait_for_timeout(600)
        p2 = os.path.join(SCREENSHOT_DIR, "micros-header-390.png")
        page.screenshot(path=p2)
        print(f"[SAVED] {p2}")

        # 3. micros-stuck-390.png (/micros at 390x844, scrolled down ~250px)
        page.evaluate("window.scrollTo(0, 250)")
        page.wait_for_timeout(300)
        p3 = os.path.join(SCREENSHOT_DIR, "micros-stuck-390.png")
        page.screenshot(path=p3)
        print(f"[SAVED] {p3}")

        # 4. today-header-1440.png (/diary at 1440x900)
        page_desk = browser.new_page(viewport={"width": 1440, "height": 900})
        page_desk.goto(f"{BASE_URL}/diary", wait_until="networkidle")
        page_desk.wait_for_timeout(600)
        p4 = os.path.join(SCREENSHOT_DIR, "today-header-1440.png")
        page_desk.screenshot(path=p4)
        print(f"[SAVED] {p4}")

        browser.close()

    print("All screenshots captured successfully.")

if __name__ == "__main__":
    main()
