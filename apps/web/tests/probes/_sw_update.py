"""fix/polish-1020: a service worker update that is really there, for the checks and screenshots of "Có bản mới". Not a probe (a helper:
probe:all skips names that start with _, and it touches public/sw.js for a few seconds, which a parallel run must not).

`waiting_update(pg)`: with the page controlled by the worker it registered, changes public/sw.js (a new VERSION), asks the browser to
look for an update and waits until the new worker is installed and waiting; the file is put back as soon as that has happened (and
whatever goes wrong). Playwright cannot route the browser's own update fetch, so the file is the way.
"""
from contextlib import contextmanager
from pathlib import Path

SW = Path(__file__).resolve().parents[2] / "public" / "sw.js"


@contextmanager
def changed_sw():
    original = SW.read_text(encoding="utf-8")
    try:
        marker = 'const VERSION = "'
        assert marker in original
        SW.write_text(original.replace(marker, marker + "x", 1), encoding="utf-8")
        yield
    finally:
        SW.write_text(original, encoding="utf-8")


def waiting_update(pg, timeout_ms=15000):
    """The new worker is installed and waiting (the page keeps its old one). Returns True when it is."""
    pg.evaluate("() => navigator.serviceWorker.ready.then(() => true)")
    pg.reload(wait_until="networkidle")
    pg.wait_for_timeout(1500)
    with changed_sw():
        pg.evaluate("() => navigator.serviceWorker.getRegistration().then((r) => r.update())")
        pg.wait_for_function("() => navigator.serviceWorker.getRegistration().then((r) => !!(r && r.waiting))", timeout=timeout_ms)
    return True
