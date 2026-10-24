"""Job H2: every courses screen beside its design board (design/courses), as one PNG each: board on the left, the app on the right.

Needs the screenshots courses.py and courses_upload.py wrote (.screenshots/courses/390-*.png), so run that first. The boards are drawn by _dc_render.py (the design
tool's runtime is not in the folder). Output: .screenshots/courses/compare/<n>-<name>.png. No server needed: it reads files only.
Not part of probe:all (it needs the screenshots of courses.py and courses_upload.py and the design folder; the underscore keeps run_all away). Run with: npm run probe -- tests/probes/_courses_boards.py
"""
# PROBE_COVERS:
import base64
import sys
from pathlib import Path

import _dc_render
from playwright.sync_api import sync_playwright

SHOTS = Path(__file__).resolve().parent.parent.parent / ".screenshots" / "courses"
OUT = SHOTS / "compare"
OUT.mkdir(parents=True, exist_ok=True)

# (file name, board, board props, the app's screenshot, caption)
PAIRS = [
    ("1-explore", "Explore", "", "390-1-explore.png", "Khám phá: chip Tài liệu và mục Tài liệu"),
    ("2-library", "Main", "", "390-2-library.png", "Thư viện khóa học"),
    ("3-code-sheet", "CodeSheet", "", "390-3-code-sheet.png", "Nhập mã khóa"),
    ("4-code-error", "CodeError", "", "390-3-code-error.png", "Mã sai"),
    ("5-course", "Course", "", "390-4-course.png", "Một khóa: danh sách bài"),
    ("6-reader-top", "Reader", "view=top", "390-5-reader.png", "Một bài PDF, đầu bài"),
    ("7-reader-end", "Reader", "view=end", "390-7-reader-end.png", "Một bài PDF, cuối bài"),
    ("8-coach-course", "CoachCourse", "", "390-c6-coach-course.png", "HLV: sửa khóa"),
    ("9-add-lesson", "AddLesson", "state=picked", "390-c3-add-lesson.png", "HLV: thêm bài từ PDF"),
    ("10-add-lesson-converting", "AddLesson", "state=converting", "390-c4-converting.png", "HLV: đang chuyển trang"),
]

HTML = """<body style="margin:0;background:#d8d8de;font-family:system-ui;display:flex;gap:24px;padding:16px;align-items:flex-start">
<figure style="margin:0"><figcaption style="font-size:14px;margin:0 0 8px">Design board · {caption}</figcaption><img style="width:390px;display:block" src="data:image/png;base64,{a}"></figure>
<figure style="margin:0"><figcaption style="font-size:14px;margin:0 0 8px">The app · {caption}</figcaption><img style="width:390px;display:block" src="data:image/png;base64,{b}"></figure></body>"""

missing = []
with sync_playwright() as p:
    b = p.chromium.launch()
    for name, board, query, shot, caption in PAIRS:
        app = SHOTS / shot
        if not app.exists():
            missing.append(shot)
            continue
        png = _dc_render.render_board(b, board, query)
        (OUT / f"{name}-board.png").write_bytes(png)
        ctx = b.new_context(viewport={"width": 860, "height": 1760}, device_scale_factor=1)
        pg = ctx.new_page()
        pg.set_content(HTML.format(caption=caption, a=base64.b64encode(png).decode(), b=base64.b64encode(app.read_bytes()).decode()))
        pg.wait_for_timeout(300)
        pg.screenshot(path=str(OUT / f"{name}.png"), full_page=True)
        ctx.close()
        print("[done] " + name)
    b.close()
if missing:
    print("missing app screenshots (run courses.py and courses_upload.py first): " + ", ".join(missing))
    sys.exit(1)
