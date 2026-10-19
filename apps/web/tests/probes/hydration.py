# PROBE_COVERS: app/(app)/(dashboard)/training/** app/(app)/(tabs)/app/** app/(app)/(tabs)/explore/** app/(app)/(tabs)/settings/** app/(app)/(tabs)/trends/** app/(app)/(tabs)/trends/body/** app/(app)/(tabs)/trends/micros/** app/(app)/add/** app/(app)/entry/[id]/** app/(app)/micros/** app/(app)/settings/delete-account/** app/(app)/settings/language/** app/(app)/settings/notifications/** app/(app)/settings/profile/** app/(app)/settings/profile/weight/** app/(app)/settings/whats-new/** app/install/** app/landing/** app/page.tsx app/paywall/**
# PROBE_TAGS: smoke
import os
import sys
from playwright.sync_api import sync_playwright
import _demo  # noqa: F401  (cc2-15b: demo mode on, see _demo.py)

BASE_URL = os.environ.get("ALIGN_BASE_URL", "http://localhost:3100")

def main():
    print(f"=== Running Hydration Reload Check against {BASE_URL} ===")
    total_errors = []

    with sync_playwright() as p:
        browser = p.chromium.launch()
        context = browser.new_context()
        page = context.new_page()

        # React and Next report problems as console errors and warnings. The browser's own
        # font-preload hint is not one of them.
        console_errors = []
        console_issues = []
        def on_console(msg):
            if msg.type == "error":
                console_errors.append(msg.text)
            if msg.type in ("error", "warning") and "preloaded using link preload" not in msg.text:
                console_issues.append(f"{msg.type}: {msg.text[:300]}")
        page.on("console", on_console)
        page.on("pageerror", lambda err: (console_errors.append(err.message), console_issues.append(f"pageerror: {err.message[:300]}")))

        viewports = [{"width": 390, "height": 844}, {"width": 1440, "height": 900}]
        paths = [
            "/", "/app", "/explore", "/settings", "/micros", "/trends", "/trends/micros", "/trends/body", "/add", "/entry/item-1", "/training", "/settings/profile", "/settings/profile/weight",
            "/settings/language", "/settings/whats-new", "/settings/notifications", "/settings/delete-account",
            "/install", "/paywall", "/this-page-does-not-exist",  # last one: the 404 page
        ]
        for vp, path in [(v, p) for v in viewports for p in paths]:
            page.set_viewport_size(vp)
            console_errors.clear()
            console_issues.clear()

            page.goto(f"{BASE_URL}{path}", wait_until="networkidle")
            page.evaluate("""() => {
                // cc2-15c: the diary is in localStorage, and demo mode (on for every probe page) has its own _demo keys
                localStorage.setItem('h1t_added_entries_v1_demo', JSON.stringify([{
                    id: 'test-entry-1',
                    foodId: 'food-cha-la',
                    foodName: 'Chà là hạt dẻ test',
                    grams: 30,
                    mealSlot: 'snack',
                    displayQty: '30 g',
                    calories: 85,
                    carbs: 22.5,
                    protein: 0.7,
                    fat: 0.1,
                    fiber: 2.0,
                    nutrients: { energy: 85, carbs: 22.5, protein: 0.7, fat: 0.1, potassium: 195, fiber: 2.0 },
                    addedAt: new Date().toISOString()
                }]));
                localStorage.setItem('h1t_recent_foods_v2_demo', JSON.stringify([{ foodId: 'food-hat-dieu', servingLabel: '30 g' }]));
            }""")
            page.reload(wait_until="networkidle")
            page.wait_for_timeout(1500)

            # cc-07: tapping each Micros group chip scrolls only the list, never the header or page
            if path == "/micros" and vp["width"] == 390:
                chips = page.locator('[data-align-container="micros-page"] button[aria-pressed]')
                for i in range(chips.count()):
                    chips.nth(i).click()
                    page.wait_for_timeout(400)
                # cc-27c: the full header scrolls inside the list (a compact bar replaces it), so only the wrapper and the window must stay still
                moved = page.evaluate("""() => { const w = document.querySelector('[data-align-container="micros-page"]'); return [w.scrollTop, window.scrollY, 0]; }""")
                if moved[0] or moved[1]:
                    err = f"Tapping group chips moved the page (wrapper {moved[0]}, window {moved[1]}, header top {moved[2]})"
                    print(f"[FAIL] {err}")
                    total_errors.append(err)
                else:
                    print("[PASS] Tapping every Micros group chip keeps the header and page in place @ 390")

            # The Next dev badge turns to "error" when the page has an Issue
            badge = page.evaluate("""() => { const o = []; document.querySelectorAll('nextjs-portal').forEach(h => { const b = h.shadowRoot && h.shadowRoot.querySelector('[data-next-badge]'); if (b) o.push(b.getAttribute('data-error')); }); return o; }""")
            if "true" in badge:
                console_issues.append("Next dev badge shows an Issue")
            # The 404 page logs its failed request by design; other console errors on it still fail
            if path.startswith("/this-page-does-not-exist"):
                console_issues[:] = [m for m in console_issues if "status of 404" not in m]
            if console_issues:
                print(f"[FAIL] Console problems on {path} @ {vp['width']}: {console_issues}")
                total_errors.extend(console_issues)
            else:
                print(f"[PASS] No console warnings or Next Issue on {path} @ {vp['width']}")

            hydration_errs = [e for e in console_errors if "hydration" in e.lower()]
            if hydration_errs:
                print(f"[FAIL] Hydration error on {path}: {hydration_errs}")
                total_errors.extend(hydration_errs)
            else:
                print(f"[PASS] 0 hydration errors on {path} with sessionStorage loaded")

            # Assert seeded entry visible on /diary (when not on /landing) and recent search chip visible on /add
            if path == "/app" and not page.url.endswith("/landing"):
                try:
                    seeded = page.locator("text='Chà là hạt dẻ test' >> visible=true").first
                    seeded.wait_for(state="visible", timeout=5000)
                    print("[PASS] Seeded entry 'Chà là hạt dẻ test' is visible on /diary")
                except Exception as e:
                    err = f"Seeded entry 'Chà là hạt dẻ test' not visible on /diary after reload: {e}"
                    print(f"[FAIL] {err}")
                    total_errors.append(err)
            elif path == "/add":
                try:
                    chip = page.locator("button:has-text('Hạt điều rang') >> visible=true").first
                    chip.wait_for(state="visible", timeout=5000)
                    print("[PASS] Recent food chip 'Hạt điều rang' is visible on /add")
                except Exception as e:
                    err = f"Recent food chip 'Hạt điều rang' not visible on /add after reload: {e}"
                    print(f"[FAIL] {err}")
                    total_errors.append(err)

        browser.close()

    if total_errors:
        print(f"\nTotal failures: {len(total_errors)}")
        sys.exit(1)
    else:
        print("\nAll hydration checks passed cleanly (0 hydration errors, sessionStorage entries rendered)!")
        sys.exit(0)

if __name__ == "__main__":
    main()
