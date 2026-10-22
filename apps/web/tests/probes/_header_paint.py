"""A phone tab header is transparent so the page (or a tab's colour wash) shows behind it. A transparent header only passes when the
colour actually painted where the header is equals what belongs there: the grey page, or the page with the tab's wash over it. A
header that went transparent by mistake over something else still fails. Not a probe (run_all skips names that start with "_")."""
import re
import struct
import zlib

PAGE = (242, 242, 247)
# route prefix -> (wash colour, peak alpha) for the tabs that have a wash; the rest are the plain page
WASH = {"/app": ((36, 87, 245), 0.16), "/trends": ((0, 195, 208), 0.18), "/explore": ((255, 141, 40), 0.28)}
WASH_HEIGHT = 240
TRANSPARENT = "rgba(0, 0, 0, 0)"


def _pixel(png: bytes):
    """The RGB of a 1x1 PNG (one scanline, so every filter type leaves the value as it is)."""
    pos, idat = 8, b""
    while pos < len(png):
        (length,) = struct.unpack(">I", png[pos : pos + 4])
        kind = png[pos + 4 : pos + 8]
        if kind == b"IHDR":
            channels = 4 if png[pos + 8 + 9] == 6 else 3
        if kind == b"IDAT":
            idat += png[pos + 8 : pos + 8 + length]
        pos += 12 + length
    raw = zlib.decompress(idat)
    return tuple(raw[1 : 1 + 3]), channels


def expected(route: str, y: float):
    """The page colour at height y of the page's top, with the route's wash over it."""
    for prefix, (color, peak) in WASH.items():
        if route == prefix or route.startswith(prefix + "/"):
            t = max(0.0, min(1.0, y / WASH_HEIGHT))
            alpha = peak + (0.4 * peak - peak) * (t / 0.55) if t <= 0.55 else 0.4 * peak * (1 - (t - 0.55) / 0.45)
            return tuple(PAGE[i] * (1 - alpha) + color[i] * alpha for i in range(3))
    return PAGE


def header_on_page(pg, route: str, bg: str) -> tuple[bool, str]:
    """True when the header's own fill is the page, or it is transparent and what is painted there is the page (or page plus wash)."""
    if bg == "rgb(242, 242, 247)":
        return True, bg
    if bg != TRANSPARENT:
        return False, bg
    pg.evaluate("window.scrollTo(0, 0)")
    y = 8  # inside the header's top padding, where no text is
    shot = pg.screenshot(clip={"x": 4, "y": y, "width": 1, "height": 1})
    got, _ = _pixel(shot)
    want = expected(route, y)
    ok = all(abs(got[i] - want[i]) <= 3 for i in range(3))
    return ok, f"transparent over rgb{got}, expected rgb({', '.join(str(round(v)) for v in want)})"
