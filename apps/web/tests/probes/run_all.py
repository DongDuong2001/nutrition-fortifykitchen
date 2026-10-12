"""cc-14: run every tests/probes/*.py and print a pass/fail table.

Run with: ALIGN_BASE_URL=http://localhost:3101 npm run probe:all
A probe passes when it exits 0 and prints no "[FAIL]" line. ag04_audit and screenshots have no
exit gate, so they are report-only: shown as REPORT, never counted as PASS. cc02-final is
dev-only (its sign-in link is hidden in production), so it runs only with PROBE_DEV=1. Each
probe's output is saved to tests/probes/out/probe-all/<name>.log. Exits 1 if any probe fails.
"""
import os
import subprocess
import sys
import time
from pathlib import Path

HERE = Path(__file__).resolve().parent
LOG_DIR = HERE / "out" / "probe-all"
SELF = Path(__file__).resolve()
DEV_ONLY = {"cc02-final.py"}
REPORT_ONLY = {"ag04_audit.py", "screenshots.py"}
TIMEOUT_S = 900


def run_probe(path, env):
    started = time.time()
    try:
        res = subprocess.run(
            [sys.executable, str(path)], env=env, capture_output=True, text=True, timeout=TIMEOUT_S
        )
    except subprocess.TimeoutExpired:
        return "FAIL", f"timed out after {TIMEOUT_S} s", ""
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

    rows = []
    for path in sorted(HERE.glob("*.py")):
        if path.resolve() == SELF:
            continue
        if path.name in DEV_ONLY and not dev:
            rows.append((path, "SKIP", "dev only, set PROBE_DEV=1", ""))
            continue
        status, detail, output = run_probe(path, os.environ.copy())
        if status == "PASS" and path.name in REPORT_ONLY:
            status = "REPORT"
        rows.append((path, status, detail, output))

    width = max(len(path.name) for path, *_ in rows)
    print(f"\n{'probe':<{width}}  {'result':<6}  detail")
    for path, status, detail, _ in rows:
        print(f"{path.name:<{width}}  {status:<6}  {detail}")

    failures = [(path, output) for path, status, _, output in rows if status == "FAIL"]
    for path, output in failures:
        print(f"\n--- {path.name} (last lines, full log in {LOG_DIR / (path.stem + '.log')}) ---")
        print("\n".join(output.strip().splitlines()[-10:]))

    counts = {s: sum(1 for r in rows if r[1] == s) for s in ("PASS", "REPORT", "FAIL", "SKIP")}
    print(f"\nprobe:all: {counts['PASS']} PASS, {counts['REPORT']} REPORT, {counts['FAIL']} FAIL, {counts['SKIP']} SKIP")
    sys.exit(1 if counts["FAIL"] else 0)


if __name__ == "__main__":
    main()
