"""Integrity check for the bundled reference books (public/books/*.json).

Read-only. Prints every problem it finds and exits non-zero if there is any,
so it can gate a re-ingestion or run in CI:

    python3 scripts/ingestion/check_books.py [books-dir]

Checks
  * every book parses, has a remedies list and a matching remedyCount
  * every remedy has a slug, a name and a text of at least MIN_TEXT chars
  * no mis-decoded characters: C1 controls U+0080–U+009F (cp1252 "œ" read as
    Latin-1) or the U+FFFE non-character, in any string
  * no duplicate slugs within a book
  * no two differently named remedies with identical text (known synonyms
    excepted) — catches one monograph copied over another
  * Boericke: at most one "Dose." section per entry (a second one usually means
    the next monograph ran into this one), and no text after the Médi-T footer
  * Boericke: the major polychrests have a full-length chapter
"""
import glob, json, os, re, sys
from collections import defaultdict

BOOKS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "public", "books")

MIN_TEXT = 120
MIN_POLYCHREST = 2000
POLYCHRESTS = [
    "Sulphur", "Lycopodium", "Calcarea Carbonica", "Pulsatilla", "Natrum Muriaticum",
    "Sepia", "Phosphorus", "Arsenicum Album", "Nux Vomica", "Lachesis",
]
# Names that are the same remedy, so sharing one text is expected.
SYNONYMS = [
    {"Ustilago", "Ustilago Maydis"},
]
# Wording of the placeholder used when a chapter could not be sourced; such an
# entry is reported as a warning rather than a failure.
MISSING_NOTICE = "is not yet available in this edition"

BAD_CHARS = re.compile(r"[\u0080-\u009f￾]")
DOSE_SECTION = re.compile(r"\bDose\.\s*(?:—|--?)")
# Boericke's "Non-Homoeopathic Uses" block legitimately carries its own Dose.
NON_HOMOEOPATHIC = re.compile(r"Non-Hom\w*pathic", re.IGNORECASE)
MEDIT_FOOTER = "Copyright © Médi-T 1999 Home"


def strings(node, path=""):
    """Yield (path, value) for every string in a parsed JSON document."""
    if isinstance(node, str):
        yield path, node
    elif isinstance(node, list):
        for i, v in enumerate(node):
            yield from strings(v, f"{path}[{i}]")
    elif isinstance(node, dict):
        for k, v in node.items():
            yield from strings(v, f"{path}.{k}" if path else k)


def same_remedy(a, b):
    return any(a in s and b in s for s in SYNONYMS)


def check_book(fn, book, errors, warnings):
    def err(msg):
        errors.append(f"{fn}: {msg}")

    for path, value in strings(book):
        m = BAD_CHARS.search(value)
        if m:
            ctx = value[max(0, m.start() - 20):m.end() + 20]
            err(f"{path}: mis-decoded character U+{ord(m.group(0)):04X} in {ctx!r}")

    remedies = book.get("remedies")
    if not isinstance(remedies, list) or not remedies:
        err("no remedies list")
        return
    if book.get("remedyCount") != len(remedies):
        err(f"remedyCount is {book.get('remedyCount')} but there are {len(remedies)} remedies")

    seen = {}
    by_text = defaultdict(list)
    for i, r in enumerate(remedies):
        label = r.get("slug") or f"#{i}"
        for field in ("slug", "name", "text"):
            if not isinstance(r.get(field), str) or not r[field].strip():
                err(f"{label}: missing {field}")
        text = (r.get("text") or "").strip()
        slug = r.get("slug")
        if slug in seen:
            err(f"duplicate slug {slug!r} (entries {seen[slug]} and {i})")
        seen[slug] = i
        if text and len(text) < MIN_TEXT:
            err(f"{label}: text is only {len(text)} chars")
        if text:
            by_text[text].append(r.get("name"))

        if book.get("id") == "boericke" and text:
            own = NON_HOMOEOPATHIC.split(text, 1)[0]
            doses = len(DOSE_SECTION.findall(own))
            if doses > 1:
                err(f"{label}: {doses} 'Dose.' sections — another monograph may have run into it")
            if MEDIT_FOOTER in text and text.split(MEDIT_FOOTER, 1)[1].strip():
                err(f"{label}: text continues after the Médi-T footer")

    for text, names in by_text.items():
        distinct = sorted(set(names))
        if len(distinct) > 1 and not all(same_remedy(distinct[0], n) for n in distinct[1:]):
            err(f"identical text shared by {', '.join(distinct)}")

    if book.get("id") == "boericke":
        by_name = {r.get("name"): r for r in remedies}
        for name in POLYCHRESTS:
            r = by_name.get(name)
            if r is None:
                err(f"polychrest {name!r} is missing")
                continue
            n = len(r.get("text") or "")
            if MISSING_NOTICE in (r.get("text") or ""):
                warnings.append(f"{fn}: {name} shows the 'not yet available' notice instead of its chapter")
            elif n < MIN_POLYCHREST:
                err(f"polychrest {name!r} is only {n} chars (expected at least {MIN_POLYCHREST})")


def main():
    errors, warnings = [], []
    books_dir = sys.argv[1] if len(sys.argv) > 1 else BOOKS_DIR
    paths = sorted(glob.glob(os.path.join(books_dir, "*.json")))
    if not paths:
        errors.append(f"no books found in {books_dir}")
    for path in paths:
        fn = os.path.basename(path)
        try:
            with open(path, encoding="utf-8") as f:
                book = json.load(f)
        except (OSError, ValueError) as e:
            errors.append(f"{fn}: cannot be read as JSON ({e})")
            continue
        check_book(fn, book, errors, warnings)
        print(f"checked {fn}: {len(book.get('remedies') or [])} remedies")

    for w in warnings:
        print(f"WARNING {w}")
    for e in errors:
        print(f"ERROR {e}")
    print(f"{len(errors)} error(s), {len(warnings)} warning(s)")
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main())
