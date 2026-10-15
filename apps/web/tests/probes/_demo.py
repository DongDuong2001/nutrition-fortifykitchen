"""cc2-15b: demo mode for probes. `import _demo` turns demo mode on for every page the probe opens.

A new account starts empty; the sample day, sample history and seeded Gần đây exist only in demo mode
(lib/demo.ts, localStorage "h1t_demo_v1" = "1"). Probes written against the sample data import this module
before they open a page. It is not a probe itself (run_all.py skips names that start with "_").

smoke.py runs a second, empty-account pass with `_demo.enable(False)`; PROBE_DEMO=0 does the same for a whole run.
"""
import os

from playwright.sync_api import Browser

# cc-28c: the Level 0 hint card ("Có huấn luyện viên? …") is a one-time card on Hôm nay. Probes written before it
# existed start with it dismissed (the sample profile with hintSeen); cc_28c.py turns that off with `_demo.hint(False)`.
_PROFILE = '{"sex":"male","birthYear":2003,"weightKg":65,"goal":"maintain","periodMode":false,"trainingMinutesDefault":60,"displayName":"","hintSeen":true}'
_SEED = "try { if (localStorage.getItem('h1t_profile_v1_demo') === null) localStorage.setItem('h1t_profile_v1_demo', JSON.stringify(%s)); } catch (e) {}" % _PROFILE
_BASE = "try { if (localStorage.getItem('h1t_demo_v1') === null) localStorage.setItem('h1t_demo_v1', '1'); } catch (e) {}"
_state = {"on": os.environ.get("PROBE_DEMO", "1") != "0", "hint_seen": True}


def _script() -> str:
    return _BASE + (_SEED if _state["hint_seen"] else "")


def hint(seen: bool) -> None:
    """Whether new demo contexts start with the Level 0 hint already dismissed (default True)."""
    _state["hint_seen"] = seen
_new_context = Browser.new_context
_new_page = Browser.new_page


def enable(on: bool) -> None:
    """Demo on or off for the contexts and pages created after this call."""
    _state["on"] = on


def _context(self, *args, **kwargs):
    ctx = _new_context(self, *args, **kwargs)
    if _state["on"]:
        ctx.add_init_script(_script())
    return ctx


def _page(self, *args, **kwargs):
    page = _new_page(self, *args, **kwargs)
    if _state["on"]:
        page.context.add_init_script(_script())
    return page


Browser.new_context = _context
Browser.new_page = _page
