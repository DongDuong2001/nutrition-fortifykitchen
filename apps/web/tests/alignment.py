import datetime
import os
import sys
from playwright.sync_api import sync_playwright

# cc2-15b: these checks read the sample day and history, so demo mode is on for every page (probes/_demo.py)
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "probes"))
import _demo  # noqa: E402,F401

BASE_URL = os.environ.get("ALIGN_BASE_URL", "http://localhost:3100")
# Yesterday in Asia/Ho_Chi_Minh, the app's day: the one past day with logged meals
YESTERDAY = (datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=7))).date() - datetime.timedelta(days=1)).isoformat()
VIEWPORTS = [
    {"name": "mobile (390px)", "width": 390, "height": 844},
    {"name": "desktop (1440px)", "width": 1440, "height": 900},
]

# (route, viewport, group, edges). Pairs must be compared, or the check fails.
#   setup-row sits side by side on desktop, so it shares top and bottom edges, not left and right.
#   Phone stacks those fields, so setup-row is not checked there.
#   add-list: search, filter row, first header and first row share left edges only.
ONBOARDING_CHECKS = [
    ("/setup/goal", "mobile (390px)", "daily-targets", "lr"),
    ("/setup/goal", "desktop (1440px)", "daily-targets", "lr"),
    ("/setup/profile", "desktop (1440px)", "setup-row", "tb"),
    ("/add?meal=snack", "mobile (390px)", "add-list", "lr"),
    ("/add?meal=snack", "desktop (1440px)", "add-list", "lr"),
    ("/micros", "mobile (390px)", "micros-header", "lr"),
    ("/micros", "desktop (1440px)", "micros-header", "lr"),
    ("/", "mobile (390px)", "link-rows", "lr"),  # cc-45: the coach link page's two rows
    ("/", "desktop (1440px)", "link-rows", "lr"),
    ("/app", "mobile (390px)", "home-hero", "lr"),
    ("/app", "desktop (1440px)", "home-hero", "lr"),
    ("/app", "desktop (1440px)", "home-page", "lr"),  # cc-44: the h1 row and the body share one container
    ("/app", "mobile (390px)", "home-nutrient", "lr"),
    ("/app", "desktop (1440px)", "home-nutrient", "lr"),
    ("/trends", "mobile (390px)", "overview-rows", "lr"),
    ("/trends", "desktop (1440px)", "overview-rows", "lr"),
    ("/trends/micros", "mobile (390px)", "overview-micro", "lr"),
    ("/trends/micros", "desktop (1440px)", "overview-micro", "lr"),
    ("/trends/body", "mobile (390px)", "overview-stats", "lr"),
    ("/trends/body", "desktop (1440px)", "overview-stats", "lr"),
    ("/micros/calcium", "mobile (390px)", "nutrient-header", "lr"),
    ("/micros/calcium", "desktop (1440px)", "nutrient-header", "lr"),
    ("/micros/calcium", "mobile (390px)", "nutrient-card", "lr"),
    ("/micros/calcium", "desktop (1440px)", "nutrient-card", "lr"),
    ("/entry/item-1", "mobile (390px)", "entry", "lr"),
    ("/entry/item-1", "desktop (1440px)", "entry", "lr"),
    ("/explore", "mobile (390px)", "add-list", "lr"),
    ("/explore", "desktop (1440px)", "add-list", "lr"),
    ("/settings/profile", "mobile (390px)", "profile-header", "lr"),
    ("/settings/profile", "mobile (390px)", "profile-row", "lr"),
    ("/settings/profile", "desktop (1440px)", "profile-row", "lr"),
    ("/settings/profile/weight", "mobile (390px)", "weight-header", "lr"),
    ("/settings/profile/weight", "mobile (390px)", "weight-row", "lr"),
    ("/settings/profile/weight", "desktop (1440px)", "weight-row", "lr"),
    ("/settings/account", "mobile (390px)", "account-row", "lr"),
    ("/settings/account", "desktop (1440px)", "account-row", "lr"),
]

# cc-24: Dong's screens. (route, group, minimum pairs): the rows and cards of one list share left and right edges.
DONG_SCREEN_CHECKS = [
    ("/explore/leaderboard", "leaderboard-row", 1),
    ("/explore/coaches", "coach-card", 2),
    ("/admin/review?as=admin", "admin-card", 1),
    # cc-28d: the coach's client rows (four mock clients)
    ("/coach?as=coach", "client-row", 3),
]

# cc-23: compare foods, 3 columns. Each column's header and its value cells share left and right edges.
# cc-27f: rows where no column has data are not drawn: 5 macros + 3 vitamins + 8 minerals = 16 rows, 16 pairs.
COMPARE_ROUTE = "/foods/compare?ids=food-cha-la,food-yen-mach,food-chuoi"
COMPARE_CHECKS = [("compare-col-0", 16), ("compare-col-1", 16), ("compare-col-2", 16)]


def check_align_groups(page, group_name=None, edges="lr"):
    # edges "lr": members share left and right edges. "tb": members share top and bottom edges.
    return page.evaluate("""(args) => {
        const [targetGroup, mode] = args;
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
            // cc-44: data-align-from="lg" members are checked from 1024 px only (the phone layout differs on purpose)
            if (el.getAttribute('data-align-from') === 'lg' && window.innerWidth < 1024) continue;
            if (targetGroup && name !== targetGroup) continue;
            if (!groups[name]) groups[name] = [];
            groups[name].push(el);
        }

        const errors = [];
        const checkedGroups = {};
        const pairs = {};

        for (const [name, list] of Object.entries(groups)) {
            if (list.length < 2) continue;

            // Group by card/section/container
            const buckets = new Map();
            for (const el of list) {
                // Find logical container (section, card container, main, or portion panel container)
                const container = name.endsWith("-header")
                    ? (el.closest('[data-align-container]') || document.body)
                    : (el.closest('[data-align-container], section, main') || el.parentElement);
                const bucket = buckets.get(container) || [];
                bucket.push(el);
                buckets.set(container, bucket);
            }

            for (const bucket of buckets.values()) {
                if (bucket.length < 2) continue;
                const firstRect = bucket[0].getBoundingClientRect();
                checkedGroups[name] = (checkedGroups[name] || 0) + bucket.length;
                pairs[name] = (pairs[name] || 0) + bucket.length - 1;

                for (let i = 1; i < bucket.length; i++) {
                    const item = bucket[i];
                    const rect = item.getBoundingClientRect();
                    const horiz = mode !== "tb";
                    const startEdge = horiz ? "left" : "top";
                    const endEdge = horiz ? "right" : "bottom";
                    const startDiff = Math.abs(firstRect[startEdge] - rect[startEdge]);
                    const endDiff = Math.abs(firstRect[endEdge] - rect[endEdge]);

                    const isContentGroup =
                        item.getAttribute("data-align-edge") === "left" ||
                        bucket[0].getAttribute("data-align-edge") === "left";
                    const checkStart = true;
                    const checkEnd = !isContentGroup;

                    if (checkStart && startDiff > 1.05) {
                        errors.push(
                            `Group "${name}" ${startEdge} mismatch: diff ${startDiff.toFixed(2)}px between <${bucket[0].tagName.toLowerCase()} class="${bucket[0].className}"> (${firstRect[startEdge].toFixed(1)}) and <${item.tagName.toLowerCase()} class="${item.className}"> (${rect[startEdge].toFixed(1)})`
                        );
                    }
                    if (checkEnd && endDiff > 1.05) {
                        errors.push(
                            `Group "${name}" ${endEdge} mismatch: diff ${endDiff.toFixed(2)}px between <${bucket[0].tagName.toLowerCase()} class="${bucket[0].className}"> (${firstRect[endEdge].toFixed(1)}) and <${item.tagName.toLowerCase()} class="${item.className}"> (${rect[endEdge].toFixed(1)})`
                        );
                    }
                }
            }
        }

        return { errors, checkedGroups, pairs };
    }""", [group_name, edges])

def main():
    total_errors = []
    print("=== Starting Alignment and Hydration Tests ===")

    with sync_playwright() as p:
        browser = p.chromium.launch()
        context = browser.new_context()
        page = context.new_page()

        # 1b. Onboarding and /add: each named group must compare real pairs, not just exist
        for path, vp_name, group, edges in ONBOARDING_CHECKS:
            vp = next(v for v in VIEWPORTS if v["name"] == vp_name)
            page.set_viewport_size({"width": vp["width"], "height": vp["height"]})
            page.goto(f"{BASE_URL}{path}", wait_until="networkidle")
            page.wait_for_timeout(300)
            res = check_align_groups(page, group, edges)
            n = res["pairs"].get(group, 0)
            label = "top/bottom" if edges == "tb" else "left/right"
            if res["errors"]:
                print(f"[FAIL] {path} @ {vp_name} [{group}, {label}]: {res['errors']}")
                total_errors.extend(res["errors"])
            elif n == 0:
                msg = f"{path} @ {vp_name} [{group}, {label}]: no pairs compared"
                print(f"[FAIL] {msg}")
                total_errors.append(msg)
            else:
                print(f"[PASS] {path} @ {vp_name} [{group}, {label}]: {n} pairs compared, edges aligned")

        # 1. Alignment checks
        for vp in VIEWPORTS:
            page.set_viewport_size({"width": vp["width"], "height": vp["height"]})

            # /app (Hôm nay)
            page.goto(f"{BASE_URL}/app", wait_until="networkidle")
            page.wait_for_timeout(500)
            res = check_align_groups(page)
            if res["errors"]:
                print(f"[FAIL] /app @ {vp['name']}: {res['errors']}")
                total_errors.extend(res["errors"])
            else:
                print(f"[PASS] /app @ {vp['name']} (checked groups: {res['checkedGroups']})")

            # cc-27 fix: the share image always has a name, so the sheet opens straight on the image only for a named profile
            page.evaluate("localStorage.setItem('h1t_profile_v1_demo', JSON.stringify({sex:'male',birthYear:2003,weightKg:65,goal:'maintain',periodMode:false,trainingMinutesDefault:60,displayName:'Học viên A',hintSeen:true}))")
            page.reload(wait_until="networkidle")
            page.wait_for_timeout(500)
            # cc-26: the share sheet's two buttons share edges (file sharing faked, so both show)
            page.evaluate("navigator.canShare = () => true; navigator.share = () => Promise.resolve();")
            page.locator("[aria-label='Chia sẻ ngày này']:visible").first.click()
            page.locator('[data-align-group="share-actions"]:visible').nth(1).wait_for(timeout=10000)
            res = check_align_groups(page, "share-actions")
            pairs = res["pairs"].get("share-actions", 0)
            if res["errors"] or pairs < 1:
                print(f"[FAIL] / share sheet @ {vp['name']} [share-actions]: pairs {pairs} {res['errors']}")
                total_errors.extend(res["errors"] or [f"share sheet: {pairs} pairs"])
            else:
                print(f"[PASS] / share sheet @ {vp['name']} [share-actions] ({pairs} pairs)")

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
                # Desktop: the add sheet is a dialog over Hôm nay, which also lists Chà là, so pick the one in the dialog
                dialog_btn = page.locator("[role=dialog] button:has-text('Chà là') >> visible=true")
                date_btn = (dialog_btn if dialog_btn.count() else page.locator("button:has-text('Chà là') >> visible=true")).first
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

            # cc-24: leaderboard, coaches and the admin queue; the pairs must really be compared
            for route, group, min_pairs in DONG_SCREEN_CHECKS:
                page.goto(f"{BASE_URL}{route}", wait_until="networkidle")
                page.wait_for_timeout(700)
                res = check_align_groups(page, group)
                pairs = res["pairs"].get(group, 0)
                if res["errors"] or pairs < min_pairs:
                    print(f"[FAIL] {route} @ {vp['name']} [{group}]: pairs {pairs} (need {min_pairs}) {res['errors']}")
                    total_errors.extend(res["errors"] or [f"{route} {group}: {pairs} pairs"])
                else:
                    print(f"[PASS] {route} @ {vp['name']} [{group}] ({pairs} pairs)")

        # cc-23: compare foods at both widths, real pairs
        for vp in VIEWPORTS:
            page.set_viewport_size({"width": vp["width"], "height": vp["height"]})
            page.goto(f"{BASE_URL}{COMPARE_ROUTE}", wait_until="networkidle")
            page.wait_for_timeout(700)
            for group, min_pairs in COMPARE_CHECKS:
                res = check_align_groups(page, group)
                pairs = res["pairs"].get(group, 0)
                if res["errors"] or pairs < min_pairs:
                    print(f"[FAIL] /foods/compare @ {vp['name']} [{group}]: pairs {pairs} (need {min_pairs}) {res['errors']}")
                    total_errors.extend(res["errors"] or [f"compare {group}: {pairs} pairs"])
                else:
                    print(f"[PASS] /foods/compare @ {vp['name']} [{group}] ({pairs} pairs)")

        # cc-27b: the recipe builder's ingredient rows (add two, the pairs must really be compared)
        for vp in VIEWPORTS:
            page.set_viewport_size({"width": vp["width"], "height": vp["height"]})
            page.goto(f"{BASE_URL}/foods/new?mode=recipe", wait_until="networkidle")
            page.wait_for_timeout(500)
            for term, name in [("gạo lứt", "Cơm gạo lứt"), ("trứng", "Trứng gà")]:
                page.get_by_role("button", name="+ Thêm nguyên liệu").click()
                dialog = page.get_by_role("dialog", name="Chọn nguyên liệu")  # cc-42: multi-select picker
                dialog.wait_for(state="visible", timeout=4000)
                dialog.get_by_label("Tìm món").fill(term)
                page.wait_for_timeout(400)
                dialog.locator("[data-food-row]").filter(has_text=name).first.click()
                page.wait_for_timeout(200)
                dialog.get_by_role("button", name="Thêm vào món").click()
                page.wait_for_timeout(200)
            res = check_align_groups(page, "recipe-row")
            pairs = res["pairs"].get("recipe-row", 0)
            if res["errors"] or pairs < 1:
                print(f"[FAIL] /foods/new recipe @ {vp['name']} [recipe-row]: pairs {pairs} {res['errors']}")
                total_errors.extend(res["errors"] or [f"recipe-row: {pairs} pairs"])
            else:
                print(f"[PASS] /foods/new recipe @ {vp['name']} [recipe-row] ({pairs} pairs)")

        # cc-42 / cc-53b: the tray review sheet on /add (Tray.dc.html: every food card shares both edges)
        for vp in VIEWPORTS:
            page.set_viewport_size({"width": vp["width"], "height": vp["height"]})
            page.goto(f"{BASE_URL}/add?meal=lunch", wait_until="networkidle")
            page.wait_for_timeout(500)
            for i in range(3):
                page.locator("[data-tray-toggle]:visible").nth(i).click()
            page.get_by_role("button", name="Xem lại").locator("visible=true").first.click()
            page.locator('[data-align-group="tray-review"]:visible').nth(1).wait_for(timeout=5000)
            # The cards pop in (.m-pop from opacity 0): measure them once the sheet and the pop have settled
            page.wait_for_timeout(500)
            res = check_align_groups(page, "tray-review")
            pairs = res["pairs"].get("tray-review", 0)
            if res["errors"] or pairs < 1:
                print(f"[FAIL] /add tray review @ {vp['name']} [tray-review]: pairs {pairs} {res['errors']}")
                total_errors.extend(res["errors"] or [f"tray-review: {pairs} pairs"])
            else:
                print(f"[PASS] /add tray review @ {vp['name']} [tray-review] ({pairs} pairs)")

        # cc-27a: select mode on Hôm nay (the action bar's rows, the target sheet's radios); real pairs
        for vp in VIEWPORTS:
            page.set_viewport_size({"width": vp["width"], "height": vp["height"]})
            page.goto(f"{BASE_URL}/app", wait_until="networkidle")
            page.wait_for_timeout(500)
            page.get_by_role("button", name="Tùy chọn ngày").click()
            page.get_by_role("dialog").get_by_role("button", name="Chọn nhiều món").click()
            page.wait_for_timeout(300)
            page.locator("[role=checkbox]").first.click()
            page.get_by_role("button", name="Chép sang", exact=True).click()
            page.locator('[data-align-group="select-target"]:visible').nth(1).wait_for(timeout=5000)
            for group, label in [("select-target", "target sheet radios")]:
                res = check_align_groups(page, group)
                pairs = res["pairs"].get(group, 0)
                if res["errors"] or pairs < 1:
                    print(f"[FAIL] / select @ {vp['name']} [{group}]: pairs {pairs} {res['errors']}")
                    total_errors.extend(res["errors"] or [f"{group}: {pairs} pairs"])
                else:
                    print(f"[PASS] / select @ {vp['name']} [{group}] ({pairs} pairs)")
            page.keyboard.press("Escape")
            page.wait_for_timeout(200)
            res = check_align_groups(page, "select-bar")
            pairs = res["pairs"].get("select-bar", 0)
            if res["errors"] or pairs < 1:
                print(f"[FAIL] / select @ {vp['name']} [select-bar]: pairs {pairs} {res['errors']}")
                total_errors.extend(res["errors"] or [f"select-bar: {pairs} pairs"])
            else:
                print(f"[PASS] / select @ {vp['name']} [select-bar] ({pairs} pairs)")

        # cc-28c: the Level explainer's rows (a user at Level 2 opens it from the label above the column)
        for vp in VIEWPORTS:
            page.set_viewport_size({"width": vp["width"], "height": vp["height"]})
            page.goto(f"{BASE_URL}/app?level=2", wait_until="networkidle")
            page.wait_for_timeout(600)
            page.get_by_role("button", name="Level 2 · HLV Khánh").click()
            page.get_by_role("dialog", name="Level là gì?").wait_for(state="visible", timeout=5000)
            res = check_align_groups(page, "level-row")
            pairs = res["pairs"].get("level-row", 0)
            if res["errors"] or pairs < 5:
                print(f"[FAIL] / Level explainer @ {vp['name']} [level-row]: pairs {pairs} (need 5) {res['errors']}")
                total_errors.extend(res["errors"] or [f"level-row: {pairs} pairs"])
            else:
                print(f"[PASS] / Level explainer @ {vp['name']} [level-row] ({pairs} pairs)")

        browser.close()

    if total_errors:
        print(f"\nTotal alignment failures: {len(total_errors)}")
        sys.exit(1)
    else:
        print("\nAll alignment checks passed cleanly (<= 1px difference)!")
        sys.exit(0)

if __name__ == "__main__":
    main()
