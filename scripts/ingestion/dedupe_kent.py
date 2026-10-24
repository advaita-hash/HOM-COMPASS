"""Clean duplicate entries out of public/repertory/kent.json (re-runnable, idempotent).

The OOREP dump lists a few remedies more than once inside the same rubric
(e.g. "Generalities, pain, neuralgic" had Natrium Arsenicosum 4 times), which
made repertorisation count one remedy several times for a single rubric. It
also has one rubric path twice ("Extremities, clenching, fingers") and one path
with a stray trailing comma ("Mind, speech, answers, monosyllable, "), which
after trimming is the same rubric as the clean path just before it.

What this script does to the compact file (see gen_publicum.py for the schema):
  1. Trims trailing ", " / "," (and whitespace) from rubric paths.
  2. Keeps each remedy once per rubric, at its HIGHEST listed grade, in the
     position of its first listing.
  3. Merges rubrics whose (trimmed) path is identical: the first one keeps its
     slot and gets the union of remedies (max grade); the later one is retired.
  4. Updates rubricCount to the number of live rubrics.

Rubric ids and retired slots
----------------------------
The app derives rubric ids from position in `rubrics` (`k<index>`, see
src/features/repertory/repertoryData.ts), and saved worksheets store those ids.
So a merged-away rubric is NOT removed from the array — that would shift every
later id. Its slot is replaced by a tombstone `["", []]`, which the app skips
when it expands the file. Every other rubric keeps its index and id. The
retired ids are printed below as an alias map; the worksheet store migrates
saved worksheets from the retired id to the surviving one
(RETIRED_RUBRIC_IDS in repertoryData.ts — keep it in sync if this ever
reports new merges).

The file is written back with exactly the original serialisation
(ensure_ascii=False, separators=(",", ":"), original key order, no trailing
newline), so the git diff only touches the rubrics that changed. A second run
reports no changes and leaves the file byte-identical.

Usage:  python3 scripts/ingestion/dedupe_kent.py [path/to/kent.json]
"""
import json
import os
import re
import sys

DEFAULT = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                       "..", "..", "public", "repertory", "kent.json")

TOMBSTONE_PATH = ""  # retired slot: keeps later rubric ids stable

_TRAILING = re.compile(r"[\s,]+$")


def clean_path(path):
    """Strip trailing commas/whitespace ("Mind, speech, x, " -> "Mind, speech, x")."""
    return _TRAILING.sub("", path)


def dedupe_remedies(entries, remedies):
    """[[remIdx, grade], ...] -> one entry per remedy NAME, highest grade, first position."""
    out, pos = [], {}
    for idx, grade in entries:
        name = remedies[idx]
        if name in pos:
            cur = out[pos[name]]
            cur[1] = max(cur[1], grade)
        else:
            pos[name] = len(out)
            out.append([idx, grade])
    return out


def merge_remedies(into, extra, remedies):
    """Union of two de-duplicated entry lists (max grade), `into` order first."""
    return dedupe_remedies([list(e) for e in into] + [list(e) for e in extra], remedies)


def dedupe_rubrics(rubrics, remedies):
    """Clean a compact `rubrics` list (input is not modified).

    Returns (new_rubrics, report) where report has the per-step details and
    `aliases` maps retired id -> surviving id (e.g. "k65312" -> "k15312").
    """
    report = {"trimmed": [], "deduped": [], "merged": [], "aliases": {}}
    out = []
    first_by_path = {}
    for i, (path, entries) in enumerate(rubrics):
        if path == TOMBSTONE_PATH:
            out.append([path, entries])  # already retired
            continue
        new_path = clean_path(path)
        if new_path != path:
            report["trimmed"].append((i, path, new_path))
        new_entries = dedupe_remedies(entries, remedies)
        if len(new_entries) != len(entries) or any(
                a != b for a, b in zip(new_entries, entries)):
            report["deduped"].append((i, new_path, len(entries), len(new_entries)))
        if new_path in first_by_path:
            j = first_by_path[new_path]
            before = len(out[j][1])
            out[j][1] = merge_remedies(out[j][1], new_entries, remedies)
            report["merged"].append((i, j, new_path, before, len(new_entries), len(out[j][1])))
            report["aliases"][f"k{i}"] = f"k{j}"
            out.append([TOMBSTONE_PATH, []])
            continue
        first_by_path[new_path] = i
        out.append([new_path, new_entries])
    return out, report


def live_count(rubrics):
    return sum(1 for path, _ in rubrics if path != TOMBSTONE_PATH)


def dump(rep, fh):
    json.dump(rep, fh, ensure_ascii=False, separators=(",", ":"))


def main(path):
    with open(path, encoding="utf-8") as f:
        raw = f.read()
    rep = json.loads(raw)
    # Guard: only rewrite if we can reproduce the original bytes exactly.
    if json.dumps(rep, ensure_ascii=False, separators=(",", ":")) != raw:
        sys.exit("refusing to rewrite: file is not in the expected serialisation")

    rubrics, report = dedupe_rubrics(rep["rubrics"], rep["remedies"])
    rep["rubrics"] = rubrics
    old_count = rep["rubricCount"]
    rep["rubricCount"] = live_count(rubrics)

    removed = sum(a - b for _, _, a, b in report["deduped"])
    print(f"rubrics: {len(rubrics)} slots, {rep['rubricCount']} live "
          f"(rubricCount {old_count} -> {rep['rubricCount']})")
    print(f"trimmed paths: {len(report['trimmed'])}")
    for i, a, b in report["trimmed"]:
        print(f"  k{i}: {a!r} -> {b!r}")
    print(f"rubrics with duplicate remedies: {len(report['deduped'])} "
          f"({removed} duplicate entries removed)")
    for i, p, a, b in report["deduped"]:
        print(f"  k{i} {p!r}: {a} -> {b} remedies")
    print(f"merged duplicate paths: {len(report['merged'])}")
    for i, j, p, a, n, b in report["merged"]:
        print(f"  k{i} -> k{j} {p!r}: {a} + {n} -> {b} remedies (k{i} retired)")
    if report["aliases"]:
        print("retired id aliases:", json.dumps(report["aliases"]))

    out = json.dumps(rep, ensure_ascii=False, separators=(",", ":"))
    if out == raw:
        print("no changes")
        return
    with open(path, "w", encoding="utf-8") as f:
        f.write(out)
    print(f"wrote {path}")


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else DEFAULT)
