import os
import sys
from pathlib import Path
from playwright.sync_api import sync_playwright
import _demo  # noqa: F401

BASE_URL = os.environ.get("ALIGN_BASE_URL", "http://localhost:3100")
SCREENSHOT_DIR = Path(__file__).resolve().parent.parent.parent / ".screenshots"

def main():
    SCREENSHOT_DIR.mkdir(parents=True, exist_ok=True)
    print(f"=== Testing Desktop Layout & Multi-Add against {BASE_URL} ===")

    with sync_playwright() as p:
        browser = p.chromium.launch()

        # 1. Test Desktop Homepage at 1440x900
        page = browser.new_page(viewport={"width": 1440, "height": 900})
        page.goto(f"{BASE_URL}/", wait_until="networkidle")
        page.wait_for_timeout(600)

        # Verify DesktopIntroBanner is visible
        intro = page.locator('section[aria-label="Giới thiệu về H1T MICRO"]')
        assert intro.is_visible(), "DesktopIntroBanner should be visible on desktop"
        print("[PASS] DesktopIntroBanner is visible on Desktop (1440x900)")

        shot_home = SCREENSHOT_DIR / "desktop-home-1440.png"
        page.screenshot(path=str(shot_home))
        print(f"[SAVED] {shot_home}")

        # 2. Test Desktop Sign In at 1440x900 (Split layout with marketing points)
        page.goto(f"{BASE_URL}/signin", wait_until="networkidle")
        page.wait_for_timeout(600)
        shot_signin = SCREENSHOT_DIR / "desktop-signin-1440.png"
        page.screenshot(path=str(shot_signin))
        print(f"[SAVED] {shot_signin}")

        # 3. Test Desktop Add Food with Multi-Add
        page.goto(f"{BASE_URL}/add?meal=lunch", wait_until="networkidle")
        page.wait_for_timeout(600)

        # Click the first food item in the list
        first_food = page.locator('button[data-food-row]').first
        if first_food.is_visible():
            first_food.click()
            page.wait_for_timeout(400)

            # Check that "Lưu & chọn tiếp" button is visible
            add_and_continue = page.locator('button:has-text("Lưu & chọn tiếp"):visible')
            assert add_and_continue.is_visible(), "'Lưu & chọn tiếp' button should be visible"
            print("[PASS] 'Lưu & chọn tiếp' button is visible")

            shot_portion = SCREENSHOT_DIR / "desktop-add-portion-1440.png"
            page.screenshot(path=str(shot_portion))
            print(f"[SAVED] {shot_portion}")

            # Click "Lưu & chọn tiếp" to test multi-add
            add_and_continue.click()
            page.wait_for_timeout(600)

            # Verify multi-add status banner appeared
            status_banner = page.locator('text=Đã thêm 1 món vào Bữa trưa').first
            assert status_banner.is_visible(), "Multi-add status banner should appear after adding"
            print("[PASS] Multi-add status banner displayed: 'Đã thêm 1 món vào Bữa trưa'")

            shot_multi = SCREENSHOT_DIR / "desktop-add-multi-1440.png"
            page.screenshot(path=str(shot_multi))
            print(f"[SAVED] {shot_multi}")

        # 4. Verify Mobile (390x844) remains clean and untouched
        page_mobile = browser.new_page(viewport={"width": 390, "height": 844})
        page_mobile.goto(f"{BASE_URL}/", wait_until="networkidle")
        page_mobile.wait_for_timeout(600)

        # Intro banner should NOT be visible on mobile
        intro_mobile = page_mobile.locator('section[aria-label="Giới thiệu về H1T MICRO"]')
        assert not intro_mobile.is_visible(), "DesktopIntroBanner must be hidden on mobile"
        print("[PASS] DesktopIntroBanner is hidden on Mobile (390x844)")

        shot_mobile = SCREENSHOT_DIR / "mobile-home-390.png"
        page_mobile.screenshot(path=str(shot_mobile))
        print(f"[SAVED] {shot_mobile}")

        browser.close()

    print("=== All visual and multi-add desktop checks passed! ===")

if __name__ == "__main__":
    main()
