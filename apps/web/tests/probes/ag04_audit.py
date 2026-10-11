import os
import sys
import re
import math
from playwright.sync_api import sync_playwright

BASE_URL = os.environ.get("ALIGN_BASE_URL", "http://localhost:3100")

ROUTES = [
    "/today",
    "/micros",
    "/micros/vitamin-d",
    "/add",
    "/add?meal=breakfast",
    "/entry/item-1",
    "/foods",
    "/foods/food-cha-la",
    "/foods/new",
    "/profile",
    "/profile/weight",
    "/training",
    "/settings/language",
    "/settings/notifications",
    "/settings/delete-account",
    "/install",
    "/paywall",
    "/setup/profile",
    "/setup/goal",
    "/signin",
    "/signin/check-email",
    "/signin/expired",
    "/signup",
    "/this-page-does-not-exist",
]

def parse_rgb(rgb_str):
    if not rgb_str:
        return None
    m = re.search(r"rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)", rgb_str)
    if m:
        r, g, b = int(m.group(1)), int(m.group(2)), int(m.group(3))
        a = float(m.group(4)) if m.group(4) is not None else 1.0
        return (r, g, b, a)
    return None

def luminance(r, g, b):
    def channel(c):
        c = c / 255.0
        return c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4
    return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)

def contrast_ratio(fg, bg):
    # fg, bg are (r, g, b)
    l1 = luminance(fg[0], fg[1], fg[2])
    l2 = luminance(bg[0], bg[1], bg[2])
    lum_top = max(l1, l2)
    lum_bot = min(l1, l2)
    return (lum_top + 0.05) / (lum_bot + 0.05)

AUDIT_JS = """
() => {
    const issues = [];
    const isHidden = (el) => {
        if (!el) return true;
        const style = window.getComputedStyle(el);
        if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return true;
        const rect = el.getBoundingClientRect();
        return rect.width === 0 && rect.height === 0;
    };

    // 1. Headings check
    const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6')).filter(el => !isHidden(el));
    const hLevels = headings.map(h => ({
        tag: h.tagName.toLowerCase(),
        level: parseInt(h.tagName.substring(1)),
        text: h.textContent.trim().slice(0, 30)
    }));
    if (hLevels.length > 0) {
        if (hLevels[0].level !== 1) {
            issues.push({
                type: 'heading',
                issue: `Thứ tự tiêu đề không bắt đầu bằng h1 (bắt đầu bằng ${hLevels[0].tag}: "${hLevels[0].text}")`,
                severity: 'Should',
                selector: hLevels[0].tag
            });
        }
        for (let i = 0; i < hLevels.length - 1; i++) {
            if (hLevels[i+1].level - hLevels[i].level > 1) {
                issues.push({
                    type: 'heading',
                    issue: `Bỏ qua cấp độ tiêu đề từ ${hLevels[i].tag} nhảy sang ${hLevels[i+1].tag} ("${hLevels[i+1].text}")`,
                    severity: 'Should',
                    selector: hLevels[i+1].tag
                });
            }
        }
    } else {
        issues.push({
            type: 'heading',
            issue: 'Trang không có thẻ tiêu đề h1',
            severity: 'Should',
            selector: 'document'
        });
    }

    // 2. Interactive elements: tap target, label, focus
    const interactives = Array.from(document.querySelectorAll('button, a, input, select, textarea, [role="button"], [role="tab"], [role="radio"], [role="switch"]')).filter(el => !isHidden(el));
    interactives.forEach(el => {
        const rect = el.getBoundingClientRect();
        const style = window.getComputedStyle(el);
        const tag = el.tagName.toLowerCase();
        const text = (el.textContent || '').trim().replace(/\\s+/g, ' ').slice(0, 35);
        const ariaLabel = el.getAttribute('aria-label') || '';
        const ariaLabelledby = el.getAttribute('aria-labelledby') || '';
        const title = el.getAttribute('title') || '';
        const name = ariaLabel || text || title;

        // Positive tabindex check
        const tabIndex = parseInt(el.getAttribute('tabindex') || '0', 10);
        if (tabIndex > 0) {
            issues.push({
                type: 'tabindex',
                issue: `Phần tử có tabindex dương (> 0) làm sai thứ tự bàn phím: tabindex="${tabIndex}"`,
                severity: 'Must',
                selector: `<${tag}>`
            });
        }

        // Tap target size (< 44px)
        const isInlineTextLink = tag === 'a' && style.display.includes('inline') && el.parentElement && !window.getComputedStyle(el.parentElement).display.includes('flex') && !window.getComputedStyle(el.parentElement).display.includes('grid');
        if (!isInlineTextLink && (rect.width < 43.5 || rect.height < 43.5)) {
            issues.push({
                type: 'tap_target',
                issue: `Mục tương tác nhỏ hơn 44 px (${Math.round(rect.width)}×${Math.round(rect.height)} px): <${tag}> "${name || text}"`,
                severity: rect.width < 36 || rect.height < 36 ? 'Must' : 'Should',
                selector: tag,
                details: { width: Math.round(rect.width), height: Math.round(rect.height), text: name }
            });
        }

        // Icon-only buttons without accessible name
        if (tag === 'button' || tag === 'a' || el.getAttribute('role') === 'button') {
            if (!name && !ariaLabelledby) {
                issues.push({
                    type: 'accessible_name',
                    issue: `Nút/liên kết không có nhãn văn bản hoặc aria-label: <${tag}>`,
                    severity: 'Must',
                    selector: tag
                });
            }
        }

        // Form inputs without label
        if (tag === 'input' || tag === 'select' || tag === 'textarea') {
            const inputType = el.getAttribute('type') || 'text';
            if (inputType !== 'hidden' && inputType !== 'submit' && inputType !== 'button') {
                const id = el.id;
                let hasLabel = !!ariaLabel || !!ariaLabelledby || !!title || !!el.getAttribute('placeholder');
                if (id) {
                    const label = document.querySelector(`label[for="${id}"]`);
                    if (label) hasLabel = true;
                }
                if (!hasLabel && el.closest('label')) hasLabel = true;
                if (!hasLabel) {
                    issues.push({
                        type: 'input_label',
                        issue: `Ô nhập liệu không có nhãn hoặc aria-label: <${tag} type="${inputType}">`,
                        severity: 'Must',
                        selector: `${tag}[type="${inputType}"]`
                    });
                }
            }
        }
    });

    // Helper: parse rgba
    const parseColor = (colStr) => {
        if (!colStr) return null;
        const m = colStr.match(/rgba?\\((\\d+),\\s*(\\d+),\\s*(\\d+)(?:,\\s*([\\d.]+))?\\)/);
        if (m) {
            return {
                r: parseInt(m[1]),
                g: parseInt(m[2]),
                b: parseInt(m[3]),
                a: m[4] !== undefined ? parseFloat(m[4]) : 1.0
            };
        }
        return null;
    };

    const getEffectiveBg = (elem) => {
        let cur = elem;
        while (cur && cur !== document.documentElement) {
            const bg = window.getComputedStyle(cur).backgroundColor;
            const parsed = parseColor(bg);
            if (parsed && parsed.a > 0.05) {
                return parsed;
            }
            cur = cur.parentElement;
        }
        return { r: 243, g: 241, b: 236, a: 1 }; // Default #F3F1EC
    };

    const lum = (c) => {
        const chan = (v) => {
            const s = v / 255;
            return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
        };
        return 0.2126 * chan(c.r) + 0.7152 * chan(c.g) + 0.0722 * chan(c.b);
    };

    const getRatio = (c1, c2) => {
        const l1 = lum(c1);
        const l2 = lum(c2);
        return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
    };

    // 3. Contrast check on text elements
    const textEls = Array.from(document.querySelectorAll('p, span, h1, h2, h3, h4, h5, h6, a, button, label, td, th')).filter(el => !isHidden(el) && el.textContent.trim().length > 0 && el.children.length === 0);
    const contrastViolations = new Set();
    textEls.forEach(el => {
        const style = window.getComputedStyle(el);
        const fg = parseColor(style.color);
        if (!fg || fg.a === 0) return;
        const bg = getEffectiveBg(el);
        const ratio = getRatio(fg, bg);
        const fontSizePx = parseFloat(style.fontSize);
        const fontWeight = parseInt(style.fontWeight) || 400;
        const isLarge = fontSizePx >= 24 || (fontSizePx >= 18.66 && fontWeight >= 700);
        const requiredRatio = isLarge ? 3.0 : 4.5;

        if (ratio < requiredRatio) {
            const txt = el.textContent.trim().slice(0, 30);
            const key = `${txt}-${ratio.toFixed(2)}`;
            if (!contrastViolations.has(key)) {
                contrastViolations.add(key);
                issues.push({
                    type: 'contrast',
                    issue: `Độ tương phản thấp (${ratio.toFixed(2)}:1 < ${requiredRatio}:1, cỡ chữ ${fontSizePx}px): "${txt}"`,
                    severity: ratio < 3.0 ? 'Must' : 'Should',
                    selector: el.tagName.toLowerCase(),
                    details: { ratio: ratio.toFixed(2), required: requiredRatio, fg: style.color, text: txt }
                });
            }
        }
    });

    // 3. Fonts check
    const textNodes = [];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
        acceptNode: (n) => {
            if (!n.textContent.trim()) return NodeFilter.FILTER_REJECT;
            if (isHidden(n.parentElement)) return NodeFilter.FILTER_REJECT;
            return NodeFilter.FILTER_ACCEPT;
        }
    });
    while (walker.nextNode()) {
        textNodes.push(walker.currentNode);
    }

    const invalidFontSamples = new Set();
    textNodes.forEach(tn => {
        const p = tn.parentElement;
        if (!p) return;
        const font = window.getComputedStyle(p).fontFamily.toLowerCase();
        // Allowed fonts: manrope, saira, system fallbacks (-apple-system, blinkmacsystemfont, segoe ui, roboto, sans-serif)
        const isManrope = font.includes('manrope') || font.includes('var(--font-manrope-face)');
        const isSaira = font.includes('saira') || font.includes('var(--font-saira-condensed-face)');
        const isSystem = font.includes('-apple-system') || font.includes('blinkmacsystemfont') || font.includes('sans-serif');
        if (!isManrope && !isSaira && !isSystem) {
            invalidFontSamples.add(font);
        }
    });
    if (invalidFontSamples.size > 0) {
        issues.push({
            type: 'font',
            issue: `Phát hiện font không thuộc hệ thống (Saira / Manrope): ${Array.from(invalidFontSamples).join(', ')}`,
            severity: 'Should',
            selector: 'font-family'
        });
    }

    // 4. Number format check (English comma as thousands separator or English dot as decimal)
    const enNumberMatches = [];
    textNodes.forEach(tn => {
        const text = tn.textContent;
        // Decimal with dot instead of comma: e.g. 2.5 mg, 1.5 g, 0.5 g (1 or 2 digits after dot)
        const enDecimalMatch = text.match(/\b\d+\.\d{1,2}\s*(mg|g|µg|ml|kcal|kg)\b/i);
        if (enDecimalMatch) {
            enNumberMatches.push(`Số dùng dấu chấm thập phân kiểu Anh: "${enDecimalMatch[0]}" (nên dùng dấu phẩy, ví dụ 2,5)`);
        }
        // English thousands comma: e.g. 1,950 kcal or 2,275 kcal
        const enThousandsMatch = text.match(/\b\d{1,3},\d{3}\s*(kcal|mg|g)?\b/);
        if (enThousandsMatch && !text.includes('·') && !text.includes('/') && !text.includes('–')) {
            enNumberMatches.push(`Số dùng dấu phẩy hàng nghìn kiểu Anh: "${enThousandsMatch[0]}" (nên dùng dấu chấm, ví dụ 1.950)`);
        }
        // Unformatted thousands: e.g. 1950 kcal or 2275 kcal
        const unformattedMatch = text.match(/\b\d{4,}\s*(kcal|mg|g)\b/);
        if (unformattedMatch) {
            enNumberMatches.push(`Số chưa phân cách hàng nghìn bằng dấu chấm: "${unformattedMatch[0]}"`);
        }
    });
    if (enNumberMatches.length > 0) {
        const unique = Array.from(new Set(enNumberMatches)).slice(0, 5);
        issues.push({
            type: 'number_format',
            issue: `Định dạng số chưa chuẩn tiếng Việt (1.041 / 2,1): ${unique.join('; ')}`,
            severity: 'Should',
            selector: 'text'
        });
    }

    return issues;
}
"""

def main():
    print(f"=== Running AG-04 Accessibility & Consistency Audit against {BASE_URL} ===")
    all_results = {}

    with sync_playwright() as p:
        browser = p.chromium.launch()

        for route in ROUTES:
            all_results[route] = {"mobile": [], "desktop": []}
            url = f"{BASE_URL}{route}"

            # Mobile (390x844)
            page_m = browser.new_page(viewport={"width": 390, "height": 844})
            try:
                page_m.goto(url, wait_until="networkidle", timeout=10000)
                page_m.wait_for_timeout(400)
                issues_m = page_m.evaluate(AUDIT_JS)
                all_results[route]["mobile"] = issues_m
            except Exception as e:
                all_results[route]["mobile"] = [{"type": "error", "issue": f"Không tải được trang: {str(e)[:60]}", "severity": "Must", "selector": "page"}]
            page_m.close()

            # Desktop (1440x900)
            page_d = browser.new_page(viewport={"width": 1440, "height": 900})
            try:
                page_d.goto(url, wait_until="networkidle", timeout=10000)
                page_d.wait_for_timeout(400)
                issues_d = page_d.evaluate(AUDIT_JS)
                all_results[route]["desktop"] = issues_d
            except Exception as e:
                all_results[route]["desktop"] = [{"type": "error", "issue": f"Không tải được trang: {str(e)[:60]}", "severity": "Must", "selector": "page"}]
            page_d.close()

        browser.close()

    # Print summary
    print("\n=== AUDIT RESULTS SUMMARY ===")
    total_must = 0
    total_should = 0
    total_nice = 0

    for route, res in all_results.items():
        issues = res["mobile"] + res["desktop"]
        for iss in issues:
            sev = iss.get("severity", "Should")
            if sev == "Must":
                total_must += 1
            elif sev == "Should":
                total_should += 1
            else:
                total_nice += 1

    print(f"Total Routes Audited: {len(ROUTES)}")
    print(f"Raw Findings - Must: {total_must}, Should: {total_should}, Nice: {total_nice}")

    # Output detailed findings JSON for reporting
    import json
    with open("tests/probes/ag04_audit_results.json", "w", encoding="utf-8") as f:
        json.dump(all_results, f, ensure_ascii=False, indent=2)
    print("Saved audit findings to tests/probes/ag04_audit_results.json")

    print("\n=== ROUTE-BY-ROUTE BREAKDOWN ===")
    for route, dev in all_results.items():
        combined = dev["mobile"] + dev["desktop"]
        if combined:
            print(f"\nRoute: {route}")
            seen = set()
            for iss in combined:
                key = (iss["type"], iss["issue"])
                if key not in seen:
                    seen.add(key)
                    print(f"  [{iss.get('severity', 'Should')}] {iss['type']}: {iss['issue']}")

if __name__ == "__main__":
    main()
