import os
import sys
from playwright.sync_api import sync_playwright

BASE_URL = os.environ.get("ALIGN_BASE_URL", "http://localhost:3100")
SCREENSHOT_DIR = os.path.join(os.path.dirname(__file__), "..", "..", ".screenshots")

def main():
    os.makedirs(SCREENSHOT_DIR, exist_ok=True)
    print(f"=== Capturing screenshots against {BASE_URL} ===")

    with sync_playwright() as p:
        browser = p.chromium.launch()

        # 1. today-header-390.png (/today at 390x844)
        page = browser.new_page(viewport={"width": 390, "height": 844})
        page.goto(f"{BASE_URL}/today", wait_until="networkidle")
        page.wait_for_timeout(600)
        p1 = os.path.join(SCREENSHOT_DIR, "today-header-390.png")
        page.screenshot(path=p1)
        print(f"[SAVED] {p1}")

        # 2. micros-header-390.png (/micros at 390x844, scrolled down ~250px)
        page.goto(f"{BASE_URL}/micros", wait_until="networkidle")
        page.wait_for_timeout(600)
        page.evaluate("window.scrollTo(0, 250)")
        page.wait_for_timeout(300)
        p2 = os.path.join(SCREENSHOT_DIR, "micros-header-390.png")
        page.screenshot(path=p2)
        print(f"[SAVED] {p2}")

        # 3. today-header-1440.png (/today at 1440x900)
        page_desk = browser.new_page(viewport={"width": 1440, "height": 900})
        page_desk.goto(f"{BASE_URL}/today", wait_until="networkidle")
        page_desk.wait_for_timeout(600)
        p3 = os.path.join(SCREENSHOT_DIR, "today-header-1440.png")
        page_desk.screenshot(path=p3)
        print(f"[SAVED] {p3}")

        # 4. micros-nutrient-sub-390.png (/micros/b1 at 390x844)
        page.goto(f"{BASE_URL}/micros/b1", wait_until="networkidle")
        page.wait_for_timeout(600)
        p4 = os.path.join(SCREENSHOT_DIR, "micros-nutrient-sub-390.png")
        page.screenshot(path=p4)
        print(f"[SAVED] {p4}")

        # 5. dev-ui-headers-1440.png (/dev/ui at 1440x900)
        page_desk.goto(f"{BASE_URL}/dev/ui", wait_until="networkidle")
        page_desk.wait_for_timeout(600)
        p5 = os.path.join(SCREENSHOT_DIR, "dev-ui-headers-1440.png")
        page_desk.screenshot(path=p5)
        print(f"[SAVED] {p5}")

        browser.close()

    print("All screenshots captured successfully.")

if __name__ == "__main__":
    main()
