"""Build public/repertory/kent.json from the OOREP dump (Repertorium Publicum).

Compact schema (expanded in the app loader):
  { id, title, author, source, note, license, chapters:[...],
    remedies:[fullname,...],           # index = remedy id in `r`
    rubrics:[ [fullpath, [[remIdx,grade],...]], ... ] }
"""
import json, os

SQL = "/tmp/claude-0/-home-user-HOM-COMPASS/8f717a98-08d9-59a0-b17a-c32a39a7349d/scratchpad/oorep.sql"
REP = "publicum"

def copy_iter(name):
    cap = False
    with open(SQL, encoding="utf-8", errors="replace") as f:
        for ln in f:
            if not cap:
                if ln.startswith(f"COPY public.{name} "):
                    cap = True
                continue
            if ln.startswith("\\."):
                break
            yield ln.rstrip("\n").split("\t")

# 1. remedies: remedyid -> full name
remedy_name = {}
for r in copy_iter("remedy"):
    rid = int(r[0]); remedy_name[rid] = r[2]

# 2. rubrics (publicum): id -> fullpath
rubric_path = {}
for r in copy_iter("rubric"):
    if r[0] != REP:
        continue
    rid = int(r[1]); fullpath = r[5]
    if fullpath and fullpath != "\\N":
        rubric_path[rid] = fullpath.replace("\\\\", "\\")

# 3. rubricremedy (publicum): rubricid -> [(remedyid, weight)]
from collections import defaultdict
rr = defaultdict(list)
for r in copy_iter("rubricremedy"):
    if r[0] != REP:
        continue
    rr[int(r[1])].append((int(r[2]), int(r[3])))

# 4. assign compact remedy indices only for remedies actually used
used = {}
remedies = []
def idx_of(rid):
    if rid not in used:
        used[rid] = len(remedies)
        remedies.append(remedy_name.get(rid, f"Remedy {rid}"))
    return used[rid]

CANON = ["Mind","Vertigo","Head","Eye","Ear","Nose","Face","Mouth","Teeth",
"Throat","External throat","Stomach","Abdomen","Rectum","Stool","Bladder",
"Kidneys","Prostate gland","Urethra","Urine","Genitalia","Larynx","Respiration",
"Cough","Expectoration","Chest","Back","Extremities","Sleep","Chill","Fever",
"Perspiration","Skin","Generalities"]
canon_idx = {c.lower(): i for i, c in enumerate(CANON)}

rubrics = []
chapters = {}
for rid, path in sorted(rubric_path.items()):
    rems = rr.get(rid)
    if not rems:
        continue
    chapter = path.split(",")[0].strip()
    chapters.setdefault(chapter, 0)
    chapters[chapter] += 1
    compact = [[idx_of(remid), w] for remid, w in rems]
    rubrics.append([path, compact])

# order chapters canonically, unknown ones after, alphabetical
chap_list = sorted(chapters.keys(),
    key=lambda c: (canon_idx.get(c.lower(), 999), c.lower()))

rep = {
    "id": "kent",
    "title": "Repertorium Publicum",
    "author": "Vladimir Polony (after Kent)",
    "source": "OOREP · Repertorium Publicum — a public Kentian repertory",
    "license": "GPL-3.0 (data from the OOREP / OpenRep project)",
    "note": "Full, properly-graded English repertory (grades 1–4) from the open OOREP database.",
    "compact": True,
    "chapters": chap_list,
    "rubricCount": len(rubrics),
    "remedies": remedies,
    "rubrics": rubrics,
}

import os
_OUT=os.path.join(os.path.dirname(os.path.abspath(__file__)),"..","..","public","repertory")
os.makedirs(_OUT, exist_ok=True)
with open(os.path.join(_OUT,"kent.json"),"w") as f:
    json.dump(rep, f, ensure_ascii=False, separators=(",", ":"))

print("rubrics:", len(rubrics), "| remedies used:", len(remedies),
      "| chapters:", len(chap_list))
print("chapters:", chap_list)
tot = sum(len(r[1]) for r in rubrics)
print("total graded entries:", tot)
