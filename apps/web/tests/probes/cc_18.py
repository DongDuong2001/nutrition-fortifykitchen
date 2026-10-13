"""cc-18: account and password sign-in (MOCK in localStorage, see lib/auth-actions.ts).

Sign-in and sign-up: validation messages sit under their fields; a wrong password gives the one generic message; the
show/hide button is 44 px; Google stays above the password form and the magic link below it; sign-up with a password
reaches /setup/profile. Account (/settings/account): a name over 40 characters is refused, a name saves on Enter and
shows on Cài đặt; the password change checks the current password, then goes back with its toast; Đăng xuất reaches
/signin; the new password signs in; forgot password and reset password reach their success state. Routes: the pushed
screens have the shared header, the auth screens have none. Runs at 390 and 1280 with a fresh browser each time.
Screenshots: .screenshots/cc-18-<screen>-<width>.png
Run with: ALIGN_BASE_URL=http://localhost:3101 npm run probe -- tests/probes/cc_18.py
"""
import os
import sys
import time

from playwright.sync_api import sync_playwright

BASE = os.environ.get("ALIGN_BASE_URL", "http://localhost:3101")
SHOTS = os.path.join(os.path.dirname(__file__), "..", "..", ".screenshots")
PHONE = {"width": 390, "height": 844}
DESKTOP = {"width": 1280, "height": 900}
SAMPLE_EMAIL = "ban@email.com"
PASSWORD = "abcdef12"
NEW_PASSWORD = "abcdef34"
RESET_PASSWORD = "abcdef56"
TOO_LONG_NAME = "x" * 41
NAME = "Thảo Nguyên"

problems = []
notes = []


def check(cond, msg):
    if cond:
        notes.append("ok: " + msg)
    else:
        problems.append(msg)


def has_header(pg):
    return pg.locator("header").count() > 0


def text_visible(pg, text, timeout=4000):
    try:
        pg.get_by_text(text, exact=False).first.wait_for(state="visible", timeout=timeout)
        return True
    except Exception:
        return False


def no_horizontal_scroll(pg, label):
    overflow = pg.evaluate("() => document.documentElement.scrollWidth - document.documentElement.clientWidth")
    check(overflow <= 0, f"{label}: no horizontal scroll (overflow {overflow})")


def min_target(locator, label, minimum=44):
    box = locator.bounding_box()
    check(box is not None and box["height"] >= minimum and box["width"] >= minimum, f"{label}: tap target at least {minimum} px ({box})")


def go(pg, path):
    pg.goto(BASE + path, wait_until="networkidle")


def check_single_form(pg, width, path, primary):
    # One form per auth screen: one email field, one "hoặc" divider, one primary (blue) button
    check(pg.locator('input[type="email"]').count() == 1, f"{width} {path}: exactly one email input")
    check(pg.get_by_text("hoặc", exact=True).count() == 1, f"{width} {path}: exactly one divider hoặc")
    primaries = pg.locator("button.bg-blue")
    check(
        primaries.count() == 1 and primaries.first.inner_text().strip() == primary,
        f"{width} {path}: one primary button, {primary} ({primaries.count()} found)",
    )


def magic_link_from_signin(browser, width, size):
    # The quiet button sends the liên kết to the typed email; the password field is ignored, and an empty email is refused
    context = browser.new_context(viewport=size)
    pg = context.new_page()
    go(pg, "/signin")
    email_input(pg).fill("cc18-magic@example.com")
    pg.locator('input[autocomplete="current-password"]').fill("x")
    pg.get_by_role("button", name="Gửi liên kết đăng nhập qua email").click()
    pg.wait_for_url("**/signin/check-email", timeout=8000)
    check(text_visible(pg, "Đã gửi liên kết đăng nhập tới", 4000), f"{width} quiet button: check-email says liên kết was sent")
    check(text_visible(pg, "cc18-magic@example.com", 2000), f"{width} quiet button: sent to the typed email")
    go(pg, "/signin")
    email_input(pg).fill("")  # the last email is kept as the pending one, so clear it first
    pg.get_by_role("button", name="Gửi liên kết đăng nhập qua email").click()
    check(text_visible(pg, "Nhập email hợp lệ, ví dụ ban@email.com", 2000), f"{width} quiet button: an empty email shows the email message")
    context.close()


def submit(pg, label):
    pg.get_by_role("button", name=label, exact=True).click()


def email_input(pg):
    return pg.locator('input[type="email"]').first


def shot(pg, screen, width):
    pg.screenshot(path=os.path.join(SHOTS, f"cc-18-{screen}-{width}.png"), full_page=True, animations="disabled")


def sign_in_checks(pg, width):
    go(pg, "/signin")
    check(not has_header(pg), f"{width} /signin: no header")
    google_y = pg.get_by_role("button", name="Tiếp tục với Google").bounding_box()["y"]
    email_y = email_input(pg).bounding_box()["y"]
    magic_y = pg.get_by_role("button", name="Gửi liên kết đăng nhập qua email").bounding_box()["y"]
    check(google_y < email_y < magic_y, f"{width} /signin: Google above the form, the quiet liên kết button below it")
    check_single_form(pg, width, "/signin", "Đăng nhập")
    check(pg.locator('input[autocomplete="current-password"]').count() == 1, f"{width} /signin: password field has autocomplete current-password")
    check(pg.get_by_role("link", name="Quên mật khẩu?").count() == 1, f"{width} /signin: Quên mật khẩu? link")
    min_target(pg.get_by_role("link", name="Quên mật khẩu?"), f"{width} /signin: Quên mật khẩu? link")
    shot(pg, "signin", width)

    submit(pg, "Đăng nhập")
    check(text_visible(pg, "Nhập email hợp lệ, ví dụ ban@email.com", 2000), f"{width} /signin: empty email shows the email message")
    check(text_visible(pg, "Nhập mật khẩu", 2000), f"{width} /signin: empty password shows Nhập mật khẩu")

    email_input(pg).fill(SAMPLE_EMAIL)
    pg.locator('input[autocomplete="current-password"]').fill("wrong1234")
    toggle = pg.get_by_role("button", name="Hiện mật khẩu")
    min_target(toggle, f"{width} /signin: show password button")
    toggle.click()
    check(pg.get_by_role("button", name="Ẩn mật khẩu").count() == 1, f"{width} /signin: toggle now reads Ẩn mật khẩu")
    check(pg.locator('input[type="text"][autocomplete="current-password"]').count() == 1, f"{width} /signin: password shown as text")
    submit(pg, "Đăng nhập")
    check(text_visible(pg, "Email hoặc mật khẩu không đúng", 3000), f"{width} /signin: wrong password shows the generic message")
    no_horizontal_scroll(pg, f"{width} /signin")


def sign_up(pg, width, email):
    go(pg, "/signup")
    check(not has_header(pg), f"{width} /signup: no header")
    check_single_form(pg, width, "/signup", "Đăng ký")
    passwords = pg.locator('input[autocomplete="new-password"]')
    email_input(pg).fill(email)
    passwords.nth(0).fill("abc")
    passwords.nth(1).fill("abc")
    submit(pg, "Đăng ký")
    check(text_visible(pg, "Mật khẩu cần ít nhất 8 ký tự", 2000), f"{width} /signup: short password message")
    shot(pg, "signup", width)

    passwords.nth(0).fill("abcdefgh")
    submit(pg, "Đăng ký")
    check(text_visible(pg, "Mật khẩu cần có ít nhất một chữ và một số", 2000), f"{width} /signup: letter and digit message")

    passwords.nth(0).fill(PASSWORD)
    passwords.nth(1).fill("abcdef13")
    submit(pg, "Đăng ký")
    check(text_visible(pg, "Mật khẩu nhập lại chưa khớp", 2000), f"{width} /signup: mismatch message")

    passwords.nth(1).fill(PASSWORD)
    submit(pg, "Đăng ký")
    pg.wait_for_url("**/setup/profile", timeout=8000)
    check("/setup/profile" in pg.url, f"{width} /signup: a password sign-up reaches /setup/profile")


def account_checks(pg, width, email):
    go(pg, "/settings/account")
    check(has_header(pg), f"{width} /settings/account: shared header")
    check(text_visible(pg, email, 4000), f"{width} /settings/account: email shows (read only)")
    check(pg.get_by_role("button", name="Đổi mật khẩu").count() + pg.get_by_role("link", name="Đổi mật khẩu").count() == 1, f"{width} /settings/account: Đổi mật khẩu row (account has a password)")
    shot(pg, "account", width)

    name = pg.locator("#account-display-name")
    name.fill(TOO_LONG_NAME)
    name.press("Enter")
    check(text_visible(pg, "Tên hiển thị tối đa 40 ký tự", 2000), f"{width} /settings/account: a 41-character name shows the limit")
    name.fill(NAME)
    name.press("Enter")
    go(pg, "/settings")
    check(text_visible(pg, NAME, 4000), f"{width} /settings: the name shows as the profile card title")
    check(text_visible(pg, email, 4000), f"{width} /settings: Tài khoản row shows the email")
    no_horizontal_scroll(pg, f"{width} /settings")


def password_change(pg, width):
    go(pg, "/settings/account/password")
    check(has_header(pg), f"{width} /settings/account/password: shared header")
    current = pg.locator('input[autocomplete="current-password"]')
    passwords = pg.locator('input[autocomplete="new-password"]')
    current.fill("wrong1234")
    passwords.nth(0).fill(NEW_PASSWORD)
    passwords.nth(1).fill(NEW_PASSWORD)
    submit(pg, "Lưu mật khẩu")
    check(text_visible(pg, "Mật khẩu hiện tại không đúng", 2000), f"{width} password: wrong current password message")
    shot(pg, "password", width)

    current.fill(PASSWORD)
    submit(pg, "Lưu mật khẩu")
    pg.wait_for_url(BASE + "/settings/account", timeout=8000)
    check(text_visible(pg, "Đã đổi mật khẩu", 4000), f"{width} password: success toast Đã đổi mật khẩu")


def sign_out_and_back_in(pg, width, email):
    pg.get_by_role("button", name="Đăng xuất", exact=True).click()
    pg.wait_for_url("**/signin", timeout=8000)
    check(not has_header(pg), f"{width} Đăng xuất reaches /signin with no header")

    email_input(pg).fill(email)
    pg.locator('input[autocomplete="current-password"]').fill(NEW_PASSWORD)
    submit(pg, "Đăng nhập")
    pg.wait_for_url(BASE + "/", timeout=8000)
    check(True, f"{width} the new password signs in")


def reset_flow(pg, width):
    go(pg, "/signin/forgot")
    check(not has_header(pg), f"{width} /signin/forgot: no header")
    email_input(pg).fill(SAMPLE_EMAIL)
    submit(pg, "Gửi liên kết đặt lại")
    check(text_visible(pg, "Kiểm tra email để đặt lại mật khẩu", 3000), f"{width} forgot: Kiểm tra email message")
    shot(pg, "forgot", width)

    go(pg, "/reset-password")
    check(not has_header(pg), f"{width} /reset-password: no header")
    passwords = pg.locator('input[autocomplete="new-password"]')
    passwords.nth(0).fill(RESET_PASSWORD)
    passwords.nth(1).fill(RESET_PASSWORD)
    submit(pg, "Đặt lại mật khẩu")
    pg.wait_for_url(BASE + "/signin", timeout=8000)
    check(text_visible(pg, "Đã đặt lại mật khẩu", 4000), f"{width} reset: toast Đã đặt lại mật khẩu on /signin")
    shot(pg, "reset", width)


def run_width(browser, width, size):
    context = browser.new_context(viewport=size)
    pg = context.new_page()
    errors = []
    pg.on("console", lambda msg: errors.append(msg.text) if msg.type == "error" else None)
    email = f"cc18-{int(time.time() * 1000)}@example.com"
    try:
        magic_link_from_signin(browser, width, size)
        sign_in_checks(pg, width)
        sign_up(pg, width, email)
        account_checks(pg, width, email)
        password_change(pg, width)
        sign_out_and_back_in(pg, width, email)
        reset_flow(pg, width)
    except Exception as error:  # a timeout means a step never reached its state
        problems.append(f"{width}: flow stopped: {str(error).splitlines()[0]}")
    check(not errors, f"{width}: no console errors ({errors[:2]})")
    context.close()


def main():
    os.makedirs(SHOTS, exist_ok=True)
    with sync_playwright() as p:
        browser = p.chromium.launch()
        run_width(browser, "390", PHONE)
        run_width(browser, "1280", DESKTOP)
        browser.close()

    for line in notes:
        print(line)
    for line in problems:
        print("[FAIL] " + line)
    print(f"cc-18: {len(notes)} ok, {len(problems)} FAIL")
    sys.exit(1 if problems else 0)


if __name__ == "__main__":
    main()
