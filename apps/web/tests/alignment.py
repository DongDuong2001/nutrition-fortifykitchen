import os
import sys
from playwright.sync_api import sync_playwright

BASE_URL = os.environ.get("ALIGN_BASE_URL", "http://localhost:3100")
VIEWPORTS = [
    {"name": "mobile (390px)", "width": 390, "height": 844},
    {"name": "desktop (1440px)", "width": 1440, "height": 900},
]

def check_align_groups(page, group_name=None):
    return page.evaluate("""(targetGroup) => {
        const elements = Array.from(document.querySelectorAll('[data-align-group]'));
        const groups = {};

        for (const el of elements) {
            // Must be visible
            const rect = el.getBoundingClientRect();
            if (rect.width === 0 || rect.height === 0) continue;
            const style = window.getComputedStyle(el);
            if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') continue;

            const name = el.getAttribute('data-align-group');
            if (!name) continue;
            if (targetGroup && name !== targetGroup) continue;
            if (!groups[name]) groups[name] = [];
            groups[name].push(el);
        }

        const errors = [];
        const checkedGroups = {};

        for (const [name, list] of Object.entries(groups)) {
            if (list.length < 2) continue;

            // Group by card/section/container
            const buckets = new Map();
            for (const el of list) {
                // Find logical container (section, card container, main, or portion panel container)
                const container = el.closest('[data-align-container], section, main') || el.parentElement;
                const bucket = buckets.get(container) || [];
                bucket.push(el);
                buckets.set(container, bucket);
            }

            for (const bucket of buckets.values()) {
                if (bucket.length < 2) continue;
                const firstRect = bucket[0].getBoundingClientRect();
                checkedGroups[name] = (checkedGroups[name] || 0) + bucket.length;

                for (let i = 1; i < bucket.length; i++) {
                    const item = bucket[i];
                    const rect = item.getBoundingClientRect();
                    const leftDiff = Math.abs(firstRect.left - rect.left);
                    const rightDiff = Math.abs(firstRect.right - rect.right);

                    const isContentGroup =
                        item.getAttribute("data-align-edge") === "left" ||
                        bucket[0].getAttribute("data-align-edge") === "left";
                    const checkLeft = true;
                    const checkRight = !isContentGroup;

                    if (checkLeft && leftDiff > 1.05) {
                        errors.push(
                            `Group "${name}" left mismatch: diff ${leftDiff.toFixed(2)}px between <${bucket[0].tagName.toLowerCase()} class="${bucket[0].className}"> (${firstRect.left.toFixed(1)}) and <${item.tagName.toLowerCase()} class="${item.className}"> (${rect.left.toFixed(1)})`
                        );
                    }
                    if (checkRight && rightDiff > 1.05) {
                        errors.push(
                            `Group "${name}" right mismatch: diff ${rightDiff.toFixed(2)}px between <${bucket[0].tagName.toLowerCase()} class="${bucket[0].className}"> (${firstRect.right.toFixed(1)}) and <${item.tagName.toLowerCase()} class="${item.className}"> (${rect.right.toFixed(1)})`
                        );
                    }
                }
            }
        }

        return { errors, checkedGroups };
    }""", group_name)

def main():
    total_errors = []
    print("=== Starting Alignment and Hydration Tests ===")

    with sync_playwright() as p:
        browser = p.chromium.launch()
        context = browser.new_context()
        page = context.new_page()

        # 1. Alignment checks
        for vp in VIEWPORTS:
            page.set_viewport_size({"width": vp["width"], "height": vp["height"]})

            # /today
            page.goto(f"{BASE_URL}/today", wait_until="networkidle")
            page.wait_for_timeout(500)
            res = check_align_groups(page)
            if res["errors"]:
                print(f"[FAIL] /today @ {vp['name']}: {res['errors']}")
                total_errors.extend(res["errors"])
            else:
                print(f"[PASS] /today @ {vp['name']} (checked groups: {res['checkedGroups']})")

            # /micros
            page.goto(f"{BASE_URL}/micros", wait_until="networkidle")
            page.wait_for_timeout(500)
            res = check_align_groups(page, "micros-card")
            if res["errors"]:
                print(f"[FAIL] /micros @ {vp['name']}: {res['errors']}")
                total_errors.extend(res["errors"])
            else:
                print(f"[PASS] /micros @ {vp['name']} (checked groups: {res['checkedGroups']})")

            # /add?meal=snack (select Chà là)
            page.goto(f"{BASE_URL}/add?meal=snack", wait_until="networkidle")
            page.wait_for_timeout(500)
            try:
                date_btn = page.locator("button:has-text('Chà là') >> visible=true").first
                if date_btn.is_visible():
                    date_btn.click()
            except Exception:
                pass
            page.locator('[data-align-group="portion"]:visible').first.wait_for(timeout=5000)
            res = check_align_groups(page, "portion")
            if res["errors"]:
                print(f"[FAIL] /add @ {vp['name']}: {res['errors']}")
                total_errors.extend(res["errors"])
            else:
                print(f"[PASS] /add @ {vp['name']} (checked groups: {res['checkedGroups']})")

            # /foods/food-cha-la
            page.goto(f"{BASE_URL}/foods/food-cha-la", wait_until="networkidle")
            page.wait_for_timeout(500)
            res = check_align_groups(page, "food-detail")
            if res["errors"]:
                print(f"[FAIL] /foods/food-cha-la @ {vp['name']}: {res['errors']}")
                total_errors.extend(res["errors"])
            else:
                print(f"[PASS] /foods/food-cha-la @ {vp['name']} (checked groups: {res['checkedGroups']})")

        browser.close()

    if total_errors:
        print(f"\nTotal alignment failures: {len(total_errors)}")
        sys.exit(1)
    else:
        print("\nAll alignment checks passed cleanly (<= 1px difference)!")
        sys.exit(0)

if __name__ == "__main__":
    main()
