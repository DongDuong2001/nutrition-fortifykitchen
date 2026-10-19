"""Install pop-up (hotfix/search): ask the phone type, iPhone / Android / in-app steps, snooze and the Settings entry.

All at 390 px (a few checks at 360 and 1440). Needs a production demo build (npm run build:demo) so ?demo works:
- iPhone Safari UA -> the ask view with "Máy của bạn" on iPhone -> the iOS steps -> back -> "Tôi đã cài xong" sets done
- Android UA with a mocked beforeinstallprompt -> "Cài đặt ngay" calls prompt(), then the card is gone;
  without the event the card is hidden and "Tôi đã cài xong" is filled
- Zalo UA -> the in-app view; "Sao chép liên kết" copies https://lehongkhanh.vn and toasts
- standalone (matchMedia stub) -> never; 1440 desktop -> never
- Để sau and Esc: dismissCount + 1 and a 3-day snooze that survives a new tab; an expired snooze shows again; 3 dismissals never
- Cài đặt › Ứng dụng › "Cài ứng dụng lên điện thoại" opens it any time and does not snooze; hidden in standalone
- the pop-up waits for the first-visit tip and for the first-run tour (tour and tips switched on for those checks),
  and shows once the tip is dismissed / the tour is skipped; a tour left halfway blocks it for the day
- 44 px targets, no horizontal scroll at 360 and 390, an h2 per view; screenshots of all four views
Screenshots: .screenshots/install-*.png
Run with: ALIGN_BASE_URL=http://localhost:3101 npm run probe -- tests/probes/install_sheet.py
"""
# PROBE_COVERS: app/(app)/(tabs)/app/** app/(app)/(tabs)/explore/** app/(app)/(tabs)/settings/** app/install/**
import json
import os
import re
import time
from pathlib import Path

from playwright.sync_api import sync_playwright
import _demo  # noqa: F401  (demo mode on, with a saved sample profile)
import _seed

BASE = os.environ.get("ALIGN_BASE_URL", "http://localhost:3101")
SHOTS = Path(__file__).resolve().parent.parent.parent / ".screenshots"
SHOTS.mkdir(exist_ok=True)
SETTINGS_KEY = "h1t_settings_v1_demo"

IPHONE = (
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) "
    "Version/17.4 Mobile/15E148 Safari/604.1"
)
ANDROID = (
    "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/124.0.0.0 Mobile Safari/537.36"
)
ZALO = IPHONE + " Zalo/24.05.1"

# One fake install event, dispatched once after the page has hydrated
FAKE_INSTALL_EVENT = """
window.__prompted = 0;
setTimeout(() => {
  const ev = new Event('beforeinstallprompt', { cancelable: true });
  ev.prompt = () => { window.__prompted += 1; return Promise.resolve(); };
  ev.userChoice = Promise.resolve({ outcome: 'accepted' });
  window.dispatchEvent(ev);
}, 1200);
"""
STANDALONE = """
const real = window.matchMedia.bind(window);
window.matchMedia = (q) => {
  const m = real(q);
  if (/display-mode:\\s*standalone/.test(q)) {
    return { matches: true, media: q, onchange: null, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, dispatchEvent() { return false; } };
  }
  return m;
};
"""

problems = []


def check(cond, msg):
    print(("[PASS] " if cond else "[FAIL] ") + msg)
    if not cond:
        problems.append(msg)


def phone(browser, ua, width=390, script=None, perms=False):
    ctx = browser.new_context(
        viewport={"width": width, "height": 844}, user_agent=ua, is_mobile=True, has_touch=True, device_scale_factor=2
    )
    if perms:
        ctx.grant_permissions(["clipboard-read", "clipboard-write"], origin=BASE)
    if script:
        ctx.add_init_script(script)
    return ctx


def dialog(pg):
    return pg.get_by_role("dialog")


def wait_open(pg, timeout=8000):
    dialog(pg).wait_for(state="visible", timeout=timeout)
    pg.wait_for_timeout(250)


def stays_closed(pg, ms=2500):
    pg.wait_for_timeout(ms)
    return dialog(pg).count() == 0


def heading(pg):
    return re.sub(r"\s+", " ", dialog(pg).locator("h2").first.inner_text()).strip()


def one_h2(pg, where):
    n = dialog(pg).locator("h2").count()
    check(n == 1, f"{where}: one h2 in the dialog ({n})")


def no_h_scroll(pg, where):
    w, inner = pg.evaluate("() => [Math.max(document.documentElement.scrollWidth, document.body.scrollWidth), window.innerWidth]")
    check(w <= inner, f"{where}: no horizontal scroll ({w} <= {inner})")
    dw = dialog(pg).evaluate("el => [el.scrollWidth, el.clientWidth]")
    check(dw[0] <= dw[1], f"{where}: the sheet itself does not scroll sideways ({dw})")


def targets(pg, where):
    bad = dialog(pg).evaluate(
        """el => [...el.querySelectorAll('a[href], button')]
            .filter(e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && (r.height < 43.5 || r.width < 43.5); })
            .map(e => (e.getAttribute('aria-label') || e.textContent || e.tagName).trim().slice(0, 30))"""
    )
    check(not bad, f"{where}: every button is at least 44 px ({bad})")


def shot(pg, name):
    pg.screenshot(path=str(SHOTS / f"install-{name}.png"), animations="disabled")


def settings(pg):
    raw = pg.evaluate(f"() => localStorage.getItem('{SETTINGS_KEY}')")
    return (json.loads(raw) if raw else {}).get("installPrompt", {})


def put_prompt(pg, prompt):
    pg.evaluate(
        f"""p => {{
          const raw = localStorage.getItem('{SETTINGS_KEY}');
          const s = raw ? JSON.parse(raw) : {{}};
          s.installPrompt = p;
          localStorage.setItem('{SETTINGS_KEY}', JSON.stringify(s));
        }}""",
        prompt,
    )


def is_filled(btn):
    return "bg-blue" in (btn.get_attribute("class") or "")


def iphone_flow(browser):
    ctx = phone(browser, IPHONE)
    pg = ctx.new_page()
    pg.goto(BASE + "/app", wait_until="networkidle")
    wait_open(pg)
    check(heading(pg) == "CÀI H1T MICRO VÀO MÁY CỦA BẠN", f"iPhone: ask view title ({heading(pg)})")
    one_h2(pg, "ask")
    check(dialog(pg).get_by_text("Như một ứng dụng thật, chỉ mất 20 giây.").count() == 1, "ask: sub line")
    for t in ["Mở bằng 1 chạm từ màn hình chính", "Toàn màn hình, không còn thanh trình duyệt", "Không cần App Store hay CH Play", "BẠN ĐANG DÙNG ĐIỆN THOẠI NÀO?"]:
        check(dialog(pg).get_by_text(t, exact=False).count() >= 1 or dialog(pg).get_by_text(t.capitalize(), exact=False).count() >= 1, f"ask: '{t}'")
    iph = dialog(pg).get_by_role("button", name=re.compile("iPhone"))
    andr = dialog(pg).get_by_role("button", name=re.compile("Android"))
    check("Máy của bạn" in iph.inner_text(), "ask: iPhone card carries 'Máy của bạn'")
    check("Máy của bạn" not in andr.inner_text(), "ask: Android card does not")
    check("border-blue" in (iph.get_attribute("class") or ""), "ask: the detected card has the cobalt border")
    box = iph.bounding_box()
    check(box["height"] >= 76, f"ask: choice card min-height 76 ({box['height']})")
    check(dialog(pg).locator("img[src='/icons/icon-512.png']").count() == 1, "ask: app icon")
    targets(pg, "ask")
    no_h_scroll(pg, "ask 390")
    shot(pg, "ask")
    iph.click()
    pg.wait_for_timeout(200)
    check(heading(pg) == "CÀI TRÊN IPHONE", f"ios: title ({heading(pg)})")
    one_h2(pg, "ios")
    for t in [
        "Chạm nút ••• ở thanh dưới của Safari",
        "Chạm Chia sẻ",
        "Kéo xuống, chọn Thêm vào MH chính",
        "Không thấy? Chạm Xem thêm ở cuối danh sách.",
        "Chạm Thêm ở góc trên bên phải",
        "Biểu tượng H1T MICRO sẽ nằm trên màn hình chính.",
        "iOS 18 trở về trước: nút Chia sẻ nằm ngay trên thanh dưới, bỏ qua bước 1.",
        "Tôi đã cài xong",
        "Để sau",
    ]:
        check(dialog(pg).get_by_text(t, exact=True).count() >= 1, f"ios: '{t}'")
    check(dialog(pg).get_by_label("Quay lại chọn loại máy").count() == 1 and dialog(pg).get_by_label("Đóng").count() == 1, "ios: back and close buttons")
    hidden = dialog(pg).evaluate("el => [...el.querySelectorAll('[aria-hidden=true]')].some(e => e.textContent.includes('lehongkhanh.vn'))")
    check(hidden, "ios: the mini Safari bar is aria-hidden")
    targets(pg, "ios")
    no_h_scroll(pg, "ios 390")
    shot(pg, "ios")
    dialog(pg).get_by_label("Quay lại chọn loại máy").click()
    pg.wait_for_timeout(200)
    check(heading(pg) == "CÀI H1T MICRO VÀO MÁY CỦA BẠN", "ios: back returns to the ask view")
    dialog(pg).get_by_role("button", name=re.compile("iPhone")).click()
    dialog(pg).get_by_role("button", name="Tôi đã cài xong").click()
    pg.wait_for_timeout(300)
    check(dialog(pg).count() == 0, "ios: Tôi đã cài xong closes the sheet")
    st = settings(pg)
    check(st.get("done") is True and st.get("dismissCount", 0) == 0, f"ios: done is saved, no dismissal ({st})")
    pg2 = ctx.new_page()
    pg2.goto(BASE + "/app", wait_until="networkidle")
    check(stays_closed(pg2), "iPhone: done -> never opens again")
    ctx.close()


def android_flow(browser):
    ctx = phone(browser, ANDROID, script=FAKE_INSTALL_EVENT)
    pg = ctx.new_page()
    pg.goto(BASE + "/app", wait_until="networkidle")
    wait_open(pg)
    pg.wait_for_timeout(1500)  # the fake event arrives at 1.2 s
    check("Máy của bạn" in dialog(pg).get_by_role("button", name=re.compile("Android")).inner_text(), "Android: 'Máy của bạn' on Android")
    dialog(pg).get_by_role("button", name=re.compile("Android")).click()
    pg.wait_for_timeout(200)
    check(heading(pg) == "CÀI TRÊN ANDROID", f"android: title ({heading(pg)})")
    one_h2(pg, "android")
    install = dialog(pg).get_by_role("button", name="Cài đặt ngay")
    check(install.count() == 1, "android: 'Cài đặt ngay' is there with the install event")
    for t in ["CÁCH NHANH NHẤT", "HOẶC LÀM TRONG CHROME"]:
        check(dialog(pg).get_by_text(t, exact=False).count() >= 1, f"android: '{t}' label")
    for t in [
        "Điện thoại sẽ hỏi lại một lần, chọn Cài đặt.",
        "Chạm nút ⋮ ở góc trên bên phải",
        "Chọn Cài đặt ứng dụng",
        "Máy cũ ghi Thêm vào màn hình chính.",
        "Chạm Cài đặt",
        "Samsung Internet: chạm ≡ › Thêm trang vào › Màn hình chính.",
    ]:
        check(dialog(pg).get_by_text(t, exact=True).count() >= 1, f"android: '{t}'")
    done_btn = dialog(pg).get_by_role("button", name="Tôi đã cài xong")
    check(not is_filled(done_btn), "android: with the card, 'Tôi đã cài xong' is an outline button")
    targets(pg, "android + card")
    no_h_scroll(pg, "android 390")
    shot(pg, "android")
    install.click()
    pg.wait_for_timeout(400)
    check(pg.evaluate("() => window.__prompted") == 1, "android: 'Cài đặt ngay' calls prompt() once")
    check(dialog(pg).get_by_role("button", name="Cài đặt ngay").count() == 0, "android: the card goes once the event is used")
    check(is_filled(dialog(pg).get_by_role("button", name="Tôi đã cài xong")), "android: after that, 'Tôi đã cài xong' is filled")
    ctx.close()

    ctx = phone(browser, ANDROID)
    pg = ctx.new_page()
    pg.goto(BASE + "/app", wait_until="networkidle")
    wait_open(pg)
    dialog(pg).get_by_role("button", name=re.compile("Android")).click()
    pg.wait_for_timeout(200)
    check(dialog(pg).get_by_role("button", name="Cài đặt ngay").count() == 0, "android, no event: the card is hidden")
    check(dialog(pg).get_by_text("HOẶC LÀM TRONG CHROME", exact=False).count() == 0, "android, no event: no 'hoặc' label")
    check(is_filled(dialog(pg).get_by_role("button", name="Tôi đã cài xong")), "android, no event: 'Tôi đã cài xong' is filled")
    targets(pg, "android no card")
    shot(pg, "android-no-event")
    ctx.close()


def inapp_flow(browser):
    ctx = phone(browser, ZALO, perms=True)
    pg = ctx.new_page()
    pg.goto(BASE + "/app", wait_until="networkidle")
    wait_open(pg)
    check(heading(pg) == "MỞ BẰNG TRÌNH DUYỆT TRƯỚC", f"in-app: Zalo opens on the in-app view ({heading(pg)})")
    one_h2(pg, "inapp")
    txt = re.sub(r"\s+", " ", dialog(pg).inner_text())
    check("Bạn đang mở H1T MICRO trong Zalo. Ứng dụng chỉ cài được từ Safari (iPhone) hoặc Chrome (Android)." in txt, "in-app: names Zalo")
    for t in ["Chạm nút ••• ở góc trên bên phải", "Chọn Mở bằng trình duyệt", "Hướng dẫn cài đặt sẽ hiện lại trong trình duyệt", "Rồi dán lehongkhanh.vn vào Safari hoặc Chrome."]:
        check(t in txt, f"in-app: '{t}'")
    targets(pg, "inapp")
    no_h_scroll(pg, "inapp 390")
    shot(pg, "inapp")
    dialog(pg).get_by_role("button", name="Sao chép liên kết").click()
    pg.wait_for_timeout(400)
    check(pg.get_by_text("Đã sao chép liên kết").count() >= 1, "in-app: toast 'Đã sao chép liên kết'")
    clip = pg.evaluate("() => navigator.clipboard.readText()")
    check(clip == "https://lehongkhanh.vn/?install=1", f"in-app: the clipboard holds the link ({clip})")
    ctx.close()
    for name, ua in [("Facebook", IPHONE + " [FBAN/FBIOS;FBAV/450.0]"), ("Instagram", IPHONE + " Instagram 330.0"), ("TikTok", ANDROID + " musical_ly_32.5")]:
        c = phone(browser, ua)
        p = c.new_page()
        p.goto(BASE + "/app", wait_until="networkidle")
        wait_open(p)
        check(f"trong {name}." in dialog(p).inner_text(), f"in-app: {name} is named")
        c.close()


def never_flow(browser):
    ctx = phone(browser, IPHONE, script=STANDALONE)
    pg = ctx.new_page()
    pg.goto(BASE + "/app", wait_until="networkidle")
    check(stays_closed(pg), "standalone: the pop-up never opens")
    pg.goto(BASE + "/settings", wait_until="networkidle")
    pg.wait_for_timeout(600)
    check(pg.get_by_text("Cài ứng dụng lên điện thoại").count() == 0, "standalone: the Settings row is hidden")
    ctx.close()

    ctx = browser.new_context(viewport={"width": 1440, "height": 900})
    pg = ctx.new_page()
    pg.goto(BASE + "/app", wait_until="networkidle")
    check(stays_closed(pg), "desktop 1440: the pop-up never opens")
    ctx.close()

    # a phone with a wide tablet-sized viewport is not a "touch phone"
    ctx = phone(browser, IPHONE, width=1024)
    pg = ctx.new_page()
    pg.goto(BASE + "/app", wait_until="networkidle")
    check(stays_closed(pg), "1024 px touch: no pop-up (a phone is under 1024)")
    ctx.close()

    # another route
    ctx = phone(browser, IPHONE)
    pg = ctx.new_page()
    pg.goto(BASE + "/explore", wait_until="networkidle")
    check(stays_closed(pg), "/explore: the pop-up only opens on Hôm nay")
    ctx.close()


def snooze_flow(browser):
    ctx = phone(browser, IPHONE)
    pg = ctx.new_page()
    pg.goto(BASE + "/app", wait_until="networkidle")
    wait_open(pg)
    before = time.time() * 1000
    dialog(pg).get_by_role("button", name="Để sau").click()
    pg.wait_for_timeout(300)
    check(dialog(pg).count() == 0, "Để sau: closes")
    st = settings(pg)
    three_days = 3 * 24 * 3600 * 1000
    check(st.get("dismissCount") == 1 and before + three_days - 5000 <= st.get("snoozeUntil", 0) <= time.time() * 1000 + three_days + 5000, f"Để sau: dismissCount 1 and snooze 3 days ({st})")
    pg.reload(wait_until="networkidle")
    check(stays_closed(pg), "Để sau: a reload does not bring it back")
    pg2 = ctx.new_page()
    pg2.goto(BASE + "/app", wait_until="networkidle")
    check(stays_closed(pg2), "Để sau: a new tab (new session) is blocked by the snooze")

    # snooze over, two dismissals so far: it shows again, Esc counts as a dismissal
    put_prompt(pg2, {"dismissCount": 2, "snoozeUntil": int(time.time() * 1000) - 1000, "done": False, "firstSeenIso": "2026-01-01"})
    pg3 = ctx.new_page()
    pg3.goto(BASE + "/app", wait_until="networkidle")
    wait_open(pg3)
    check(True, "snooze over: it shows again")
    pg3.keyboard.press("Escape")
    pg3.wait_for_timeout(300)
    check(dialog(pg3).count() == 0, "Esc closes")
    st = settings(pg3)
    check(st.get("dismissCount") == 3, f"Esc is a dismissal (dismissCount {st.get('dismissCount')})")

    # three dismissals: never again, even with the snooze over
    put_prompt(pg3, {"dismissCount": 3, "snoozeUntil": 0, "done": False, "firstSeenIso": "2026-01-01"})
    pg4 = ctx.new_page()
    pg4.goto(BASE + "/app", wait_until="networkidle")
    check(stays_closed(pg4), "3 dismissals: never opens by itself again")

    # the close button is a dismissal too
    put_prompt(pg4, {"dismissCount": 0, "snoozeUntil": 0, "done": False, "firstSeenIso": "2026-01-01"})
    pg5 = ctx.new_page()
    pg5.goto(BASE + "/app", wait_until="networkidle")
    wait_open(pg5)
    dialog(pg5).get_by_role("button", name=re.compile("iPhone")).click()
    dialog(pg5).get_by_label("Đóng").click()
    pg5.wait_for_timeout(300)
    check(settings(pg5).get("dismissCount") == 1, "the close button is a dismissal")
    ctx.close()


def settings_flow(browser):
    ctx = phone(browser, IPHONE)
    pg = ctx.new_page()
    pg.goto(BASE + "/settings", wait_until="networkidle")
    pg.wait_for_timeout(500)
    check(dialog(pg).count() == 0, "/settings: no pop-up by itself")
    row = pg.get_by_role("button", name=re.compile("Cài ứng dụng lên điện thoại"))
    check(row.count() == 1, "/settings: the row is there")
    check(row.bounding_box()["height"] >= 44, "/settings: the row is at least 44 px")
    row.click()
    wait_open(pg)
    check(heading(pg) == "CÀI H1T MICRO VÀO MÁY CỦA BẠN", "/settings: the row opens the ask view")
    pg.keyboard.press("Escape")
    pg.wait_for_timeout(300)
    check(dialog(pg).count() == 0, "/settings: Esc closes it")
    check(settings(pg).get("dismissCount", 0) == 0, "/settings: closing from here does not snooze the pop-up")
    check(pg.get_by_role("link", name=re.compile("Thêm vào màn hình chính")).count() == 1, "/settings: the /install link is still there")
    pg.goto(BASE + "/install", wait_until="networkidle")
    check(pg.get_by_text("Chạm Chia sẻ ở thanh dưới Safari").count() == 1, "/install still shows the iPhone steps (shared code)")
    ctx.close()


def install_dialog(pg):
    return pg.get_by_role("dialog").filter(has_text=re.compile("CÀI H1T MICRO|CÀI TRÊN|MỞ BẰNG"))


def put_flags(pg, flags):
    pg.evaluate(
        f"""f => {{
          const raw = localStorage.getItem('{SETTINGS_KEY}');
          const s = raw ? JSON.parse(raw) : {{}};
          s.onboarding = f;
          localStorage.setItem('{SETTINGS_KEY}', JSON.stringify(s));
        }}""",
        flags,
    )


def onboarding_flow(browser):
    _seed.onboarding(True)
    try:
        # a first-visit tip is due on Hôm nay: the pop-up waits, then follows the tip
        ctx = phone(browser, IPHONE)
        pg = ctx.new_page()
        pg.goto(BASE + "/app", wait_until="networkidle")
        pg.get_by_text("Mẹo · lần đầu").wait_for(state="visible", timeout=8000)
        pg.wait_for_timeout(1500)
        check(install_dialog(pg).count() == 0, "tip open: the install pop-up waits")
        pg.get_by_role("button", name="Đã hiểu").click()
        install_dialog(pg).wait_for(state="visible", timeout=8000)
        check(True, "tip dismissed: the install pop-up follows")
        ctx.close()

        # the tour runs: no pop-up; skipping ends it and the pop-up comes
        ctx = phone(browser, IPHONE)
        pg = ctx.new_page()
        put = ctx.new_page()
        put.goto(BASE + "/settings", wait_until="networkidle")
        put_flags(put, {"tipsOff": True})
        put.close()
        pg.goto(BASE + "/settings", wait_until="networkidle")
        pg.get_by_role("button", name=re.compile("Xem lại hướng dẫn")).click()
        pg.get_by_text(re.compile(r"Bước 1/5")).wait_for(state="visible", timeout=8000)
        pg.wait_for_timeout(2000)
        check(install_dialog(pg).count() == 0, "tour running: the install pop-up waits")
        pg.get_by_role("button", name="Bỏ qua hướng dẫn").click()
        install_dialog(pg).wait_for(state="visible", timeout=8000)
        check(True, "tour skipped: the install pop-up follows")
        ctx.close()

        # a tour left halfway: still not finished, so the pop-up stays away for the day
        ctx = phone(browser, IPHONE)
        pg = ctx.new_page()
        pg.goto(BASE + "/settings", wait_until="networkidle")
        put_flags(pg, {"tipsOff": True})
        pg.reload(wait_until="networkidle")
        pg.get_by_role("button", name=re.compile("Xem lại hướng dẫn")).click()
        pg.get_by_text(re.compile(r"Bước 1/5")).wait_for(state="visible", timeout=8000)
        pg.goto(BASE + "/explore", wait_until="networkidle")
        pg.goto(BASE + "/app", wait_until="networkidle")
        check(stays_closed(pg), "tour left halfway: no pop-up that day")
        ctx.close()
    finally:
        _seed.onboarding(False)


def narrow(browser):
    ctx = phone(browser, IPHONE, width=360)
    pg = ctx.new_page()
    pg.goto(BASE + "/app", wait_until="networkidle")
    wait_open(pg)
    no_h_scroll(pg, "ask 360")
    dialog(pg).get_by_role("button", name=re.compile("iPhone")).click()
    no_h_scroll(pg, "ios 360")
    targets(pg, "ios 360")
    ctx.close()


def main():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        for flow in (iphone_flow, android_flow, inapp_flow, never_flow, snooze_flow, settings_flow, onboarding_flow, narrow):
            print(f"-- {flow.__name__}")
            flow(browser)
        browser.close()
    print()
    print(f"{len(problems)} problem(s)")
    for m in problems:
        print("  - " + m)
    raise SystemExit(1 if problems else 0)


if __name__ == "__main__":
    main()
