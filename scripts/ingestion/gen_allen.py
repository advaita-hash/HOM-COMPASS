#!/usr/bin/env python3
"""
Build public/books/allen.json from "Allen's Keynotes Rearranged and Classified"
(B. Jain, 10th ed.). The PDF has a clean text layer, so no OCR is needed.

Layout of the source (page indices are 0-based):
  19–341   main materia medica — ALL-CAPS title, common name, botanical family,
           then titled sections of "•" keynotes
  343–420  "The Materia Medica of some more important remedies" (same layout,
           titles like "ADRENALINUM (Sarcode)")
  424–432  the eight Bach/Paterson bowel nosodes (headings + prose)
  421–423, 433–440  Paterson's essay — not remedies, skipped
  441–551  repertorial index — not monographs, skipped

Output text format (rendered by the reader as headings + bullet lists):
  "<Section>\\n• keynote\\n• keynote\\n\\n<Section>\\n…"

Usage:  python3 scripts/ingestion/gen_allen.py "Allens Keynotes.pdf" public/books/allen.json
"""
import json
import re
import sys

import pypdfium2 as pdfium

MAIN = (19, 342)
SUPPLEMENT = (343, 421)
NOSODES = (424, 433)

HEADINGS = {
    "constitution", "mental generals", "physical generals", "mental", "mentals", "mind",
    "sensorium", "head", "outer head", "face", "eyes", "ears", "nose", "mouth", "teeth",
    "throat", "neck", "neck and back", "back", "back and extremities", "chest", "stomach",
    "abdomen", "appetite", "stool", "stool and anus", "stool and rectum",
    "gastro-intestinal system", "digestion", "digestive system", "urinary system",
    "genito-urinary system", "male reproductive system", "female reproductive system",
    "respiratory system", "throat and respiratory system", "cardio-vascular system",
    "circulation", "nervous system", "neuro-muscular system", "fibrous tissues",
    "extremities", "upper limbs", "lower limbs", "limbs in general", "skin", "sleep",
    "fever", "injuries", "modalities", "relation", "relations", "associated remedies",
}
# typos in the edition → canonical heading
HEADING_FIX = {
    "motdalities": "modalities", "mental genenerals": "mental generals",
    "stomch": "stomach", "physical general": "physical generals", "relations": "relation",
    "mentals": "mental generals", "mental": "mental generals",
}
TITLE_FIX = {
    "sycotic compoumd (paterson)": "Sycotic Compound (Paterson)",
    "arterias rubens": "Asterias Rubens",
    "electrictas": "Electricitas",
    "adrenalinum (sarcode)": "Adrenalinum",
    "provings of the x-ray": "X-Ray",
}
# a second title the edition prints mid-monograph → append to the named remedy
MERGE_INTO = {"electricity": "electricitas"}

TITLE_RE = re.compile(r"[A-Z][A-Z \-–’'.]+[A-Z](?:\s*\([A-Za-z ]+\))?|BACILLUS NO\. “7” \(PATERSON\)")
FORMULA_RE = re.compile(r"^[()A-Z][A-Za-z0-9(). ]*$")  # C3H3 / (NO2 / ) O3 / CH6H5CO. OH
LABEL_RE = re.compile(r"^[A-Z][A-Za-z\- ]{2,30}:\s")  # "Aggravation: …", "Compare: …"


def heading_of(line: str):
    k = line.strip().lower().rstrip(":")
    k = HEADING_FIX.get(k, k)
    if k in HEADINGS:
        return " ".join(w if w in {"and", "in"} else w.capitalize() for w in k.split(" ")).replace(
            "Gastro-intestinal", "Gastro-intestinal"
        )
    return None


def title_case(s: str) -> str:
    fixed = TITLE_FIX.get(s.lower())
    if fixed:
        return fixed
    words = []
    for w in s.lower().split():
        if w.startswith("("):
            words.append("(" + w[1:].capitalize())
        elif w in {"of", "the"}:
            words.append(w)
        else:
            words.append("-".join(p.capitalize() for p in w.split("-")))
    return " ".join(words)


def slugify(s: str) -> str:
    s = re.sub(r"\(.*?\)", "", s.lower())
    return re.sub(r"[^a-z0-9]+", "-", s).strip("-")


def page_lines(pages, start, end):
    text = "\n".join(pages[start:end])
    text = text.replace("￾\n", "-").replace("￾", "-")  # line-break hyphens
    text = text.replace("Aggavation:", "Aggravation:").replace("Amelioation:", "Amelioration:")
    return [l.strip() for l in text.split("\n")]


def is_title(line: str, nosode: bool) -> bool:
    if not line or len(line) < 4 or not TITLE_RE.fullmatch(line):
        return False
    if heading_of(line) or re.fullmatch(r"[A-Z]", line):
        return False
    if nosode:
        return line.endswith("(BACH)") or line.endswith("(PATERSON)")
    return True


def split_remedies(lines, nosode=False):
    """Yield (title, meta_lines, body_lines) per remedy."""
    cur = None
    for line in lines:
        if re.fullmatch(r"[A-Z]", line):  # alphabet dividers
            continue
        if is_title(line, nosode):
            if nosode and cur and line == cur[0]:
                continue
            if cur:
                yield cur
            cur = [line, [], [], True]  # title, meta, body, in_meta
            continue
        if cur is None or not line:
            continue
        if cur[3] and re.search(r"\d", line) and FORMULA_RE.match(line) or cur[3] and line[:1] in "()":
            continue  # chemical formula under the title
        if cur[3] and not heading_of(line) and not line.startswith("•") and len(cur[1]) < 3 and len(line) < 60:
            cur[1].append(line)
            continue
        cur[3] = False
        cur[2].append(line)
    if cur:
        yield cur


def render_body(body, prose=False):
    """Group lines into sections → '<Heading>\\n• item…' paragraphs."""
    sections, head, items = [], None, []

    def flush():
        if items:
            sections.append((head, [i.strip() for i in items if i.strip()]))

    for line in body:
        h = heading_of(line)
        if h:
            flush()
            head, items = h, []
            continue
        if line.startswith("•"):
            items.append("• " + line.lstrip("• ").strip())
        elif LABEL_RE.match(line) and not prose:
            items.append(line)
        elif items:
            prev = items[-1]
            # prose: keep paragraph breaks at sentence ends followed by a capital
            if prose and re.search(r"[.!?”]$", prev) and line[:1].isupper() and len(prev) > 60:
                items.append(line)
            else:
                items[-1] = (prev[:-1] if prev.endswith("-") and not re.search(r"\b[A-Z][a-z]{0,5}-$", prev) else prev + " ") + line
        else:
            items.append(line)
    flush()
    out = []
    for h, its in sections:
        out.append("\n".join(([h] if h else []) + its))
    return "\n\n".join(out)


def build(pdf_path):
    pdf = pdfium.PdfDocument(pdf_path)
    pages = [pdf[i].get_textpage().get_text_range().replace("\r", "") for i in range(len(pdf))]
    remedies, seen = [], set()

    def add(title, meta, body, prose=False):
        name = title_case(title)
        if "(SARCODE)" in title.upper():
            meta = meta[:1] + ["Sarcode"]
        slug = slugify(name)
        if slug in MERGE_INTO:
            host = next(r for r in remedies if r["slug"] == MERGE_INTO[slug])
            host["text"] += "\n\n" + render_body(body, prose)
            return
        if slug in seen or not body:
            return
        seen.add(slug)
        text = render_body(body, prose)
        if len(text) < 40:
            return
        remedies.append(
            {
                "slug": slug,
                "name": name,
                "commonName": meta[0] if meta else None,
                "family": meta[1] if len(meta) > 1 else None,
                "text": text,
            }
        )

    for rng in (MAIN, SUPPLEMENT):
        for title, meta, body, _ in split_remedies(page_lines(pages, *rng)):
            add(title, meta, body)
    for title, meta, body, _ in split_remedies(page_lines(pages, *NOSODES), nosode=True):
        # nosodes open with an introductory paragraph rather than common name/family
        add(title, [], meta + body, prose=True)

    return {
        "id": "allen",
        "title": "Allen's Keynotes — Rearranged and Classified",
        "author": "H. C. Allen",
        "source": "Allen's Keynotes Rearranged and Classified with Leading Remedies of the "
        "Materia Medica and Bowel Nosodes, 10th ed. (B. Jain Publishers, 2005). "
        "Bowel nosodes by John Paterson.",
        "note": "Copyrighted edition used pending the publisher's permission; serve only from a "
        "protected deployment.",
        "remedyCount": len(remedies),
        "remedies": remedies,
    }


if __name__ == "__main__":
    src = sys.argv[1] if len(sys.argv) > 1 else "Allens Keynotes.pdf"
    dst = sys.argv[2] if len(sys.argv) > 2 else "public/books/allen.json"
    data = build(src)
    with open(dst, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, separators=(",", ":"))
    print(f"{data['remedyCount']} remedies → {dst}")
