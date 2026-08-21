"""Conservative OCR cleanup for the ingested reference books.

Re-runnable: loads each public/books/*.json, cleans remedy text + common names,
writes back. Designed to be idempotent and to only apply high-confidence fixes.
"""
import json, re

import os
BOOKS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "public", "books")

# Canonical Boericke section labels (closed vocabulary).
CANON = [
    "Mind", "Head", "Eyes", "Ears", "Nose", "Face", "Mouth", "Teeth", "Tongue",
    "Throat", "Stomach", "Abdomen", "Stool", "Rectum", "Urine", "Urinary",
    "Male", "Female", "Respiratory", "Cough", "Chest", "Heart", "Back",
    "Extremities", "Sleep", "Fever", "Skin", "Modalities", "Relationship",
    "Dose", "Generalities", "Nerves", "Neck", "Vertigo", "Clinical",
]
CANON_LOWER = {c.lower(): c for c in CANON}

# Real section-ish words that are correct and must never be "corrected".
KEEP_LABELS = {
    "uses", "organs", "bowels", "gastric", "mental", "eye", "stools", "region",
    "sensations", "nature", "complaints", "appetite", "taste", "voice", "sides",
    "expectoration", "sexual", "menses", "nails", "bones", "glands", "pulse",
    "temperature", "aggravation", "amelioration", "compare", "antidote", "limbs",
    "hands", "legs", "abamen", "chill", "heat", "sweat", "perspiration", "action",
}

def _lev(a, b):
    if a == b:
        return 0
    prev = list(range(len(b) + 1))
    for i, ca in enumerate(a, 1):
        cur = [i]
        for j, cb in enumerate(b, 1):
            cur.append(min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (ca != cb)))
        prev = cur
    return prev[-1]

def fix_label(label):
    low = label.lower()
    if low in CANON_LOWER or low in KEEP_LABELS:
        return CANON_LOWER.get(low, label)
    best, bd = None, 99
    for cl, disp in CANON_LOWER.items():
        d = _lev(low, cl)
        if d < bd:
            best, bd, = disp, d
    # only correct when the OCR label is clearly a garbled canonical section
    if best is not None and bd <= 2 and len(low) >= 4:
        return best
    return label

# Curated, unambiguous word fixes (keys are non-words → safe). Case-insensitive,
# applied on word boundaries; capitalisation of the first letter is preserved.
WORD_FIXES = {
    "aud": "and", "amd": "and", "aad": "and",
    "fong": "long", "fong": "long",
    "nase": "nose", "stumach": "stomach", "stemach": "stomach",
    "femonade": "lemonade", "semarkable": "remarkable",
    "nasebleed": "nosebleed", "fendency": "tendency", "tendeney": "tendency",
    "weemoptysis": "haemoptysis", "discharze": "discharge", "dischage": "discharge",
    "inflammatien": "inflammation", "eruptien": "eruption", "menstrua": "menstrual",
    "constipatien": "constipation", "sensatien": "sensation", "affectien": "affection",
    "worse": "worse", "aggravatien": "aggravation", "amelioratien": "amelioration",
    "respiratery": "respiratory", "extremites": "extremities", "abdemen": "abdomen",
    "swoolen": "swollen", "vemiting": "vomiting", "coug": "cough",
}

# Specific glued/@/# tokens best fixed by exact replacement.
TOKEN_FIXES = {
    "s#ff": "stiff", "dischk#ge": "discharge", "seneci#": "senecio",
    "jon@sia": "jonesia", "hypere@sthesia": "hyperaesthesia",
}

def preserve_case(src, repl):
    return repl.capitalize() if src[:1].isupper() else repl

def clean_ocr(text):
    if not text:
        return text
    t = text

    # 1. Exact token fixes (before @→oe generalisation).
    for bad, good in TOKEN_FIXES.items():
        t = re.sub(re.escape(bad), lambda m, g=good: preserve_case(m.group(0), g),
                   t, flags=re.IGNORECASE)

    # 2. Resolve the OCR '@':
    #   a) a standalone '@' between spaces is the misread article "a"
    t = re.sub(r"(?<=\s)@(?=\s)", "a", t)
    #   b) adjacent to a letter it is the œ ligature → 'oe' (dyspn@a, @sophagus, vulv@)
    t = re.sub(r"@(?=[A-Za-z])", "oe", t)
    t = re.sub(r"(?<=[A-Za-z])@", "oe", t)
    #   c) any residual '@' (abbreviation lists, numerals) is noise → drop
    t = t.replace("@", "")

    # 3. Strip junk characters and tidy punctuation/spacing.
    t = t.replace("_", " ").replace("«", "").replace("»", "").replace("|", "")
    t = re.sub(r"(?<=[A-Za-z])#(?=[A-Za-z])", "", t)  # residual stray '#'
    t = re.sub(r"\s+([,;:.])", r"\1", t)               # space before punctuation
    t = re.sub(r"\.{3,}", "…", t)
    t = re.sub(r"[ \t]{2,}", " ", t)

    # 4. Curated word fixes (word-boundary, case-preserving).
    def wsub(m):
        w = m.group(0)
        repl = WORD_FIXES.get(w.lower())
        return preserve_case(w, repl) if repl else w
    if WORD_FIXES:
        pattern = r"\b(" + "|".join(re.escape(k) for k in WORD_FIXES) + r")\b"
        t = re.sub(pattern, wsub, t, flags=re.IGNORECASE)

    # 5. Correct section labels at paragraph starts: "Label. — ..."
    def lsub(m):
        pre, label, dash = m.group(1), m.group(2), m.group(3)
        return f"{pre}{fix_label(label)}. {dash} "
    t = re.sub(r"(^|\n\n)([A-Z][a-zA-Z]{2,})\.\s*([—-])\s*", lsub, t)

    return t.strip()

def main():
    import os
    total = 0
    for fn in ("boericke.json", "tyler.json"):
        path = os.path.join(BOOKS_DIR, fn)
        book = json.load(open(path))
        for r in book["remedies"]:
            r["text"] = clean_ocr(r["text"])
            if r.get("commonName"):
                r["commonName"] = clean_ocr(r["commonName"]).strip(" .,-—")
        json.dump(book, open(path, "w"), ensure_ascii=False)
        total += len(book["remedies"])
        print(f"cleaned {fn}: {len(book['remedies'])} remedies")
    print("total:", total)

if __name__ == "__main__":
    main()
