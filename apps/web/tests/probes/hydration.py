import os
import sys
from playwright.sync_api import sync_playwright

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
        paths = ["/today", "/micros", "/add", "/entry/item-1", "/training"]
        for vp, path in [(v, p) for v in viewports for p in paths]:
            page.set_viewport_size(vp)
            console_errors.clear()
            console_issues.clear()

            page.goto(f"{BASE_URL}{path}", wait_until="networkidle")
            page.evaluate("""() => {
                sessionStorage.setItem('h1t_added_entries_v1', JSON.stringify([{
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
                sessionStorage.setItem('h1t_recent_foods_v2', JSON.stringify([{ foodId: 'food-hat-dieu', servingLabel: '30 g' }]));
            }""")
            page.reload(wait_until="networkidle")
            page.wait_for_timeout(1500)

            # The Next dev badge turns to "error" when the page has an Issue
            badge = page.evaluate("""() => { const o = []; document.querySelectorAll('nextjs-portal').forEach(h => { const b = h.shadowRoot && h.shadowRoot.querySelector('[data-next-badge]'); if (b) o.push(b.getAttribute('data-error')); }); return o; }""")
            if "true" in badge:
                console_issues.append("Next dev badge shows an Issue")
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

            # Assert seeded entry visible on /today and recent search chip visible on /add
            if path == "/today":
                try:
                    seeded = page.locator("text='Chà là hạt dẻ test' >> visible=true").first
                    seeded.wait_for(state="visible", timeout=5000)
                    print("[PASS] Seeded entry 'Chà là hạt dẻ test' is visible on /today")
                except Exception as e:
                    err = f"Seeded entry 'Chà là hạt dẻ test' not visible on /today after reload: {e}"
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
