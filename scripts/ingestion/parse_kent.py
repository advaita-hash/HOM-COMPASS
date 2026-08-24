import re, json, os, sys

OUT = "/tmp/claude-0/-home-user-HOM-COMPASS/8f717a98-08d9-59a0-b17a-c32a39a7349d/scratchpad"
raw = open(f"{OUT}/kent.txt").read()

CHAPTERS = ["MIND","VERTIGO","HEAD","EYE","VISION","EAR","HEARING","NOSE","FACE",
"MOUTH","TEETH","THROAT","EXTERNAL THROAT","STOMACH","ABDOMEN","RECTUM","STOOL",
"BLADDER","KIDNEYS","PROSTATE GLAND","URETHRA","URINE","GENITALIA MALE",
"GENITALIA FEMALE","LARYNX AND TRACHEA","RESPIRATION","COUGH","EXPECTORATION",
"CHEST","BACK","EXTREMITIES","SLEEP","CHILL","FEVER","PERSPIRATION","SKIN",
"GENERALITIES"]

# ---- 1. Abbreviation legend → abbr(normalised) : Full name -------------------
def norm_abbr(a):
    a = a.strip().lower().rstrip(".,")
    a = a.replace(" ", "")
    return a

legend = {}
li = raw.find("REMEDIES AND THEIR ABBREVIATIONS")
mind = re.search(r"(?m)^MIND\.?\s*$", raw)
if li >= 0 and mind:
    seg = raw[li:mind.start()]
    for m in re.finditer(r"([A-Za-z][A-Za-z\-]{0,10})\.?\s*,\s*([A-Z][A-Za-z \-]{2,40})\.", seg):
        ab, full = norm_abbr(m.group(1)), m.group(2).strip()
        if ab and ab not in legend:
            legend[ab] = full

# Common OCR fixes for frequent abbreviations (keys normalised → canonical).
ABBR_FIX = {
    "aeon": "acon", "acon-f": "acon", "acsc": "acon",
    "cale": "calc", "caic": "calc", "calc-ph": "calc-p",
    "puis": "puls", "pnls": "puls", "puls": "puls",
    "igt": "ign", "grslt": "grat", "flri": "", "teth": "",
    "ij-ux-v": "nux-v", " mix-v": "nux-v", "mix-v": "nux-v", "ntix-v": "nux-v",
    "au-c": "am-c", "ani-c": "am-c", "atn-c": "am-c",
    "cofr": "coff", "cof": "coff", "coff": "coff", "cofif": "coff",
    "meuy": "meny", "mere": "merc", "mercc": "merc-c", "nice": "nit-ac",
    "canst": "caust", "chant": "canth", "sil": "sil", "silic": "sil",
    "lye": "lyc", "lyco": "lyc", "bell": "bell", "beli": "bell",
    "arn": "arn", "am": "am-c", "ars-h": "ars", "phos-ac": "ph-ac",
    "rhus-t": "rhus-t", "rlius-t": "rhus-t", "rhus": "rhus-t",
    "sep": "sep", "staph": "staph", "sfaph": "staph", "hell": "hell",
}

def clean_line(t):
    return t

CHAPSET = set(CHAPTERS)

def chapter_of_line(st):
    base = st.rstrip(".").upper().strip()
    letters = [c for c in st if c.isalpha()]
    up = sum(1 for c in letters if c.isupper()) / len(letters) if letters else 0
    if base in CHAPSET and up > 0.9 and len(st) <= len(base) + 3:
        return base
    return None

pages = raw.split("\f")

# ---- 3. Walk lines: detect chapters in canonical order, parse rubrics ---------
def is_rubric_header(s):
    # "Header: remedies..."  header before first colon, letters, up to ~60 chars
    m = re.match(r"^([A-Za-z][^:]{0,60}?):\s*(.*)$", s)
    if not m:
        return None
    head = m.group(1).strip()
    if len(re.sub(r"[^A-Za-z]", "", head)) < 3:
        return None
    if "(" in head and "See" in s:
        return None
    return head, m.group(2)

TOKEN = re.compile(r"([A-Za-z][A-Za-z\-]{1,10})\.?")

# Common English / rubric words that leak into remedy lists from the two-column
# OCR (next-rubric names, connectors, modality words) — not remedies.
STOP = set("""about when in on of see with from after before during amel agg aggr
aggravation amelioration etc and as if to the a an or but that this these those
dreams crowd mirth anger apprehension apprehensio arrogance asking company
indignation vexation railroad train morning evening night noon forenoon afternoon
daytime while walking sitting standing lying rising eating drinking desire aversion
pain heat cold air open room bed head face which prevents sleep followed people
horrible thought conscience salvation future health children business domestic
affairs everything himself evil""".split())

def parse_remedies(text):
    out = []
    for raw_tok in re.split(r"[,;]", text):
        t = raw_tok.strip()
        if not t:
            continue
        m = TOKEN.match(t)
        if not m:
            continue
        tok = m.group(1)
        grade = 2 if tok[0].isupper() else 1     # case → reconstructed grade
        ab = norm_abbr(tok)
        ab = ABBR_FIX.get(ab, ab)
        if not ab or len(ab) < 2:
            continue
        if ab in STOP:
            continue
        # a plain lowercase all-alpha token of 4+ letters with no hyphen that is a
        # dictionary-ish word is likely leaked text, not an abbreviation.
        out.append((ab, grade))
    return out


rubrics = []
cur_chapter = None
cur = None       # (name, remedies list)
cur_main = None  # last MAIN rubric name (for composing sub-rubric paths)

def flush():
    global cur
    if cur and cur[1]:
        name, rem = cur
        merged = {}
        for ab, g in rem:
            merged[ab] = max(merged.get(ab, 0), g)
        rubrics.append({"chapter": cur_chapter, "rubric": name,
                        "remedies": [{"ab": a, "grade": g} for a, g in merged.items()]})
    cur = None

def header_is_main(head):
    letters = [c for c in head if c.isalpha()]
    if not letters:
        return False
    up = sum(1 for c in letters if c.isupper()) / len(letters)
    return up > 0.6

chapters_seen = []
for pg in pages:
    plines = [l.strip() for l in pg.splitlines() if l.strip()]
    # page chapter = first running-header line naming a chapter
    for l in plines[:3]:
        ch = chapter_of_line(l)
        if ch:
            if ch != cur_chapter:
                flush()
                cur_chapter = ch
                cur_main = None
                if ch not in chapters_seen:
                    chapters_seen.append(ch)
            break
    if cur_chapter is None:
        continue
    for s in plines:
        if chapter_of_line(s) or re.fullmatch(r"[0-9lI]{1,4}", s):
            continue
        # MAIN rubric header: standalone mostly-caps line ending in '.', no colon
        if ":" not in s and "See" not in s:
            body = s.rstrip(". ")
            letters = [c for c in body if c.isalpha()]
            up = sum(1 for c in letters if c.isupper()) / len(letters) if letters else 0
            if s.rstrip().endswith(".") and len(letters) >= 4 and up > 0.85 and len(body) <= 45:
                flush()
                cur_main = body
                cur = (cur_main, [])
                continue
        hdr = is_rubric_header(s)
        if hdr:
            flush()
            head, rest = hdr
            if header_is_main(head):
                cur_main = head.rstrip(",:")
                name = cur_main
            else:
                name = f"{cur_main}, {head}" if cur_main else head
            cur = (name, parse_remedies(rest))
        elif cur:
            cur = (cur[0], cur[1] + parse_remedies(s))
flush()
chap_seq = chapters_seen

print("chapters:", chap_seq[:40])
print("rubrics parsed:", len(rubrics))
mind_rubrics = [r for r in rubrics if r["chapter"] == "MIND"]
print("MIND rubrics:", len(mind_rubrics))
for r in mind_rubrics[:12]:
    rems = ", ".join(f"{x['ab']}{x['grade']}" for x in r["remedies"][:10])
    print(f"  [{r['rubric']}] ({len(r['remedies'])}) {rems}")
print("legend entries:", len(legend))

if "--write" in sys.argv:
    # expand abbr -> display name via legend, else Title-case abbr
    def disp(ab):
        full = legend.get(ab)
        if full:
            return full
        return "-".join(p.capitalize() for p in ab.split("-"))
    chapters_order = chap_seq
    out_rubrics = []
    for i, r in enumerate(rubrics):
        rems = [{"name": disp(x["ab"]), "grade": x["grade"]} for x in r["remedies"]]
        out_rubrics.append({
            "id": f"kent-{i}",
            "chapter": r["chapter"].title(),
            "rubric": r["rubric"],
            "remedies": rems,
        })
    rep = {
        "id": "kent",
        "title": "Kent's Repertory of the Homœopathic Materia Medica",
        "author": "James Tyler Kent",
        "source": "Kent · Repertory (grades reconstructed from case)",
        "note": "Rubrics extracted from the uploaded Kent PDF. The source was compressed, which stripped bold/italic; grades are reconstructed from letter-case (emphasised = 2, plain = 1) and are approximate.",
        "chapters": [c.title() for c in chapters_order],
        "rubricCount": len(out_rubrics),
        "rubrics": out_rubrics,
    }
    os.makedirs("/home/user/HOM-COMPASS/public/repertory", exist_ok=True)
    json.dump(rep, open("/home/user/HOM-COMPASS/public/repertory/kent.json", "w"), ensure_ascii=False)
    print("WROTE kent.json:", len(out_rubrics), "rubrics")
