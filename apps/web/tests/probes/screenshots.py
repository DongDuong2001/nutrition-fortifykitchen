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

        # 1. /today at 1440x900
        page1 = browser.new_page(viewport={"width": 1440, "height": 900})
        page1.goto(f"{BASE_URL}/today", wait_until="networkidle")
        page1.wait_for_timeout(600)
        today_path = os.path.join(SCREENSHOT_DIR, "today-desktop-1440.png")
        page1.screenshot(path=today_path)
        print(f"[SAVED] {today_path}")

        # 2. Add Chà là 30g and capture /micros at 390x844
        page2 = browser.new_page(viewport={"width": 390, "height": 844})
        page2.goto(f"{BASE_URL}/add?meal=snack", wait_until="networkidle")
        page2.wait_for_timeout(500)

        # Click Chà là button
        cha_la_btn = page2.locator("button:has-text('Chà là') >> visible=true").first
        cha_la_btn.wait_for(state="visible", timeout=5000)
        cha_la_btn.click()

        # Wait for portion panel
        page2.locator('[data-align-group="portion"]:visible').first.wait_for(timeout=5000)
        submit_btn = page2.locator('button[data-align-group="portion"]:visible').first
        submit_btn.click()

        # Wait for redirect to /today
        page2.wait_for_url("**/today", timeout=5000)
        page2.wait_for_timeout(500)

        # Navigate to /micros
        page2.goto(f"{BASE_URL}/micros", wait_until="networkidle")
        page2.wait_for_timeout(600)

        micros_path = os.path.join(SCREENSHOT_DIR, "micros-mobile-b6-increase-390.png")
        page2.screenshot(path=micros_path)
        print(f"[SAVED] {micros_path}")

        browser.close()

    print("Screenshots capture complete.")

if __name__ == "__main__":
    main()
