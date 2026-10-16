"""cc-42: probes start with the tour done and the tips off.

`import _seed` (or `import _demo`, which imports it) sets the device switch h1t_onboarding_off = "1" in every browser
context the probe opens, so the first-run tour and the first-visit tips never put an overlay over a page. The one
probe that tests them (cc_42_onboarding.py) calls `_seed.onboarding(True)` before it opens a page.
It is not a probe itself (run_all.py skips names that start with "_").
"""
from playwright.sync_api import Browser

_OFF = "try { localStorage.setItem('h1t_onboarding_off', '1'); } catch (e) {}"
_ON = "try { localStorage.removeItem('h1t_onboarding_off'); } catch (e) {}"
_state = {"onboarding": False}


def onboarding(on: bool) -> None:
    """Tour and tips on (True) or off (False, the default) for the contexts and pages created after this call."""
    _state["onboarding"] = on


def _script() -> str:
    return _ON if _state["onboarding"] else _OFF


_new_context = Browser.new_context
_new_page = Browser.new_page


def _context(self, *args, **kwargs):
    ctx = _new_context(self, *args, **kwargs)
    ctx.add_init_script(_script())
    return ctx


def _page(self, *args, **kwargs):
    page = _new_page(self, *args, **kwargs)
    page.context.add_init_script(_script())
    return page


Browser.new_context = _context
Browser.new_page = _page
