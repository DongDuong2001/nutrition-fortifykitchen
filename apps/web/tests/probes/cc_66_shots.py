"""cc-66: before/after screenshots of the design-system cleanup, and a pixel diff. REPORT probe (no exit gate).

CC66_SET=before or CC66_SET=after: Hôm nay, + Thêm (/add), the portion panel, Tổng quan, Khám phá, Cài đặt, Mục tiêu and
Có gì mới at 390x844 and 1440x900, clock fixed at 2026-10-20 10:00 Asia/Ho_Chi_Minh, reduced motion (nothing mid-slide),
demo data, into docs/screenshots/cc-66/<set>/<screen>-<width>.png.
CC66_SET=diff: compares each before/after pair in the browser (a pixel differs when a channel moves by more than 8),
writes docs/screenshots/cc-66/diff/<screen>-<width>.png (changed pixels in red over a faded "after") and prints the
share of changed pixels. CC66_TEXT=125: the same set at 125 % text size (the root font-size), into <set>-text125/.
Run with: CC66_SET=before ALIGN_BASE_URL=http://localhost:3101 npm run probe -- tests/probes/cc_66_shots.py
"""
# PROBE_COVERS: app/(app)/(tabs)/app/** app/(app)/(tabs)/explore/** app/(app)/(tabs)/settings/** app/(app)/(tabs)/trends/** app/(app)/add/** app/(app)/settings/targets/** app/(app)/settings/whats-new/**
import base64
import json
import os
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

from playwright.sync_api import sync_playwright
import _demo  # noqa: F401
import _seed  # noqa: F401

BASE = os.environ.get("ALIGN_BASE_URL", "http://localhost:3101")
SET = os.environ.get("CC66_SET", "")
TEXT = os.environ.get("CC66_TEXT", "")
OUT = Path(__file__).resolve().parent.parent.parent.parent.parent / "docs" / "screenshots" / "cc-66"
NOW = datetime(2026, 10, 20, 10, 0, tzinfo=timezone(timedelta(hours=7)))
SETTINGS_KEY = "h1t_settings_v1_demo"
SIZES = [({"width": 390, "height": 844}, "390"), ({"width": 1440, "height": 900}, "1440")]


def first_food(pg):
    pg.locator("[data-add-panel] button[data-food-row]:visible, [role=dialog] button[data-food-row]:visible").first.click()
    pg.wait_for_timeout(700)


SCREENS = [
    ("home", "/app", None),
    ("add", "/add?meal=lunch", None),
    ("portion", "/add?meal=lunch", first_food),
    ("overview", "/trends", None),
    ("explore", "/explore", None),
    ("settings", "/settings", None),
    ("targets", "/settings/targets", None),
    ("whats-new", "/settings/whats-new", None),
]


def capture():
    folder = OUT / (SET + (f"-text{TEXT}" if TEXT else ""))
    folder.mkdir(parents=True, exist_ok=True)
    seed = {"installPrompt": {"dismissCount": 0, "snoozeUntil": 0, "done": True, "firstSeenIso": "2026-01-01"}}
    with sync_playwright() as p:
        browser = p.chromium.launch()
        for size, tag in SIZES:
            ctx = browser.new_context(viewport=size, reduced_motion="reduce", device_scale_factor=1)
            ctx.add_init_script(f"if (localStorage.getItem('{SETTINGS_KEY}') === null) localStorage.setItem('{SETTINGS_KEY}', {json.dumps(json.dumps(seed))});")
            if TEXT:
                # The browser's text size: the root font size (rem sizes follow it, px sizes do not)
                ctx.add_init_script(f"document.addEventListener('DOMContentLoaded', () => {{ document.documentElement.style.fontSize = '{TEXT}%'; }});")
            for name, route, step in SCREENS:
                pg = ctx.new_page()
                pg.clock.set_fixed_time(NOW)
                pg.goto(BASE + route, wait_until="networkidle")
                pg.wait_for_timeout(900)
                if step:
                    step(pg)
                path = folder / f"{name}-{tag}.png"
                pg.screenshot(path=str(path))
                print(f"wrote {path.relative_to(OUT.parent.parent.parent)}")
                pg.close()
            ctx.close()
        browser.close()


DIFF = """async ([a, b]) => {
  const load = async (b64) => { const i = new Image(); i.src = 'data:image/png;base64,' + b64; await i.decode(); return i; };
  const [x, y] = await Promise.all([load(a), load(b)]);
  const W = Math.max(x.naturalWidth, y.naturalWidth), H = Math.max(x.naturalHeight, y.naturalHeight);
  const read = (img) => { const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, W, H); g.drawImage(img, 0, 0); return g.getImageData(0, 0, W, H); };
  const da = read(x).data, db = read(y);
  const out = new ImageData(W, H); let changed = 0;
  for (let i = 0; i < da.length; i += 4) {
    const d = Math.max(Math.abs(da[i] - db.data[i]), Math.abs(da[i + 1] - db.data[i + 1]), Math.abs(da[i + 2] - db.data[i + 2]));
    if (d > 8) { changed++; out.data[i] = 230; out.data[i + 1] = 30; out.data[i + 2] = 30; out.data[i + 3] = 255; }
    else { const v = 255 - (255 - (db.data[i] + db.data[i + 1] + db.data[i + 2]) / 3) * 0.25; out.data[i] = out.data[i + 1] = out.data[i + 2] = v; out.data[i + 3] = 255; }
  }
  const c = document.createElement('canvas'); c.width = W; c.height = H; c.getContext('2d').putImageData(out, 0, 0);
  return { changed, total: W * H, png: c.toDataURL('image/png').split(',')[1], sizeChanged: x.naturalHeight !== y.naturalHeight || x.naturalWidth !== y.naturalWidth };
}"""


def diff():
    before, after, out = OUT / "before", OUT / "after", OUT / "diff"
    out.mkdir(parents=True, exist_ok=True)
    rows = []
    with sync_playwright() as p:
        browser = p.chromium.launch()
        pg = browser.new_page()
        for shot in sorted(before.glob("*.png")):
            other = after / shot.name
            if not other.exists():
                rows.append((shot.stem, None, "no after shot"))
                continue
            r = pg.evaluate(DIFF, [base64.b64encode(shot.read_bytes()).decode(), base64.b64encode(other.read_bytes()).decode()])
            (out / shot.name).write_bytes(base64.b64decode(r["png"]))
            rows.append((shot.stem, 100 * r["changed"] / r["total"], "size changed" if r["sizeChanged"] else ""))
        browser.close()
    print(f"{'screen':<16} changed")
    for name, share, note in rows:
        print(f"{name:<16} {'—' if share is None else f'{share:6.2f} %'}  {note}")


if __name__ == "__main__":
    if SET not in ("before", "after", "diff"):
        print("skipped: set CC66_SET=before, after or diff (probe:all leaves the committed shots alone)")
        sys.exit(0)
    if SET == "diff":
        diff()
    else:
        capture()
    sys.exit(0)
