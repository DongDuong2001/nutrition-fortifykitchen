"""cc2-15b: demo mode for probes. `import _demo` turns demo mode on for every page the probe opens.

A new account starts empty; the sample day, sample history and seeded Gần đây exist only in demo mode
(lib/demo.ts, localStorage "h1t_demo_v1" = "1"). Probes written against the sample data import this module
before they open a page. It is not a probe itself (run_all.py skips names that start with "_").

smoke.py runs a second, empty-account pass with `_demo.enable(False)`; PROBE_DEMO=0 does the same for a whole run.
"""
import os

from playwright.sync_api import Browser

_SCRIPT = "try { if (localStorage.getItem('h1t_demo_v1') === null) localStorage.setItem('h1t_demo_v1', '1'); } catch (e) {}"
_state = {"on": os.environ.get("PROBE_DEMO", "1") != "0"}
_new_context = Browser.new_context
_new_page = Browser.new_page


def enable(on: bool) -> None:
    """Demo on or off for the contexts and pages created after this call."""
    _state["on"] = on


def _context(self, *args, **kwargs):
    ctx = _new_context(self, *args, **kwargs)
    if _state["on"]:
        ctx.add_init_script(_SCRIPT)
    return ctx


def _page(self, *args, **kwargs):
    page = _new_page(self, *args, **kwargs)
    if _state["on"]:
        page.context.add_init_script(_SCRIPT)
    return page


Browser.new_context = _context
Browser.new_page = _page
