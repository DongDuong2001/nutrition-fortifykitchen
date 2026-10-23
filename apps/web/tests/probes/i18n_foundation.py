"""job 15: the English foundation. The flag is OFF, so Cài đặt is Vietnamese for everyone; with it ON it follows the saved language.

- a. flag off, settings language stored "en" (the choice on Cài đặt › Ngôn ngữ that has done nothing since cc-24): /settings is Vietnamese.
- b. flag on (localStorage h1t_english_preview=1, honoured in a demo build only) and language "en": /settings is English, and the
  converted cards (everything but the profile card at the top) have no Vietnamese diacritics left. "Tiếng Việt", the name of the
  language in its own tongue, is allowed. The profile card (name and profile summary, lib/profile) is outside the proof area.
- c. flag on, language "vi": Vietnamese again, with the row value Tiếng Việt.
- d. screenshots of /settings at 390 and 1440 in vi (flag off) and en (flag on) into docs/screenshots/overnight-1023/english/.
Run with: ALIGN_BASE_URL=http://localhost:3182 npm run probe -- tests/probes/i18n_foundation.py
"""
# PROBE_COVERS: app/(app)/(tabs)/settings/** components/settings/settings-home-screen.tsx components/settings/profile-cards.tsx components/settings/sign-out-confirm.tsx components/pwa/install-row.tsx lib/i18n/**
import os
import re
import sys

import _demo  # noqa: F401
from playwright.sync_api import sync_playwright

BASE = os.environ.get("ALIGN_BASE_URL", "http://localhost:3182")
SHOTS = os.path.join(os.path.dirname(__file__), "..", "..", "..", "..", "docs", "screenshots", "overnight-1023", "english")
VIEWPORTS = [(390, 844), (1440, 900)]
PREVIEW_ON = "try { localStorage.setItem('h1t_english_preview', '1'); } catch (e) {}"
PREVIEW_OFF = "try { localStorage.removeItem('h1t_english_preview'); } catch (e) {}"
# The demo account's settings (lib/storage-keys: SETTINGS_STORAGE_KEY with the _demo suffix); loadSettings fills the rest
LANGUAGE = "try { localStorage.setItem('h1t_settings_v1_demo', JSON.stringify({ language: '%s' })); } catch (e) {}"
VIETNAMESE = re.compile("[ăâđêôơưàáạảãằắặẳẵầấậẩẫèéẹẻẽềếệểễìíịỉĩòóọỏõồốộổỗờớợởỡùúụủũừứựửữỳýỵỷỹ]", re.I)

VI_WORDS = ["Cài đặt", "Của bạn", "Mục tiêu mỗi ngày", "Ứng dụng", "Xem lại hướng dẫn", "Có gì mới", "Mẹo trên từng màn hình",
            "Ngôn ngữ", "Nhắc nhở", "Nguồn dữ liệu", "Thêm vào màn hình chính", "Điều khoản dịch vụ", "Chính sách bảo mật",
            "Xem các gói và quyền lợi của tài khoản", "Xem gói", "Vùng nguy hiểm", "Xóa tài khoản", "Có bước xác nhận trước khi xóa"]
EN_WORDS = ["Settings", "Yours", "Daily targets", "App", "Replay the tour", "What's new", "Tips on each screen", "Language",
            "Reminders", "Data sources", "Add to Home Screen", "Terms of service", "Privacy policy",
            "See the plans and what your account gets", "See plans", "Danger zone", "Delete account", "You confirm before anything is deleted"]

problems, notes = [], []


def check(cond, msg):
    (notes if cond else problems).append(("ok: " if cond else "") + msg)


def open_settings(browser, w, h, flag, language):
    ctx = browser.new_context(viewport={"width": w, "height": h}, reduced_motion="reduce")
    ctx.add_init_script(PREVIEW_ON if flag else PREVIEW_OFF)
    ctx.add_init_script(LANGUAGE % language)
    pg = ctx.new_page()
    errors = []
    pg.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
    pg.on("pageerror", lambda e: errors.append(str(e)))
    pg.goto(BASE + "/settings", wait_until="networkidle")
    pg.locator("h1").first.wait_for(state="visible", timeout=10000)
    # The saved locale is read after mount: let it land before reading
    pg.wait_for_function("document.querySelector('h1') && document.querySelector('h1').innerText.length > 0", timeout=5000)
    pg.wait_for_timeout(800)
    return ctx, pg, errors


def texts(pg):
    """Header title, the page body without the profile card (outside the proof area), the Ngôn ngữ and Nhắc nhở rows."""
    return pg.evaluate(
        """() => {
          const main = document.querySelector('main');
          const clone = main.cloneNode(true);
          clone.querySelectorAll('a[href="/settings/profile"]').forEach((n) => n.remove());
          const labels = [...clone.querySelectorAll('[aria-label]')].map((n) => n.getAttribute('aria-label')).join('\\n');
          const row = (href) => { const a = main.querySelector('a[href="' + href + '"]'); return a ? a.innerText : ''; };
          const h1 = document.querySelector('h1');
          return { title: h1.textContent + '\\n' + (h1.getAttribute('title') || ''), body: clone.innerText, labels,
                   language: row('/settings/language'), reminders: row('/settings/notifications') };
        }"""
    )


def run_case(browser, w, h, flag, language, expect_en, shot):
    tag = f"{w}px flag {'on' if flag else 'off'} lang {language}"
    ctx, pg, errors = open_settings(browser, w, h, flag, language)
    t = texts(pg)
    everything = t["title"] + "\n" + t["body"] + "\n" + t["labels"]
    words = EN_WORDS if expect_en else VI_WORDS
    for word in words:
        check(word in everything, f"{tag}: shows '{word}'")
    if expect_en:
        left = VIETNAMESE.findall(everything.replace("Tiếng Việt", ""))
        check(not left, f"{tag}: no Vietnamese diacritics left in the converted cards {left[:8]}")
        check("English" in t["language"], f"{tag}: the Language row says English ({t['language']!r})")
        check(re.search(r"\b(On|Off)\b", t["reminders"]) is not None, f"{tag}: the Reminders row says On or Off ({t['reminders']!r})")
    else:
        for word in EN_WORDS[:3]:
            check(not re.search(r"(^|\n)" + re.escape(word) + r"(\n|$)", t["title"] + "\n" + t["body"]), f"{tag}: no English '{word}'")
        check(re.search(r"Đã (bật|tắt)", t["reminders"]) is not None, f"{tag}: the Nhắc nhở row says Đã bật or Đã tắt ({t['reminders']!r})")
        expected_language = "English" if language == "en" else "Tiếng Việt"
        # Flag off: the value is the saved language's name in its own tongue (it is the stored choice, not the interface language)
        check(expected_language in t["language"], f"{tag}: the Ngôn ngữ row value is {expected_language} ({t['language']!r})")
    check(pg.evaluate("document.documentElement.scrollWidth <= document.documentElement.clientWidth"), f"{tag}: no sideways scroll")
    check(not errors, f"{tag}: no console errors {errors[:2]}")
    if shot:
        os.makedirs(SHOTS, exist_ok=True)
        pg.screenshot(path=os.path.join(SHOTS, shot), full_page=True)
    ctx.close()


def main():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        for w, h in VIEWPORTS:
            try:
                # a. flag off, language en stored -> Vietnamese
                run_case(browser, w, h, False, "en", False, f"vi-{w}.png")
                # b. flag on, language en -> English
                run_case(browser, w, h, True, "en", True, f"en-{w}.png")
                # c. flag on, language vi -> Vietnamese
                run_case(browser, w, h, True, "vi", False, None)
            except Exception as e:  # noqa: BLE001
                problems.append(f"{w}px: {e}")
        browser.close()
    for n in notes:
        print(n)
    for q in problems:
        print("FAIL: " + q, file=sys.stderr)
    if problems:
        sys.exit(1)
    print("ALL OK")


if __name__ == "__main__":
    main()
