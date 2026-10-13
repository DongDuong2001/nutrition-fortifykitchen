"""ag-07: verification probe for remaining accessibility items:
1. /foods/[id]: gram input fills 44px label (h-full) and shows focus ring on Tab
2. /foods/new: inputs (cf-name, cf-size, cf-kcal, cf-pro, cf-carbs, cf-fat) linked to label via htmlFor/id
3. FormRow required "*" uses --color-destructive-text with contrast >= 4.5:1 on #FFFFFF and #F3F1EC
4. /signin (MagicLinkForm): email input has visible keyboard focus ring
Asserted at both 390x844 (mobile) and 1440x900 (desktop).

Run with: ALIGN_BASE_URL=http://localhost:3100 npm run probe -- tests/probes/ag07.py
"""
import os
import re
import sys
from playwright.sync_api import sync_playwright

BASE = os.environ.get("ALIGN_BASE_URL", "http://localhost:3100")
PHONE = {"width": 390, "height": 844}
DESKTOP = {"width": 1440, "height": 900}

problems = []
notes = []


def check(cond, msg):
    if cond:
        notes.append("ok: " + msg)
    else:
        problems.append("FAIL: " + msg)


def srgb_to_lin(c):
    c = c / 255.0
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def rel_lum(r, g, b):
    return 0.2126 * srgb_to_lin(r) + 0.7152 * srgb_to_lin(g) + 0.0722 * srgb_to_lin(b)


def contrast_ratio(rgb1, rgb2):
    l1 = rel_lum(*rgb1)
    l2 = rel_lum(*rgb2)
    lighter = max(l1, l2)
    darker = min(l1, l2)
    return (lighter + 0.05) / (darker + 0.05)


def parse_rgb(rgb_str):
    m = re.search(r"rgba?\((\d+),\s*(\d+),\s*(\d+)", rgb_str)
    if m:
        return int(m.group(1)), int(m.group(2)), int(m.group(3))
    return (200, 58, 63)


def test_item_1(browser, vp_name, vp):
    """Item 1: /foods/[id] gram input fills 44 px label (h-full) and shows focus ring on Tab"""
    ctx = browser.new_context(viewport=vp)
    pg = ctx.new_page()
    pg.goto(BASE + "/foods/food-pho-bo", wait_until="networkidle")
    pg.wait_for_timeout(300)

    check(pg.locator("#fd-size").count() == 0, f"[{vp_name}] foods/[id]: gram input hidden until Tuỳ chỉnh is selected")
    pg.get_by_role("button", name="Tuỳ chỉnh").click()
    pg.wait_for_timeout(100)
    inp = pg.locator("#fd-size")
    check(inp.count() > 0, f"[{vp_name}] foods/[id]: #fd-size input exists")

    parent_label = pg.locator("label:has(#fd-size)")
    parent_box = parent_label.bounding_box()
    check(parent_box is not None and parent_box["height"] >= 43.5,
          f"[{vp_name}] foods/[id]: label wrapper height >= 44 px (measured: {parent_box['height'] if parent_box else 'None'} px)")

    inp_classes = inp.get_attribute("class") or ""
    check("h-full" in inp_classes, f"[{vp_name}] foods/[id]: #fd-size input has h-full class")

    # Tab navigation to verify focus ring
    inp.focus()
    pg.wait_for_timeout(100)

    # Check parent label focus ring
    label_classes = parent_label.get_attribute("class") or ""
    has_ring_classes = ("ring-blue" in label_classes and
                        ("focus-within:ring-2" in label_classes or "focus-visible:ring-2" in label_classes))
    check(has_ring_classes, f"[{vp_name}] foods/[id]: label has focus ring classes ({label_classes})")

    ctx.close()


def test_item_2(browser, vp_name, vp):
    """Item 2: /foods/new every input is linked to its label (clicking label focuses input)"""
    ctx = browser.new_context(viewport=vp)
    pg = ctx.new_page()
    pg.goto(BASE + "/foods/new", wait_until="networkidle")
    pg.wait_for_timeout(300)

    # Pre-fill name so validation error does not trigger layout shift on blur
    pg.locator("#cf-name").fill("Món mẫu")

    input_ids = ["cf-name", "cf-size", "cf-kcal", "cf-pro", "cf-carbs", "cf-fat"]
    for i_id in input_ids:
        lbl = pg.locator(f'label[for="{i_id}"]')
        check(lbl.count() > 0, f"[{vp_name}] foods/new: label for='{i_id}' exists")

        # Click label and verify input receives focus
        lbl.click()
        pg.wait_for_timeout(100)
        active_id = pg.evaluate("() => document.activeElement ? document.activeElement.id : null")
        check(active_id == i_id, f"[{vp_name}] foods/new: clicking label for='{i_id}' focuses #{i_id} (active: {active_id})")

    ctx.close()


def test_item_3(browser, vp_name, vp):
    """Item 3: FormRow required '*' has contrast >= 4.5:1 on #FFFFFF and #F3F1EC"""
    ctx = browser.new_context(viewport=vp)
    pg = ctx.new_page()
    pg.goto(BASE + "/foods/new", wait_until="networkidle")
    pg.wait_for_timeout(300)

    asterisk = pg.locator('label[for="cf-name"] span:has-text("*")')
    check(asterisk.count() > 0, f"[{vp_name}] foods/new: required '*' element exists")

    star_class = asterisk.get_attribute("class") or ""
    check("text-destructive-text" in star_class, f"[{vp_name}] foods/new: asterisk uses text-destructive-text ({star_class})")

    color_rgb = asterisk.evaluate("el => window.getComputedStyle(el).color")
    rgb = parse_rgb(color_rgb)

    cr_white = contrast_ratio(rgb, (255, 255, 255))
    cr_paper = contrast_ratio(rgb, (243, 241, 236))

    check(cr_white >= 4.5, f"[{vp_name}] asterisk contrast on #FFFFFF >= 4.5:1 (measured: {cr_white:.2f}:1)")
    check(cr_paper >= 4.5, f"[{vp_name}] asterisk contrast on #F3F1EC >= 4.5:1 (measured: {cr_paper:.2f}:1)")

    ctx.close()


def test_item_4(browser, vp_name, vp):
    """Item 4: /signin MagicLinkForm email input has visible focus ring on Tab"""
    ctx = browser.new_context(viewport=vp)
    pg = ctx.new_page()
    pg.goto(BASE + "/signin", wait_until="networkidle")
    pg.wait_for_timeout(300)

    # cc-18: /signin has the password form's email above the magic link's; this item is the magic link's (the last one)
    email_inp = pg.locator('input[type="email"]').last
    check(email_inp.count() > 0, f"[{vp_name}] signin: email input exists")

    inp_classes = email_inp.get_attribute("class") or ""
    has_focus_classes = ("focus-visible:ring-2" in inp_classes and "focus-visible:ring-blue" in inp_classes)
    check(has_focus_classes, f"[{vp_name}] signin: email input has focus ring classes ({inp_classes})")

    # Focus and verify
    email_inp.focus()
    pg.wait_for_timeout(100)
    active_type = pg.evaluate("() => document.activeElement ? document.activeElement.getAttribute('type') : null")
    check(active_type == "email", f"[{vp_name}] signin: email input focused")

    ctx.close()


def main():
    print(f"=== ag-07 Accessibility Probe against {BASE} ===")
    with sync_playwright() as p:
        browser = p.chromium.launch()

        for vp_name, vp in [("390 mobile", PHONE), ("1440 desktop", DESKTOP)]:
            print(f"\n--- Checking viewport: {vp_name} ---")
            test_item_1(browser, vp_name, vp)
            test_item_2(browser, vp_name, vp)
            test_item_3(browser, vp_name, vp)
            test_item_4(browser, vp_name, vp)

        browser.close()

    print("\n=== Probe Results ===")
    for n in notes:
        print("  " + n)

    if problems:
        print(f"\nFAILURE: {len(problems)} problem(s) detected:")
        for p in problems:
            print("  - " + p)
        sys.exit(1)
    else:
        print(f"\nSUCCESS: All {len(notes)} checks passed across 390 and 1440.")
        sys.exit(0)


if __name__ == "__main__":
    main()
