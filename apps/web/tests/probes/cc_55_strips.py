"""cc-55: joins the frames cc_55_motion.py saved (STRIPS=1) into one strip image per motion, for the PR.

Reads .screenshots/cc55/<NN-name>-<t>ms.png and writes .screenshots/cc55/strip-<NN-name>.png (frames side by side at
195 px wide, the capture time under each). The times are when each capture started; a capture takes a few ms itself.
Run with: npm run probe -- tests/probes/cc_55_strips.py
"""
import base64
import re
from collections import defaultdict
from pathlib import Path

from playwright.sync_api import sync_playwright

SHOTS = Path(__file__).resolve().parent.parent.parent / ".screenshots" / "cc55"


def main():
    groups = defaultdict(list)
    for f in sorted(SHOTS.glob("[0-9][0-9]-*-[0-9][0-9][0-9]ms.png")):
        m = re.match(r"(\d\d-.+)-(\d{3})ms\.png", f.name)
        if m:
            groups[m.group(1)].append((m.group(2), f))
    with sync_playwright() as p:
        browser = p.chromium.launch()
        pg = browser.new_page(viewport={"width": 1600, "height": 600})
        for name, frames in groups.items():
            cells = "".join(
                f'<figure><img src="data:image/png;base64,{base64.b64encode(f.read_bytes()).decode()}"><figcaption>{int(t)} ms</figcaption></figure>' for t, f in frames
            )
            pg.set_content(
                "<style>body{margin:0;background:#111317;font:600 14px sans-serif;color:#fff}"
                "main{display:flex;gap:6px;padding:8px;width:max-content}figure{margin:0}"
                "img{width:195px;display:block;border-radius:6px}figcaption{text-align:center;padding-top:4px}"
                f"h1{{font-size:15px;margin:8px}}</style><h1>{name}</h1><main>{cells}</main>"
            )
            pg.wait_for_timeout(300)
            pg.locator("body").screenshot(path=str(SHOTS / f"strip-{name}.png"))
            print("wrote", f"strip-{name}.png")
        browser.close()


if __name__ == "__main__":
    main()
