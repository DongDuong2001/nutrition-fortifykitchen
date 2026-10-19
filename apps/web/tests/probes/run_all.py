"""cc-14: run every tests/probes/*.py and print a pass/fail table.

Run with: ALIGN_BASE_URL=http://localhost:3101 npm run probe:all
A probe passes when it exits 0 and prints no "[FAIL]" line. ag04_audit and screenshots have no
exit gate, so they are report-only: shown as REPORT, never counted as PASS. cc02-final is
dev-only (its sign-in link is hidden in production), so it runs only with PROBE_DEV=1. Each
probe's output is saved to tests/probes/out/probe-all/<name>.log. Exits 1 if any probe fails.

PROBE_WORKERS=N runs that many probes at once against the same server (default DEFAULT_WORKERS = 6, the fastest safe
count measured on 20/10, see docs/probe-times.md; PROBE_WORKERS=1 runs them one after the other). Each probe opens its own
browser contexts, so they do not share storage, and each writes screenshots under its own names. Timing-sensitive probes
(a 5 s toast, a fixed clock) can get slower under load, so a probe that fails only in parallel is rerun alone before it
is reported as a failure.

A probe gets TIMEOUT_S (180 s) and is reported as "timed out" by name when it hits it. Name probes on the command line
(run_all.py smoke.py cc_46.py) to run only those (gate:fast does this); PROBE_SKIP=a.py,b.py leaves some out (gate:full
skips hydration.py, which it runs as test:hydration).
"""
import datetime
import os
import re
import subprocess
import sys
import time
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

HERE = Path(__file__).resolve().parent
LOG_DIR = HERE / "out" / "probe-all"
SELF = Path(__file__).resolve()
DEV_ONLY = {"cc02-final.py"}
REPORT_ONLY = {"ag04_audit.py", "screenshots.py"}
# cc-65: probes that are red on plain main for a known reason. A quarantined probe still runs; its failure is shown as
# QUAR and does not fail the run, so a red probe:all means a regression. Past its expiry date it counts again.
# name: (reason, expires YYYY-MM-DD)
QUARANTINE = {
    "cc_26.py": ("the share name line-height and the image's last row (OPEN_QUESTIONS cc-68); fixed by the overnight Part 7 commit", "2026-10-27"),
    "cc_44.py": ("the WebKit run without fonts overlaps a B12 row the app never draws without fonts (OPEN_QUESTIONS cc-68); Part 7", "2026-10-27"),
}
TIMEOUT_S = 180
DEFAULT_WORKERS = 6


def run_probe(path, env):
    started = time.time()
    try:
        res = subprocess.run(
            [sys.executable, str(path)], env=env, capture_output=True, text=True, encoding="utf-8", errors="replace", timeout=TIMEOUT_S
        )
    except subprocess.TimeoutExpired as err:
        print(f"[timeout] {path.name} hit the {TIMEOUT_S} s limit", flush=True)
        output = (err.stdout or b"").decode("utf-8", "replace") if isinstance(err.stdout, bytes) else (err.stdout or "")
        (LOG_DIR / f"{path.stem}.log").write_text(output, encoding="utf-8")
        return "FAIL", f"timed out after {TIMEOUT_S} s", output
    output = res.stdout + res.stderr
    (LOG_DIR / f"{path.stem}.log").write_text(output, encoding="utf-8")
    failed = res.returncode != 0 or "[FAIL]" in output
    detail = f"exit {res.returncode}, {time.time() - started:.0f} s"
    return ("FAIL" if failed else "PASS"), detail, output


def main():
    base = os.environ.get("ALIGN_BASE_URL", "http://localhost:3100")
    dev = os.environ.get("PROBE_DEV") == "1"
    LOG_DIR.mkdir(parents=True, exist_ok=True)
    print(f"=== probe:all against {base} ({'dev' if dev else 'prod'}) ===")

    workers = max(1, int(os.environ.get("PROBE_WORKERS", str(DEFAULT_WORKERS))))
    paths = [p for p in sorted(HERE.glob("*.py")) if p.resolve() != SELF and not p.name.startswith("_")]  # _demo.py is a helper
    args = sys.argv[1:]
    tag = None
    if "--tag" in args:
        i = args.index("--tag")
        tag = args[i + 1] if i + 1 < len(args) else None
        del args[i : i + 2]
    wanted = {Path(a).name for a in args}
    unknown = wanted - {p.name for p in paths}
    if unknown:
        print(f"unknown probe(s): {', '.join(sorted(unknown))}")
        sys.exit(1)
    skip = {n.strip() for n in os.environ.get("PROBE_SKIP", "").split(",") if n.strip()}
    paths = [p for p in paths if (not wanted or p.name in wanted) and p.name not in skip]
    if tag:
        # "# PROBE_TAGS: smoke" near the top of a probe
        tags = lambda p: " ".join(re.findall(r"^#\s*PROBE_TAGS:(.*)$", p.read_text(encoding="utf-8"), re.M)).split()
        paths = [p for p in paths if tag in tags(p)]
    started = time.time()

    def one(path):
        if path.name in DEV_ONLY and not dev:
            return path, "SKIP", "dev only, set PROBE_DEV=1", ""
        status, detail, output = run_probe(path, os.environ.copy())
        if status == "FAIL" and workers > 1:
            # Load can break a timing-sensitive probe: it counts as failed only if it fails alone too
            status, detail2, output = run_probe(path, os.environ.copy())
            detail = f"{detail2} (rerun alone)"
        if status == "PASS" and path.name in REPORT_ONLY:
            status = "REPORT"
        if status == "FAIL" and path.name in QUARANTINE:
            reason, expires = QUARANTINE[path.name]
            if datetime.date.today().isoformat() <= expires:
                status, detail = "QUAR", f"{detail}; quarantined until {expires}: {reason}"
        print(f"[{status.lower()}] {path.name} ({detail})", flush=True)
        return path, status, detail, output

    with ThreadPoolExecutor(max_workers=workers) as pool:
        rows = list(pool.map(one, paths))  # map keeps the sorted order
    print(f"{len(rows)} probes, {workers} worker(s), {time.time() - started:.0f} s wall clock")

    width = max(len(path.name) for path, *_ in rows)
    print(f"\n{'probe':<{width}}  {'result':<6}  detail")
    for path, status, detail, _ in rows:
        print(f"{path.name:<{width}}  {status:<6}  {detail}")

    failures = [(path, output) for path, status, _, output in rows if status == "FAIL"]
    for path, output in failures:
        print(f"\n--- {path.name} (last lines, full log in {LOG_DIR / (path.stem + '.log')}) ---")
        print("\n".join(output.strip().splitlines()[-10:]))

    counts = {s: sum(1 for r in rows if r[1] == s) for s in ("PASS", "REPORT", "QUAR", "FAIL", "SKIP")}
    print(f"\nprobe:all: {counts['PASS']} PASS, {counts['REPORT']} REPORT, {counts['QUAR']} QUAR, {counts['FAIL']} FAIL, {counts['SKIP']} SKIP")
    sys.exit(1 if counts["FAIL"] else 0)


if __name__ == "__main__":
    main()
