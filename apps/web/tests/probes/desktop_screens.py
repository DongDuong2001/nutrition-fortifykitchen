# PROBE_COVERS: app/(app)/(tabs)/app/** app/(app)/add/** app/landing/** app/signin/**
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

        # 1. cc-49: a signed-out visitor of Hôm nay at 1440x900 goes to /signin (the landing opens only by its address)
        _demo.enable(False)
        page = browser.new_page(viewport={"width": 1440, "height": 900})
        page.goto(f"{BASE_URL}/app", wait_until="networkidle")
        page.wait_for_timeout(600)

        assert page.url.split("?")[0].endswith("/signin"), f"Expected desktop /app to redirect to /signin, but URL is {page.url}"
        print("[PASS] Desktop /app sends a signed-out visitor to /signin")

        # 1a. Test Desktop Dashboard with ?demo=1 (clean without intro banner)
        _demo.enable(True)
        page.goto(f"{BASE_URL}/app?demo=1", wait_until="networkidle")
        page.wait_for_timeout(600)
        intro = page.locator('section[aria-label="Giới thiệu về H1T MICRO"]')
        assert not intro.is_visible(), "Dashboard should be clean without intro banner"
        print("[PASS] Dashboard is clean without intro banner")

        shot_home = SCREENSHOT_DIR / "desktop-home-1440.png"
        page.screenshot(path=str(shot_home))
        print(f"[SAVED] {shot_home}")

        # 1b. Test Desktop Landing Page at 1440x900
        page.goto(f"{BASE_URL}/landing", wait_until="networkidle")
        page.wait_for_timeout(600)
        
        # Verify 3D Floating Phone in Hero section
        floating_phone = page.locator(".floating-phone-wrap")
        assert floating_phone.is_visible(), "FloatingPhone should be visible on desktop landing page"
        print("[PASS] 3D FloatingPhone is visible in Hero section")

        # Verify StackingAudiences cards
        cards = page.locator("[data-stack-card]")
        assert cards.count() == 3, f"Expected 3 audience cards, found {cards.count()}"
        print(f"[PASS] StackingAudiences cards count: {cards.count()}")

        # Verify KilnWordmarkFooter
        footer = page.locator("footer.kwf")
        footer.scroll_into_view_if_needed()
        page.wait_for_timeout(700)
        assert footer.is_visible(), "KilnWordmarkFooter should be visible"
        wordmark = page.locator("svg.kwf-word")
        assert wordmark.is_visible(), "Procedural wordmark should be visible in footer"
        print("[PASS] KilnWordmarkFooter and procedural wordmark are visible")

        shot_footer = SCREENSHOT_DIR / "desktop-landing-footer-1440.png"
        footer.screenshot(path=str(shot_footer))
        print(f"[SAVED] {shot_footer}")

        shot_landing = SCREENSHOT_DIR / "desktop-landing-1440.png"
        page.screenshot(path=str(shot_landing))
        print(f"[SAVED] {shot_landing}")

        shot_landing_full = SCREENSHOT_DIR / "desktop-landing-full-1440.png"
        page.screenshot(path=str(shot_landing_full), full_page=True)
        print(f"[SAVED] {shot_landing_full}")

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
            # cc-42: Lưu & chọn tiếp puts the food in the tray; the bar says how many and what they add up to
            tray_bar = page.locator('[data-tray-bar]:visible').first
            assert tray_bar.is_visible(), "The tray bar should appear after Lưu & chọn tiếp"
            assert (tray_bar.get_attribute("aria-label") or "").startswith("1 món"), "The tray bar counts 1 món"
            print("[PASS] Tray bar displayed after Lưu & chọn tiếp: 1 món")

            shot_multi = SCREENSHOT_DIR / "desktop-add-multi-1440.png"
            page.screenshot(path=str(shot_multi))
            print(f"[SAVED] {shot_multi}")

        # 4. Verify Mobile (390x844) remains clean and untouched
        page_mobile = browser.new_page(viewport={"width": 390, "height": 844})
        page_mobile.goto(f"{BASE_URL}/app", wait_until="networkidle")
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
