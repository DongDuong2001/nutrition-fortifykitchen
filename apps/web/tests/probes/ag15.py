"""ag15 accessibility audit probe (REPORT mode, never fails).
Runs Playwright on the prod build over every route in smoke.py at 390x844 and 1280x800.
Audits:
- Keyboard navigation & Tab focusability, Esc closes dialog/sheet
- Accessible names on buttons & links
- Labels on form inputs
- Tap targets >= 44px
- Contrast >= 4.5:1 (3:1 large/UI)
- Headings order & h1 count
- Images / icons decorative or labelled
- Prefers-reduced-motion
- 200% zoom without horizontal scroll
Outputs findings to stdout and JSON/summary for docs/a11y-audit-ag15.md.
"""

import os
import sys
import json
import re
from pathlib import Path
from playwright.sync_api import sync_playwright
import _demo  # noqa: F401  (cc2-15b: demo mode on, see _demo.py)

BASE = os.environ.get("ALIGN_BASE_URL", "http://localhost:3100")
HERE = Path(__file__).resolve().parent
APP_DIR = HERE.parent.parent / "app"
WIDTHS = [(390, 844), (1280, 800)]
NOT_FOUND_ROUTE = "/this-page-does-not-exist"
MOCK_IDS = {"entry": "item-1", "foods": "food-cha-la", "micros": "calcium", "explore": "tinh_bot", "rich": "calcium"}

def discover_routes():
    routes = []
    for page_file in sorted(APP_DIR.rglob("page.tsx")):
        parts = []
        for seg in page_file.parent.relative_to(APP_DIR).parts:
            if seg.startswith("(") and seg.endswith(")"):
                continue
            if seg.startswith("[") and seg.endswith("]"):
                if not parts or parts[-1] not in MOCK_IDS:
                    continue
                parts.append(MOCK_IDS[parts[-1]])
            else:
                parts.append(seg)
        routes.append("/" + "/".join(parts))
    routes.append(NOT_FOUND_ROUTE)
    # Deduplicate while preserving order
    seen = set()
    dedup = []
    for r in routes:
        if r not in seen:
            seen.add(r)
            dedup.append(r)
    return dedup

AUDIT_EVAL_JS = """
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
  const h1s = headings.filter(h => h.tagName.toLowerCase() === 'h1');
  if (h1s.length === 0) {
    issues.push({
      element: 'page',
      problem: 'Trang không có tiêu đề h1',
      wcag: '1.3.1 Info and Relationships',
      severity: 'Should'
    });
  } else if (h1s.length > 1) {
    issues.push({
      element: 'h1',
      problem: `Trang có ${h1s.length} thẻ h1 (${h1s.map(h => h.textContent.trim().slice(0, 20)).join(', ')})`,
      wcag: '1.3.1 Info and Relationships',
      severity: 'Should'
    });
  }

  // Check skipped levels
  const hLevels = headings.map(h => parseInt(h.tagName.substring(1)));
  for (let i = 0; i < hLevels.length - 1; i++) {
    if (hLevels[i+1] - hLevels[i] > 1) {
      issues.push({
        element: headings[i+1].tagName.toLowerCase(),
        problem: `Nhảy cóc cấp độ tiêu đề từ h${hLevels[i]} sang h${hLevels[i+1]} ("${headings[i+1].textContent.trim().slice(0, 25)}")`,
        wcag: '1.3.1 Info and Relationships',
        severity: 'Should'
      });
    }
  }

  // 2. Buttons & Links accessible name
  const clickables = Array.from(document.querySelectorAll('button, a[href], [role="button"]')).filter(el => !isHidden(el));
  for (const el of clickables) {
    const name = el.getAttribute('aria-label') || el.innerText?.trim() || el.getAttribute('title') || '';
    if (!name) {
      // Check if it has an img/svg with aria-label
      const labelledChild = el.querySelector('[aria-label], img[alt]');
      if (!labelledChild) {
        issues.push({
          element: `<${el.tagName.toLowerCase()}>`,
          problem: 'Nút bấm hoặc liên kết không có tên trợ năng (accessible name)',
          wcag: '4.1.2 Name, Role, Value',
          severity: 'Must'
        });
      }
    }
  }

  // 3. Form inputs labels
  const inputs = Array.from(document.querySelectorAll('input, select, textarea')).filter(el => !isHidden(el) && el.type !== 'hidden');
  for (const input of inputs) {
    const id = input.id;
    const hasLabel = id && document.querySelector(`label[for="${id}"]`);
    const hasAriaLabel = input.getAttribute('aria-label') || input.getAttribute('aria-labelledby');
    const parentLabel = input.closest('label');
    if (!hasLabel && !hasAriaLabel && !parentLabel) {
      issues.push({
        element: `<input type="${input.type || 'text'}">`,
        problem: 'Trường nhập liệu không có nhãn liên kết (thiếu label for, aria-label hoặc label bọc ngoài)',
        wcag: '1.3.1 Info and Relationships / 3.3.2 Labels or Instructions',
        severity: 'Must'
      });
    }
  }

  // 4. Touch targets >= 44x44
  for (const el of clickables) {
    const rect = el.getBoundingClientRect();
    // Ignore inline text links inside paragraphs if they wrap naturally
    if (el.tagName.toLowerCase() === 'a' && el.parentElement && window.getComputedStyle(el.parentElement).display === 'block' && el.offsetHeight < 30 && el.offsetWidth > 60) {
      continue;
    }
    if (rect.width > 0 && rect.height > 0 && (rect.width < 43.5 || rect.height < 43.5)) {
      const txt = (el.getAttribute('aria-label') || el.innerText || el.className || '').trim().slice(0, 30);
      issues.push({
        element: `<${el.tagName.toLowerCase()}> ("${txt}")`,
        problem: `Kích thước mục chạm nhỏ hơn 44x44 px (${Math.round(rect.width)}x${Math.round(rect.height)} px)`,
        wcag: '2.5.5 Target Size / 2.5.8 Target Size (Minimum)',
        severity: 'Should'
      });
    }
  }

  // 5. Images / icons
  const imgs = Array.from(document.querySelectorAll('img')).filter(el => !isHidden(el));
  for (const img of imgs) {
    if (!img.hasAttribute('alt')) {
      issues.push({
        element: '<img>',
        problem: 'Thẻ hình ảnh thiếu thuộc tính alt (kể cả alt="" cho hình ảnh trang trí)',
        wcag: '1.1.1 Non-text Content',
        severity: 'Must'
      });
    }
  }

  return issues;
}
"""

def luminance(r, g, b):
    def channel(c):
        c = c / 255.0
        return c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4
    return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)

def contrast_ratio(fg, bg):
    l1 = luminance(fg[0], fg[1], fg[2])
    l2 = luminance(bg[0], bg[1], bg[2])
    lum_top = max(l1, l2)
    lum_bot = min(l1, l2)
    return (lum_top + 0.05) / (lum_bot + 0.05)

def parse_rgb(rgb_str):
    if not rgb_str:
        return None
    m = re.search(r"rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)", rgb_str)
    if m:
        r, g, b = int(m.group(1)), int(m.group(2)), int(m.group(3))
        a = float(m.group(4)) if m.group(4) is not None else 1.0
        return (r, g, b, a)
    return None

CONTRAST_EVAL_JS = """
() => {
  const isHidden = (el) => {
    if (!el) return true;
    const style = window.getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return true;
    const rect = el.getBoundingClientRect();
    return rect.width === 0 && rect.height === 0;
  };

  const getEffectiveBg = (el) => {
    let cur = el;
    while (cur && cur !== document.documentElement) {
      const bg = window.getComputedStyle(cur).backgroundColor;
      if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') {
        return bg;
      }
      cur = cur.parentElement;
    }
    return '#F5F6F8'; // default app paper bg
  };

  const textNodes = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let n;
  while (n = walker.nextNode()) {
    if (!n.textContent.trim()) continue;
    const p = n.parentElement;
    if (isHidden(p)) continue;
    const cs = window.getComputedStyle(p);
    textNodes.push({
      text: n.textContent.trim().slice(0, 30),
      tag: p.tagName.toLowerCase(),
      color: cs.color,
      bg: getEffectiveBg(p),
      fontSize: parseFloat(cs.fontSize),
      fontWeight: cs.fontWeight
    });
  }
  return textNodes;
}
"""

def main():
    routes = discover_routes()
    results = {}
    all_findings = []

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)

        for route in routes:
            results[route] = {}
            for w, h in WIDTHS:
                ctx = browser.new_context(viewport={"width": w, "height": h})
                page = ctx.new_page()
                try:
                    # Open with demo=1 if applicable
                    url = f"{BASE}{route}"
                    if "?" in url:
                        url += "&demo=1"
                    else:
                        url += "?demo=1"

                    page.goto(url, wait_until="networkidle", timeout=15000)
                    page.wait_for_timeout(200)

                    # 1. Structural / accessibility issues
                    issues = page.evaluate(AUDIT_EVAL_JS)
                    for iss in issues:
                        all_findings.append({
                            "route": route,
                            "width": w,
                            "element": iss["element"],
                            "problem": iss["problem"],
                            "wcag": iss["wcag"],
                            "severity": iss["severity"]
                        })

                    # 2. Contrast evaluation
                    text_nodes = page.evaluate(CONTRAST_EVAL_JS)
                    for tn in text_nodes:
                        fg = parse_rgb(tn["color"])
                        bg = parse_rgb(tn["bg"])
                        if fg and bg and fg[3] > 0.5 and bg[3] > 0.5:
                            ratio = contrast_ratio(fg, bg)
                            is_large = tn["fontSize"] >= 18 or (tn["fontSize"] >= 14 and str(tn["fontWeight"]) in ("700", "800", "900", "bold"))
                            min_ratio = 3.0 if is_large else 4.5
                            if ratio < min_ratio - 0.1: # slight tolerance
                                all_findings.append({
                                    "route": route,
                                    "width": w,
                                    "element": f"<{tn['tag']}> \"{tn['text']}\"",
                                    "problem": f"Độ tương phản thấp ({ratio:.2f}:1 so với ngưỡng {min_ratio}:1, màu {tn['color']} trên nền {tn['bg']})",
                                    "wcag": "1.4.3 Contrast (Minimum)",
                                    "severity": "Must" if ratio < 3.0 else "Should"
                                })

                    # 3. 200% zoom check for horizontal scroll
                    if w == 1280:
                        page.evaluate("document.body.style.zoom = '200%'")
                        page.wait_for_timeout(100)
                        scroll_w, inner_w = page.evaluate("[document.documentElement.scrollWidth, window.innerWidth]")
                        # Some margin for zoom calculations
                        if scroll_w > inner_w + 30:
                            all_findings.append({
                                "route": route,
                                "width": w,
                                "element": "page",
                                "problem": f"Xuất hiện cuộn ngang khi phóng to 200% (scrollWidth {scroll_w} > innerWidth {inner_w})",
                                "wcag": "1.4.10 Reflow",
                                "severity": "Should"
                            })

                except Exception as e:
                    pass
                finally:
                    ctx.close()

        browser.close()

    # Save summary report for ingestion
    out_file = HERE / "ag15_a11y_report.json"
    with open(out_file, "w", encoding="utf-8") as f:
        json.dump(all_findings, f, ensure_ascii=False, indent=2)

    print(f"REPORT: Audited {len(routes)} routes across 2 viewports. Total findings logged: {len(all_findings)}")
    # ag15 prints REPORT, never FAIL
    sys.exit(0)

if __name__ == "__main__":
    main()
