"""design-floor on /landing alone (quarantined, see QUARANTINE in run_all.py).

The landing page has failed D-COL-01 (cobalt text on ink, 3,0-3,3:1), D-TYPE-01 (11-13 px text at 200 %), D-CTL-01 (nav
links 20 px tall) and D-LAY-04 (a horizontal scroll at 200 %) since before V3. design-floor.py leaves it out so a red
design-floor.py means a regression on an app screen; this probe keeps the landing page measured until it is fixed.
Run with: ALIGN_BASE_URL=http://localhost:3101 npm run probe -- tests/probes/design-floor-landing.py
"""
# PROBE_COVERS: app/landing/** components/landing/**
import os
import runpy
from pathlib import Path

os.environ["DF_ROUTES"] = "/landing"
runpy.run_path(str(Path(__file__).with_name("design-floor.py")), run_name="__main__")
