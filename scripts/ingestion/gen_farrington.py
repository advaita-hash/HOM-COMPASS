#!/usr/bin/env python3
"""
Build public/books/farrington.json from E. A. Farrington, "A Clinical Materia
Medica", 2nd ed. (Philadelphia: Hahnemann Publishing House, 1890) — public
domain; scan by the Wellcome Collection (b21118838).

The scan has no text layer, so the input is the OCR'd text of each page: a
JSON list of page strings, one per IIIF canvas, 0-based (see README.md for how
it was made with tesseract).

Farrington teaches in numbered lectures grouped by natural family. Each remedy
heading inside a lecture starts a chapter; a lecture's opening remarks (before
its first remedy) become a chapter of their own, "Lecture XXV — Ranunculaceae
(introduction)". A lecture whose title is itself a remedy ("LECTURE VII.
CANTHARIS.") is that remedy's chapter, and a "(continued)" lecture runs on into
the same chapter. Text is plain prose, paragraphs separated by a blank line.

Usage:  python3 scripts/ingestion/gen_farrington.py farrington-pages.json public/books/farrington.json
        python3 scripts/ingestion/gen_farrington.py farrington-pages.json --headings
        (the second form lists every heading found, for review)
"""
import json
import re
import os
import statistics
import sys
from collections import Counter

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from clean_books import clean_ocr  # noqa: E402  (the shared OCR cleanup)

FIRST_PAGE = 20   # canvas of LECTURE I
INDEX_PAGE = 705  # canvas where the indexes start (lectures end on 704)
LECTURES = 72
MIN_INTRO = 200   # chars; a shorter lecture introduction opens the next chapter

# OCR garbles the numerals ("LXYVI", "XLVIIL", "LXE"), so lectures are numbered
# in order; the build checks that all LECTURES were found.
LECTURE_RE = re.compile(r"^\W{0,2}L\s*[EeC][Cc][Tt]+[UuV][Rr][EeB]\b")

# OCR heading (normalised: upper-case, letters and spaces only) → chapter name.
# Every heading the parser finds must be listed here or in NOT_A_HEADING, so a
# new or garbled heading fails loudly instead of silently becoming a chapter.
# Names are the usual Latin names, spelled so the app's remedy matching
# (booksIndex.ts findBookRemedy) finds the repertory remedy: no longer than the
# repertory name ("Oleander", not "Oleander Nerium"), and the repertory's name
# where Farrington's has no alias there ("Kali Iodatum" for his Kali
# hydriodicum, "Strontium Carbonicum" for Strontiana carbonica).
#   "+Family"  a family sub-heading: opens "Lecture N — Family"
#   ""         not a chapter: a heading's second line, dropped
NAMES = {
    "LACHESIS": "Lachesis",
    "MYYGALE LASIODORA": "Mygale Lasiodora",
    "LYCOSA TARENTULA": "Tarentula Hispanica",
    "TARENTULA CUBENSIS": "Tarentula Cubensis",
    "ARANEA DIADEMA": "Aranea Diadema",
    "THERIDION CURASSAVICUM": "Theridion Curassavicum",
    "APIS MELLIFICA": "Apis Mellifica",
    "MOSCHUS": "Moschus",
    "PSORINUM": "Psorinum",
    "AMBRA GRISEA": "Ambra Grisea",
    "APOCYNACE": "+Apocynaceae",
    "APOCYNUM CANNABINUM": "Apocynum Cannabinum",
    "OLEANDER NERIUM": "Oleander",
    "VINCA MINOR": "Vinca Minor",
    "ALSTONIA SCHOLARIS": "Alstonia Scholaris",
    "NUX VOMICA": "Nux Vomica",
    "CURARE": "Curare",
    "J UGLANDACES": "+Juglandaceae",
    "ARUM TRIPHYLLUM": "Arum Triphyllum",
    "CALADIUM SEGUINUM": "Caladium Seguinum",
    "POTUOS FA TIDA": "Pothos Foetida",
    "ANACARDIUM ORIENTALE": "Anacardium Orientale",
    "ANACARDIUM YAEY": "Anacardium Orientale",
    "ARNICA MONTANA": "Arnica Montana",
    "ARTEMISIA VULGARIS": "Artemisia Vulgaris",
    "ABSINTHIUM": "Absinthium",
    "MILLEFOLIUM": "Millefolium",
    "TARAXACUM": "Taraxacum",
    "EVUPATORIUM PERFOLIATUM": "Eupatorium Perfoliatum",
    "ARTEMISIA ABROTANUM": "Abrotanum",
    "CINA": "Cina",
    "CHAMOMILLA MATRICARIA": "Chamomilla",
    "COLCHICUM": "Colchicum",
    "VERATRUM ALBUM": "Veratrum Album",
    "VERATRUM VIRIDE": "Veratrum Viride",
    "SABADILLA": "Sabadilla",
    "COCCULUS INPICUS": "Cocculus Indicus",
    "OPIUM": "Opium",
    "SANGUINARIA": "Sanguinaria Canadensis",
    "CANADENSIS": "",
    "CHELIDONIUM MAJVS": "Chelidonium Majus",
    "COLOCCYNTHIS CUCUMIS": "Colocynthis",
    "CONIFER": "+Coniferae",
    "APRES NIGRA": "Abies Nigra",
    "SABINA JUNIPERUS": "Sabina",
    "TEREBINTHINA": "Terebinthina",
    "PIX LAGUIPA": "Pix Liquida",
    "THUJA OCCIDENTALIS": "Thuja Occidentalis",
    "EUPHORBIACE": "+Euphorbiaceae",
    "ACCONITUM NAPELLUS": "Aconitum Napellus",
    "ACTEA RACEMOSA": "Actaea Racemosa",
    "RANUNCUTUS BUXSOSUS": "Ranunculus Bulbosus",
    "RANUNCULUS SCELERATUS": "Ranunculus Sceleratus",
    "HELLEBORUS": "Helleborus",
    "STAPHISAGRIA": "Staphisagria",
    "PULSATILLA": "Pulsatilla",
    "PULSATILLA BITS": "Pulsatilla",
    "CINCHONA RUBRA": "Cinchona",
    "IPECACUANHA": "Ipecacuanha",
    "COFFEA ARABICUM": "Coffea",
    "DICITALIS PURPUREA": "Digitalis Purpurea",
    "LINARIA VULGARIS": "Linaria Vulgaris",
    "VV ERBASCUM": "Verbascum",
    "GRATIOLA": "Gratiola",
    "LEPTANDRA VIRGINICA": "Leptandra Virginica",
    "EUPHRASIA OFFICINALIS": "Euphrasia Officinalis",
    "BELLADONNA": "Belladonna",
    "HYOSCYAMUS NIGER": "Hyoscyamus Niger",
    "TABACUM": "Tabacum",
    "DULCAMARA": "Dulcamara",
    "CAPSICUM ANNUUM A": "Capsicum Annuum",
    "GLONCIN": "Glonoinum",
    "LYCOPODIUM": "Lycopodium Clavatum",
    "THE UMBELLIFERZ": "+Umbelliferae",
    "BERBERIDACEZ": "+Berberidaceae",
    "BERBERIS VULGARIS": "Berberis Vulgaris",
    "POPDOPHYLLUM PELTATUM": "Podophyllum Peltatum",
    "SPIGELIA ANTHELMINTICA": "Spigelia",
    "SELENIUM": "Selenium",
    "SULPH RR": "Sulphur",
    "SULPHUR": "Sulphur",
    "CARBO VEGETABILIS": "Carbo Vegetabilis",
    "CARRBO ANIMALIS": "Carbo Animalis",
    "GRAPHITES": "Graphites",
    "PETROLEUM": "Petroleum",
    "SPONGIA": "Spongia",
    "FRIVUORIC ACIIP": "Fluoricum Acidum",
    "MORIATIC ACID": "Muriaticum Acidum",
    "PUHOSRHORIC ACID": "Phosphoricum Acidum",
    "SULPHURIC ACID": "Sulphuricum Acidum",
    "NITRIC ACTIN": "Nitricum Acidum",
    "HYPROCYANIC ACIP": "Hydrocyanicum Acidum",
    "PIORIC ACRP": "Picricum Acidum",
    "PHOSPHORUS": "Phosphorus",
    "ANTIMONIUM CRUDUM": "Antimonium Crudum",
    "ANTIMONIUM TARTARICUM": "Antimonium Tartaricum",
    "AVURUM METALLICUM": "Aurum Metallicum",
    "ARGENTUM NITRICUM": "Argentum Nitricum",
    "ARGENTUM METALLICUM": "Argentum Metallicum",
    "PLATINA": "Platina",
    "PALLADIUM": "Palladium",
    "ALUMINA": "Alumina",
    "PLUUUMBUM METALLICUM": "Plumbum Metallicum",
    "STANNUM": "Stannum",
    "CUPRUM METALLICUM": "Cuprum Metallicum",
    "ZINCUM": "Zincum",
    "FERRUM METALLICUM": "Ferrum Metallicum",
    "MAGNESIA CARBONICA": "Magnesia Carbonica",
    "MAGNESTA MURIATICA": "Magnesia Muriatica",
    "MAGNESIA MURIATICA": "Magnesia Muriatica",
    "BARRYTTA CARBONICA": "Baryta Carbonica",
    "BARYTA CARBONICA": "Baryta Carbonica",
    "STRONTIANA CARBONICA": "Strontium Carbonicum",
    "LIRHIUM CARBONICUM": "Lithium Carbonicum",
    "AMMONIUM CARBONICUM": "Ammonium Carbonicum",
    "AMMONIUM MURIATICUM": "Ammonium Muriaticum",
    "AMMONIUM PHOSPHORICUM": "Ammonium Phosphoricum",
    "CALCAREA OSTREARUM": "Calcarea Ostrearum",
    "CALCAREA PHOSPHORICA": "Calcarea Phosphorica",
    "HEPAR SULPHURIS CALCAREA": "Hepar Sulphuris Calcareum",
    "HEPAR": "Hepar Sulphuris Calcareum",
    "NATTRRUM CARBONICUM": "Natrum Carbonicum",
    "NATRUM SULPHURICUM": "Natrum Sulphuricum",
    "KATT BROMATUM": "Kali Bromatum",
    "KALI HYDRIODICUM": "Kali Iodatum",
    "KATI HYPRIOPICUM": "Kali Iodatum",
    "CAUSTICUM": "Causticum",
}
# Heading-like lines that are not headings: cells of the synoptic tables that
# open many lectures, side-notes, and a signature.
NOT_A_HEADING = {
    "ORTHOPTERA BLATTA", "TARAXACUM LIVER", "CHEST LUNGS HEART", "CAUSTICUM AND GUAIACUM",
    "PRX LIQUIPA LUNG ERUPTIONS", "DR AUG KORNDEERFER", "MADDER AND GALIUM", "LYCOPODIUM CLAVATUM",
    "ELECTRO ELECTRO", "AURUM FERRUM", "ARGENTUM MANGANUM", "MERCURY NICCOLUM", "THALLIUM KOBALTUM",
    "PALLADIUM RHODIUM", "CARBONEUM LAMPBLACK", "BISULPHIDE OF CARBON", "BROMINE AND IODINE",
    "PHOSPHORUS ANTHRACINWM", "GLONOIN AND SULPHUR", "CHINA ALUMINA", "NY ALI", "THUJA",
    "TEREBINTHINA UTERUS", "SULPHUR A CHLOROSIS",
}
# Exact OCR lines of headings too garbled to recognise → chapter name.
FORCED_HEADINGS = {"DATURA Siu caneetinne": "Stramonium"}
# Lecture title (normalised) → its display name, or "=Remedy" when the whole
# lecture is that remedy's chapter. The Mercury lecture has no remedy headings
# and is about Mercurius and its salts, so it is filed as Mercurius.
LECTURE_TITLES = {
    "INTRODUCTORY": "Introductory",
    "ANIMAL KINGDOM": "Animal Kingdom",
    "THE OPHIDIA": "The Ophidia",
    "ARACHNIDA": "Arachnida",
    "CANTHARIS": "=Cantharis",
    "HYMENOPTERA": "Hymenoptera",
    "MOSCHUS": "=Moschus",
    "SEPIA": "=Sepia",
    "SEPRA": "=Sepia",
    "NOSODES": "Nosodes",
    "SECALE CORNUTUM": "=Secale Cornutum",
    "THE VEGETABLE KINGDOM": "The Vegetable Kingdom",
    "GELSEMIUM SEMPERVIRENS": "=Gelsemium Sempervirens",
    "NUX VOMICA": "=Nux Vomica",
    "IGNATIA AMARA": "=Ignatia Amara",
    "ARACEZS": "Araceae",
    "ANACARDIACEAI": "Anacardiaceae",
    "RHUS TOXICODENDRON": "=Rhus Toxicodendron",
    "COMPOSIT A": "Compositae",
    "CINA AND CHAMOMILLA": "Cina and Chamomilla",
    "MELANTHACEZ": "Melanthaceae",
    "MENISPERMACE": "Menispermaceae",
    "PAPAVERACEA": "Papaveraceae",
    "SANGUINARIA AND CHELIDONIUM": "Sanguinaria and Chelidonium",
    "CUCURBITACEZ": "Cucurbitaceae",
    "BRYONIA ALBA": "=Bryonia Alba",
    "CONIFERAD AND EHUPHORBIACE AS": "Coniferae and Euphorbiaceae",
    "RANUNCULACEZI": "Ranunculaceae",
    "ACTHA RACEHMOSA RANUNCULUS BULBOSUS AND RANUNCULUS SCHL":
        "Actaea Racemosa, Ranunculus Bulbosus and Ranunculus Sceleratus",
    "HELLEBORUS AND STAPHISAGRIA": "Helleborus and Staphisagria",
    "PULSATILLA": "=Pulsatilla",
    "RUBIACEAE": "Rubiaceae",
    "IPECACUANHA AND COFFEBA": "Ipecacuanha and Coffea",
    "SCROPHULARIACE": "Scrophulariaceae",
    "BAPTISIA TINCTORIA": "=Baptisia Tinctoria",
    "SOLANACEZ": "Solanaceae",
    "STRAMONIUM AND HYOSCYAMUS": "Stramonium and Hyoscyamus",
    "TABACUM DULCAMARA CAPSICUM AND GLONOIN": "Tabacum, Dulcamara, Capsicum and Glonoin",
    "LYCOPODIUM CLAVATUM": "=Lycopodium Clavatum",
    "THE UMBELLIFERA THE BERBERIDACH AI AND SPIGELIA": "The Umbelliferae, the Berberidaceae and Spigelia",
    "MINERAL KINGDOM": "Mineral Kingdom",
    "SULPHUR": "=Sulphur",
    "THE CARBON GROUP": "The Carbon Group",
    "CARBO ANIMALIS GRAPHITES AND PETROLEUM": "Carbo Animalis, Graphites and Petroleum",
    "HALOGENS": "Halogens",
    "THE ACIDS": "The Acids",
    "PHOSPHORIC AND SULPHURIC ACIDS": "Phosphoric and Sulphuric Acids",
    "NITRIC HYDROCYANIC AND PICRIC ACIDS": "Nitric, Hydrocyanic and Picric Acids",
    "SILICEA": "=Silicea",
    "ARSENICUM ALBUM": "=Arsenicum Album",
    "PHOSPHORUS": "=Phosphorus",
    "THE PREPARATIONS OF ANTIMONY": "The Preparations of Antimony",
    "THE PREPARATIONS OF MERCURY": "=Mercurius",
    "THE NOBLE METALS AURUM": "The Noble Metals",
    "THE PREPARATIONS OF SILVER": "The Preparations of Silver",
    "PLATINA PALLADIUM AND ALUMINA": "Platina, Palladium and Alumina",
    "PLUMBUM AND STANNUM": "Plumbum and Stannum",
    "CUPRUM AND ZINCUM": "Cuprum and Zincum",
    "FERRUM AND THE MAGNESIA SALTS": "Ferrum and the Magnesia Salts",
    "BARYTA CARB STRONTIANA CARB AND LITHIUM CARB": "Baryta Carb., Strontiana Carb. and Lithium Carb.",
    "THE AMMONIUM PREPARATIONS": "The Ammonium Preparations",
    "SALTS OF LIME CALCARHA OSTREARUM": "Salts of Lime",
    "CALCAREA PHOSPHORICA AND HEPAR": "Calcarea Phosphorica and Hepar",
    "PREPARATIONS OF SODA": "Preparations of Soda",
    "NATRUM MURIATICUM": "=Natrum Muriaticum",
    "BORAX VENETA": "=Borax Veneta",
    "SALTS OF POTASH": "Salts of Potash",
    "KALI BICHROMICUM": "=Kali Bichromicum",
    "CAUSTICUM": "=Causticum",
    "KALI CARBONICUM": "=Kali Carbonicum",
}

def norm(s: str) -> str:
    return re.sub(r"\s+", " ", re.sub(r"[^A-Z ]", " ", s.upper())).strip()


def letters(s: str) -> str:
    return re.sub(r"[^A-Za-z]", "", s)


def is_capsy(s: str) -> bool:
    """Small-caps / caps line: most letters upper-case ("MyYGALE LASIODORA.")."""
    l = letters(s)
    return len(l) >= 4 and sum(c.isupper() for c in l) / len(l) >= 0.7


BOOK_TITLE_RE = re.compile(r"CLINICAL\s+MA\w+\s+ME\w+")  # even-page header, OCR'd unevenly


def is_running_header(s: str) -> bool:
    """"28 A CLINICAL MATERIA MEDICA.", "LACHESIS. 59", "CANTHARIS. 8d",
    "LACHESIS, ae", "PULSATILLA. Bits}": a caps line with the page number
    (often garbled) before or after it."""
    s = s.strip(" -_—'‘.|")
    if BOOK_TITLE_RE.search(s):
        return True
    head = re.split(r"[.,;:]", s, maxsplit=1)[0]
    return len(s) < 60 and is_capsy(re.sub(r"^\S*\d\S*\s+", "", head)) and bool(
        re.search(r"\d{2,3}\W*$", s) or re.match(r"\S*\d", s)
        or re.search(r"[A-Z][.,;:]\W*\s+\S{1,5}$", s))


def drop_running_header(lines):
    """Remove the page's running header: a header-shaped line among the first
    six non-empty lines (specks often come before it)."""
    top = [i for i, line in enumerate(lines) if line.strip()][:6]
    if any(LECTURE_RE.match(lines[i].strip()) for i in top):
        return lines  # a lecture's first page has no running header
    drop = {i for i in top if is_running_header(lines[i].strip())}
    return [line for i, line in enumerate(lines) if i not in drop]


def clean_line(s: str) -> str:
    s = s.replace("ﬁ", "fi").replace("ﬂ", "fl").replace("ﬀ", "ff").replace("ﬃ", "ffi").replace("ﬄ", "ffl")
    s = s.replace("ſ", "s").replace("‘", "'").replace("’", "'").replace("“", '"').replace("”", '"')
    s = s.replace("—", " — ").replace("--", " — ")
    s = re.sub(r"\s+;", ";", s)  # "ecchymoses ;" (the book's spaced semicolon)
    s = re.sub(r"\s+:", ":", s)
    s = re.sub(r"\s+,", ",", s)
    s = re.sub(r"[ \t]+", " ", s)
    return s.strip()


def is_junk(s: str) -> bool:
    """Stray marks: page numbers, margin specks, list numerals on their own
    (a short word ending a paragraph, "red.", is kept)."""
    return not any(len(w) >= 3 and re.search(r"[aeiouy]", w, re.I) and re.search(r"[^aeiouys]", w, re.I)
                   for w in re.findall(r"[A-Za-z]+", s))


def heading_key(s: str, standalone: bool = False):
    """Normalised key if the line looks like a heading, else None.

    Headings are short, stand-alone, small-caps lines ("MyYGALE LASIODORA.",
    "Vinca MInor.", "LAcHESIS (continued)."): every word carries a capital, and
    there is no comma inside the line (a short prose line listing remedies has).
    Everything this accepts must be listed in NAMES or NOT_A_HEADING.
    """
    t = s.strip(" _-—'‘*")
    words = t.split()
    if len(letters(t)) < 4 or len(t) > 55 or not 1 <= len(words) <= 6 or not t[0].isupper():
        return None
    if "," in t.rstrip(",. 0123456789;"):
        return None
    content = [w for w in words if len(letters(w)) >= 2 and w.lower().strip(".,()") not in
               ("of", "and", "the", "continued")]
    if not any(len(letters(w)) >= 4 for w in content) or not all(re.search(r"[A-Z]", w) for w in content):
        return None
    # small caps: mostly capitals, or a word with a capital after its first
    # letter ("Vinca MInor."), or OCR'd as title case ("Pioric Acrp.") on a line
    # of its own — a one-word "Sepia." line is a comparison table cell
    if not (is_capsy(t) or any(re.search(r"[A-Za-z][A-Z]", w) for w in content)
            or standalone and len(content) >= 2 and t.endswith(".")):
        return None
    return norm(re.sub(r"\(?\bcontinued\b\)?", "", t, flags=re.I))


def stream(pages, last):
    """(canvas, line, standalone) for every body line of the lectures, running
    headers dropped; standalone: a blank line (or the page end) follows."""
    for i in range(FIRST_PAGE, last):
        lines = drop_running_header(pages[i].split("\n"))
        for j, line in enumerate(lines):
            t = line.strip()
            if t and not is_junk(t) and not BOOK_TITLE_RE.search(t):
                standalone = j + 1 == len(lines) or not lines[j + 1].strip()
                yield i, clean_line(t), standalone


def roman(n: int) -> str:
    out = ""
    for v, r in ((50, "L"), (40, "XL"), (10, "X"), (9, "IX"), (5, "V"), (4, "IV"), (1, "I")):
        while n >= v:
            out, n = out + r, n - v
    return out


def title_case(s: str) -> str:
    small = {"of", "and", "the", "in"}
    out = []
    for i, w in enumerate(s.lower().split()):
        out.append(w if i and w in small else w[:1].upper() + w[1:])
    return " ".join(out)


def lecture_title(lines, k):
    """The lecture's title line(s) after LECTURE n; a title ending in "AND" or a
    comma runs on to a next line in capitals. Returns (title, index after it)."""
    title = lines[k][1] if k < len(lines) else ""
    k += 1
    while k < len(lines) and re.search(r"(\bAND|,)\W*$", title) and is_capsy(lines[k][1]):
        title, k = f"{title} {lines[k][1]}", k + 1
    return title, k


def split_chapters(pages, last, review=None):
    """[(name, lines)] per chapter, in book order.

    A lecture title or family sub-heading opens an introduction chapter; it is
    named "… (introduction)" when a remedy heading follows it in the lecture.
    With review (a list), headings are collected instead of checked.
    """
    def lookup(table, key, page, what):
        if key in table:
            return table[key]
        if review is None:
            raise SystemExit(f"canvas {page}: unknown {what} {key!r}")
        return None

    out = []  # [name, lines, intro_of_lecture or 0]
    lecture = 0
    lines = list(stream(pages, last))
    k = 0
    while k < len(lines):
        page, t, standalone = lines[k]
        if LECTURE_RE.match(t):
            lecture += 1
            title, k = lecture_title(lines, k + 1)
            key = norm(re.sub(r"\(?\bcontinued\b\)?", "", title, flags=re.I))
            if review is not None:
                review.append((page, f"LECTURE {roman(lecture)}", title))
            name = lookup(LECTURE_TITLES, key, page, "lecture title") or title_case(key)
            if name.startswith("="):  # the lecture is one remedy's chapter
                out.append([name[1:], [], 0])
            else:
                out.append([f"Lecture {roman(lecture)} — {name}", [], lecture])
            continue
        key = FORCED_HEADINGS.get(t) or heading_key(t, standalone)
        if t in FORCED_HEADINGS:
            name = FORCED_HEADINGS[t]
        elif key is not None and key not in NOT_A_HEADING:
            if review is not None:
                review.append((page, key, t))
            name = lookup(NAMES, key, page, "heading")
        else:
            name = None
        if name is None:
            out[-1][1].append(t)
        elif name.startswith("+"):  # a family sub-heading inside the lecture
            out.append([f"Lecture {roman(lecture)} — {name[1:]}", [], lecture])
        elif name:  # a remedy heading ("" drops the line: a heading's second line)
            if out[-1][2] == lecture and out[-1][1]:
                out[-1][0] += " (introduction)"
            out.append([name, [], 0])
            # a run-in heading is the sentence's subject: "MILLEFOLIUM / is of interest"
            nxt = lines[k + 1][1] if k + 1 < len(lines) else ""
            if not t.endswith(".") and nxt[:1].islower():
                out[-1][1].append(title_case(t))
        k += 1
    if lecture != LECTURES:
        raise SystemExit(f"found {lecture} lectures, expected {LECTURES}")
    return [(name, body) for name, body, _ in out]


def paragraphs(lines, full, vocab):
    """Join OCR lines into paragraphs: a short line ending a sentence closes one."""
    paras, cur = [], ""
    for t in lines:
        if cur.endswith("-") and not cur.endswith(" -"):
            head = re.search(r"(\S+)-$", cur).group(1)
            tail = re.match(r"\S+", t).group(0)
            joined = (letters(head) + letters(tail)).lower()
            hyph = (letters(head) + "-" + letters(tail)).lower()
            if vocab[hyph] > vocab[joined]:
                cur = cur + t
            else:
                cur = cur[:-1] + t
        else:
            cur = f"{cur} {t}" if cur else t
        if re.search(r"[.!?:\"')]$", t) and len(t) < full * 0.85:
            paras.append(cur)
            cur = ""
    if cur:
        paras.append(cur)
    return paras


def slugify(s: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")


def build(pages):
    last = INDEX_PAGE
    full = statistics.median(len(t) for _, t, _ in stream(pages, last))
    vocab = Counter(w.lower() for _, t, _ in stream(pages, last) for w in re.findall(r"[A-Za-z]+(?:-[A-Za-z]+)*", t[:-1]))

    chapters = {}  # name → paragraphs; a remedy taught again later runs on
    carry = []  # a lecture introduction too short for a chapter of its own
    for name, lines in split_chapters(pages, last):
        paras = carry + paragraphs(lines, full, vocab)
        carry = []
        if name.startswith("Lecture ") and sum(map(len, paras)) < MIN_INTRO:
            carry = paras  # runs on into the next chapter
        elif paras:
            chapters.setdefault(name, []).extend(paras)

    remedies = []
    for name, paras in chapters.items():
        text = clean_ocr("\n\n".join(fix_words(p) for p in paras))
        remedies.append({"slug": slugify(name), "name": name, "commonName": None, "text": text})

    return {
        "id": "farrington",
        "title": "A Clinical Materia Medica",
        "author": "E. A. Farrington",
        "source": "E. A. Farrington, A Clinical Materia Medica: being a course of lectures delivered at "
        "the Hahnemann Medical College of Philadelphia, 2nd ed., ed. Clarence Bartlett, rev. S. Lilienthal "
        "(Philadelphia: Hahnemann Publishing House, 1890). Scan: Wellcome Collection, b21118838.",
        "note": "Public domain (published 1890). Text OCR'd from the Wellcome Collection's scan — expect "
        "occasional OCR errors; the synoptic tables that open some lectures lost their layout. "
        "Each lecture's family introduction is its own chapter.",
        "remedyCount": len(remedies),
        "remedies": remedies,
    }


# Unambiguous OCR misreadings (none is an English or Latin word), picked from
# the words that occur in no other bundled book. Keys are lower-case; a
# capital first letter is kept.
WORD_FIXES = {
    # œ / æ read as "ce", "ee", "ze"
    "diarrhcea": "diarrhoea", "gonorrhcea": "gonorrhoea", "gonorrhceal": "gonorrhoeal",
    "dysmenorrhcea": "dysmenorrhoea", "otorrhcea": "otorrhoea", "balanorrheea": "balanorrhoea",
    "cedema": "oedema", "cesophagus": "oesophagus", "cesophagitis": "oesophagitis",
    "fcetid": "foetid", "feetid": "foetid", "homceopathic": "homoeopathic", "homceopathy": "homoeopathy",
    "homeeopathy": "homoeopathy", "dyspneea": "dyspnoea", "feeces": "faeces", "feecal": "faecal",
    "ozeena": "ozaena", "anzemia": "anaemia", "anzemic": "anaemic", "hypereemia": "hyperaemia",
    "hyperzemia": "hyperaemia", "heemorrhages": "haemorrhages", "aphthee": "aphthae",
    "papillee": "papillae", "preecordial": "praecordial", "hyperzesthesia": "hyperaesthesia",
    "aithusa": "aethusa",
    # c read as "e"
    "calearea": "calcarea", "eatarrh": "catarrh", "mereurius": "mercurius", "hyoseyamus": "hyoscyamus",
    "hydrocyanie": "hydrocyanic", "muriatie": "muriatic", "neuralgie": "neuralgic", "cardiae": "cardiac",
    "fluorie": "fluoric", "nitrie": "nitric", "adynamie": "adynamic", "indieated": "indicated",
    "earb": "carb", "erying": "crying", "duleamara": "dulcamara", "arseniewm": "arsenicum",
    "coceus": "coccus", "zine": "zinc",
    # other letters
    "todine": "iodine", "jodine": "iodine", "nuzx": "nux", "jgnatia": "ignatia", "grelsemium": "gelsemium",
    "ouprum": "cuprum", "stlicea": "silicea", "yomiting": "vomiting", "jancinating": "lancinating",
    "jong": "long", "haye": "have", "codrdination": "coordination", "pheumogastric": "pneumogastric",
    "cimez": "cimex", "lawrocerasus": "laurocerasus", "huphorbium": "euphorbium", "schiissler": "schüssler",
    # words run together
    "thissymptom": "this symptom", "thesymptoms": "the symptoms", "weare": "we are", "wealso": "we also",
    "isin": "is in", "likea": "like a", "hasa": "has a", "thesun": "the sun", "tothe": "to the",
    "theskin": "the skin", "itis": "it is",
}
# "um" read as "wm" (Natrwm, Gelsemiwm): no word ends in "wm".
WM_RE = re.compile(r"(?<=[a-z]{3})wm\b")


def fix_words(p: str) -> str:
    def sub(m):
        w = m.group(0)
        fixed = WORD_FIXES.get(w.lower())
        if not fixed:
            return w
        return fixed[:1].upper() + fixed[1:] if w[:1].isupper() else fixed
    p = WM_RE.sub("um", p)
    # a quote mark standing alone is a speck, or an opening quote OCR spaced
    # off its word ('The " pratensis" has') when the sentence closes it
    p = re.sub(r'(^|\s)" (?=[^"\s][^"]{0,120}"(?:\W|$))', r'\1"', p)
    p = re.sub(r"(^|\s)[\"'](?=\s|$)", r"\1", p)
    # whole words only: "-itis" in "gastr-itis" is not "it is"
    return re.sub(r"(?<![\w-])[A-Za-z]+(?![\w-])", sub, p).strip()


if __name__ == "__main__":
    pages = json.load(open(sys.argv[1], encoding="utf-8"))
    if len(sys.argv) > 2 and sys.argv[2] == "--headings":
        review = []
        split_chapters(pages, INDEX_PAGE, review)
        for page, key, t in review:
            print(f"{page:4d}  {key:40s} {t}")
        sys.exit(0)
    dst = sys.argv[2] if len(sys.argv) > 2 else "public/books/farrington.json"
    data = build(pages)
    with open(dst, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, separators=(",", ":"))
    print(f"{data['remedyCount']} chapters → {dst}")
