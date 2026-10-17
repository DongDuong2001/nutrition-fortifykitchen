"""cc-42: probes start with the tour done and the tips off.

`import _seed` (or `import _demo`, which imports it) sets the device switch h1t_onboarding_off = "1" in every browser
context the probe opens, so the first-run tour and the first-visit tips never put an overlay over a page. The one
probe that tests them (cc_42_onboarding.py) calls `_seed.onboarding(True)` before it opens a page. "Có gì mới" has its
own switch, h1t_whats_new_off, also on by default; cc_46.py turns it off with `_seed.whats_new(True)`.
It is not a probe itself (run_all.py skips names that start with "_").
"""
from playwright.sync_api import Browser

_OFF = "try { localStorage.setItem('h1t_onboarding_off', '1'); } catch (e) {}"
_ON = "try { localStorage.removeItem('h1t_onboarding_off'); } catch (e) {}"
_WN_OFF = "try { localStorage.setItem('h1t_whats_new_off', '1'); } catch (e) {}"
_WN_ON = "try { localStorage.removeItem('h1t_whats_new_off'); } catch (e) {}"
_state = {"onboarding": False, "whats_new": False}


def onboarding(on: bool) -> None:
    """Tour and tips on (True) or off (False, the default) for the contexts and pages created after this call."""
    _state["onboarding"] = on


def whats_new(on: bool) -> None:
    """cc-46: the "Có gì mới" sheet on (True) or off (False, the default, also with the tour and tips on)."""
    _state["whats_new"] = on


def _script() -> str:
    return (_ON if _state["onboarding"] else _OFF) + (_WN_ON if _state["whats_new"] else _WN_OFF)


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
