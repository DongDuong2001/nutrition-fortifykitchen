#!/usr/bin/env python3
"""No-loss check for an importer file.

cmd/importfoods replaces `per_100g_nutrients` whole on upsert (ON CONFLICT ... = EXCLUDED.per_100g), so a record that
leaves out a nutrient the live row has today deletes it. Rule: a fix may not drop a nutrient the row has today unless the
old value is shown wrong. This script compares every record with its row in the snapshot and fails on any loss that is not
listed, with a reason, in the allow file.

How a record finds its snapshot row: by (source, source_id) when the record keeps the key, else through the source-fix SQL
(`UPDATE ... SET source = 'a', source_id = 'b' WHERE id = '<id>'`), which maps the new key to the row's id.

Usage:
  python3 protein-audit-2026-10-23-noloss.py SNAPSHOT.json RECORDS.json [SOURCE-FIX.sql] [--allow ALLOW.json] [--list]
Exit code 0 = no unlisted loss and nothing pending, 1 = at least one. --list prints the new keys per record as well.
ALLOW.json: {"<new source>|<new source_id>": {"<nutrient>": "<reason>", ...}}. A reason that starts with "PENDING" is a loss
nobody has signed off yet: it is printed as PENDING and the exit code stays 1 until the reason is rewritten by the person who
approves it. Standard library only.
"""
import json
import re
import sys

UPDATE = re.compile(r"SET source = '([^']*)', source_id = '((?:[^']|'')*)'\s*WHERE id = '([0-9a-f-]{36})'")


def moves_from_sql(path):
    out = {}
    if path:
        for src, sid, fid in UPDATE.findall(open(path, encoding="utf-8").read()):
            out[f"{src}|{sid.replace(chr(39) * 2, chr(39))}"] = fid
    return out


def compare(snapshot, records, moves, allow=None):
    """Return [(record, snapshot row, lost {key: old}, new [keys], unlisted {key: old})]."""
    by_key = {f"{f['source']}|{f['source_id']}": f for f in snapshot}
    by_id = {f["id"]: f for f in snapshot}
    allow = allow or {}
    out = []
    for r in records:
        key = f"{r['source']}|{r['source_id']}"
        row = by_key.get(key) or by_id.get(moves.get(key))
        if row is None:
            out.append((r, None, {}, [], {}))
            continue
        old = {k: v for k, v in row["per_100g_nutrients"].items() if v is not None}
        new = {k: v for k, v in r["nutrients"].items() if v is not None}
        lost = {k: v for k, v in old.items() if k not in new}
        unlisted = {k: v for k, v in lost.items() if k not in allow.get(key, {})}
        out.append((r, row, lost, sorted(set(new) - set(old)), unlisted))
    return out


def self_test():
    snap = [dict(id="a" * 8 + "-0000-0000-0000-" + "0" * 12, source="s", source_id="old", per_100g_nutrients=dict(energy=1, b12=2, sodium=0))]
    rec = [dict(source="s", source_id="new", nutrients=dict(energy=1, iron=3))]
    sql = "UPDATE x SET source = 's', source_id = 'new'\nWHERE id = '" + snap[0]["id"] + "';"
    moves = {"s|new": snap[0]["id"]}
    (_, _, lost, new, unlisted), = compare(snap, rec, moves)
    assert lost == {"b12": 2, "sodium": 0} and new == ["iron"] and unlisted == lost
    (_, _, _, _, unlisted), = compare(snap, rec, moves, {"s|new": {"b12": "x", "sodium": "y"}})
    assert unlisted == {}
    assert UPDATE.findall(sql) == [("s", "new", snap[0]["id"])]
    # a PENDING reason is not a sign-off: the script reports it and exits 1
    import tempfile, os, subprocess
    d = tempfile.mkdtemp()
    same = [dict(source="s", source_id="old", name_vi="x", nutrients=dict(energy=1, iron=3))]
    json.dump(snap, open(d + "/s.json", "w")); json.dump(same, open(d + "/r.json", "w"))
    json.dump({"s|old": {"b12": "PENDING Hao", "sodium": "zero"}}, open(d + "/a.json", "w"))
    out = subprocess.run([sys.executable, __file__, d + "/s.json", d + "/r.json", "--allow", d + "/a.json"], capture_output=True, text=True)
    assert out.returncode == 1 and "PENDING" in out.stdout, out.stdout
    json.dump({"s|old": {"b12": "approved by Hao 23/10", "sodium": "zero"}}, open(d + "/a.json", "w"))
    out = subprocess.run([sys.executable, __file__, d + "/s.json", d + "/r.json", "--allow", d + "/a.json"], capture_output=True, text=True)
    assert out.returncode == 0, out.stdout
    print("self-test ok")


def main(argv):
    if "--self-test" in argv:
        self_test()
        return 0
    allow_path = argv[argv.index("--allow") + 1] if "--allow" in argv else None
    show_new = "--list" in argv
    args = [a for i, a in enumerate(argv) if not a.startswith("--") and (i == 0 or argv[i - 1] != "--allow")]
    if len(args) not in (2, 3):
        print(__doc__)
        return 2
    snapshot = json.load(open(args[0], encoding="utf-8"))
    records = json.load(open(args[1], encoding="utf-8"))
    moves = moves_from_sql(args[2] if len(args) == 3 else None)
    allow = json.load(open(allow_path, encoding="utf-8")) if allow_path else {}
    failed = 0
    for r, row, lost, new, unlisted in compare(snapshot, records, moves, allow):
        tag = f"{r['source']}|{r['source_id']}"
        if row is None:
            print(f"NO ROW   {tag} ({r['name_vi']}): not in the snapshot and not moved by the SQL: it would be an INSERT")
            continue
        pending = {k: v for k, v in lost.items() if str(allow.get(tag, {}).get(k, "")).startswith("PENDING")}
        status = "FAIL" if unlisted else ("PENDING" if pending else ("ALLOWED" if lost else "ok"))
        failed += bool(unlisted or pending)
        print(f"{status:8} {tag} ({r['name_vi']}): lost {len(lost)}, new {len(new)}")
        for k, v in lost.items():
            why = allow.get(tag, {}).get(k)
            print(f"           lost {k} = {v}" + (f"  [{'pending' if str(why).startswith('PENDING') else 'allowed'}: {why}]" if why else "  [NOT ALLOWED]"))
        if show_new and new:
            print(f"           new  {', '.join(new)}")
    print("RESULT:", "FAIL (unlisted or pending loss)" if failed else "pass (no unlisted loss)")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
