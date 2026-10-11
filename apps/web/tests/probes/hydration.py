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

        console_errors = []
        page.on("console", lambda msg: console_errors.append(msg.text) if msg.type == "error" else None)
        page.on("pageerror", lambda err: console_errors.append(err.message))

        for path in ["/today", "/add"]:
            console_errors.clear()

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
            page.wait_for_timeout(500)

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
