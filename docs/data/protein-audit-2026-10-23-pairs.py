#!/usr/bin/env python3
"""Pair-consistency check for the raw/cooked pairs the app reads (apps/web/lib/data/raw-cooked-pairs.slim.json).

Report only: nothing is changed. For every pair [raw key, cooked key, yield] whose two rows are in the snapshot:

  yield = cooked grams per 100 g raw, so 100 g of raw becomes `yield` g of cooked and
  expected_raw_value = cooked_value_per_100g * yield / 100   (what the raw row should show if the cooked row is right)

  protein : fail when raw / expected_raw is outside 0.85 .. 1.15 (raw ~ cooked * yield / 100, within 15 %)
  fat     : fail when raw < 0.85 * expected_raw (fat can render out but never appear);
            flag "renders out" when raw > 1.3 * expected_raw
  kcal    : the same two rules as fat

A failure is "minor" when every failing gap is under 1 g (protein, fat) or 10 kcal per 100 g raw.
Sort key = the largest failing gap in kcal per 100 g raw (protein x 4, fat x 9, kcal as is).

Usage:
  python3 protein-audit-2026-10-23-pairs.py SNAPSHOT.json PAIRS.slim.json [--md]
  python3 protein-audit-2026-10-23-pairs.py --self-test
SNAPSHOT is food-research/live-1023/all.json (a list of foods with per_100g_nutrients). Standard library only.
"""
import json
import sys

LOW, HIGH_P, HIGH_F = 0.85, 1.15, 1.3


def check_pair(raw, cooked, yld):
    """Return the list of findings for one pair: dicts with metric, raw, expected, ratio, kind, gap_kcal, minor."""
    out = []
    y = yld / 100.0
    for metric, weight, minor_below in (("protein", 4.0, 1.0), ("fat", 9.0, 1.0), ("energy", 1.0, 10.0)):
        r, c = raw.get(metric), cooked.get(metric)
        if r is None or c is None:
            continue
        exp = c * y
        if exp == 0 and r == 0:
            continue
        ratio = (r / exp) if exp else float("inf")
        kind = None
        if metric == "protein":
            if ratio < LOW or ratio > HIGH_P:
                kind = "protein off"
        else:
            if ratio < LOW:
                kind = f"{metric} appears"
            elif ratio > HIGH_F:
                kind = f"{metric} renders out"
        if kind:
            gap = abs(r - exp)
            out.append(dict(metric=metric, raw=r, expected=round(exp, 2), ratio=ratio, kind=kind,
                            gap_kcal=gap * weight, minor=gap < minor_below))
    return out


def run(snapshot, pairs):
    by = {f"{f['source']}|{f['source_id']}": f for f in snapshot}
    failing, missing, checked = [], [], 0
    for raw_key, cooked_key, yld in (p[:3] for p in pairs):
        a, b = by.get(raw_key), by.get(cooked_key)
        if not a or not b:
            missing.append((raw_key, cooked_key, yld))
            continue
        checked += 1
        findings = check_pair(a["per_100g_nutrients"], b["per_100g_nutrients"], yld)
        if findings:
            failing.append(dict(raw=a, cooked=b, raw_key=raw_key, cooked_key=cooked_key, yld=yld, findings=findings,
                                gap=max(f["gap_kcal"] for f in findings),
                                minor=all(f["minor"] for f in findings)))
    failing.sort(key=lambda x: -x["gap"])
    return checked, failing, missing


def n3(f, k):
    v = f["per_100g_nutrients"].get(k)
    return "–" if v is None else (str(int(v)) if float(v) == int(v) else str(v))


def row_txt(f):
    return f"{f['name_vi']} `{f['source']}|{f['source_id']}` {n3(f,'energy')} / {n3(f,'protein')} / {n3(f,'fat')}"


def self_test():
    # the known failure: pork belly raw 518 / 9.34 / 53.01 against NIN 7018002 boiled 220 / 14 / 18.2 at yield 74
    raw = dict(energy=518, protein=9.34, fat=53.01)
    cooked = dict(energy=220, protein=14, fat=18.2)
    kinds = {f["metric"]: f["kind"] for f in check_pair(raw, cooked, 74)}
    # protein is fine (9.34 against 14 * 0.74 = 10.4); fat is 5x what the cooked row implies (13.5)
    assert kinds == {"fat": "fat renders out", "energy": "energy renders out"}, kinds
    # spareribs: 23.4 raw / 30.3 cooked at 53 passes protein (15.47 vs 29.06 * .53 = 15.4) and the fat rule
    assert not [f for f in check_pair(dict(energy=277, protein=15.47, fat=23.4), dict(energy=397, protein=29.06, fat=30.3), 53)
                if f["metric"] in ("protein",)]
    # fat that appears: raw 2 g, cooked 10 g at yield 100
    assert [f["kind"] for f in check_pair(dict(energy=100, protein=20, fat=2), dict(energy=170, protein=20, fat=10), 100)] == ["fat appears", "energy appears"]
    print("self-test ok")


def main(argv):
    if "--self-test" in argv:
        self_test()
        return 0
    args = [a for a in argv if not a.startswith("--")]
    if len(args) != 2:
        print(__doc__)
        return 2
    snapshot = json.load(open(args[0], encoding="utf-8"))
    pairs = json.load(open(args[1], encoding="utf-8"))
    checked, failing, missing = run(snapshot, pairs)
    minor = sum(1 for f in failing if f["minor"])
    print(f"pairs in file {len(pairs)}, checked {checked}, missing a row {len(missing)}, failing {len(failing)} (minor {minor}, material {len(failing) - minor})")
    for f in failing:
        tag = "minor" if f["minor"] else "MATERIAL"
        what = "; ".join(f"{x['kind']} (raw {x['raw']} vs {x['expected']} expected, x{x['ratio']:.2f})" for x in f["findings"])
        print(f"{tag:8} gap {f['gap']:6.1f} kcal | yield {f['yld']:>4} | RAW {row_txt(f['raw'])} | COOKED {row_txt(f['cooked'])} | {what}")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
