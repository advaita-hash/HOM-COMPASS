# Reference-book ingestion pipeline

How the bundled reference books in `public/books/*.json` were produced from the
source PDFs. The generated JSON is what the app ships; these notes document the
method and the re-runnable cleanup step.

## Stages

1. **Text extraction**
   - _Tyler — Homœopathic Drug Pictures_ is a text PDF: extracted directly with
     [`pypdfium2`](https://pypi.org/project/pypdfium2/) (`get_textpage().get_text_range()`).
   - _Boericke — Pocket Manual_ **remedy text** now comes from the clean
     public-domain **Médi-T transcription** (`homeoint.org/books/boericmm/`),
     not OCR. The earlier build OCR'd a scanned image PDF with **Tesseract 5**;
     that text carried pervasive OCR errors (e.g. `setsations`→sensations,
     `fiver`→liver), so the monograph bodies were replaced with the transcription
     (matched to our 638 remedy entries by name — exact/prefix, then a guarded
     fuzzy pass and a hand-verified override table for synonyms such as
     Jequirity = Abrus precatorius). 611/638 entries were re-sourced; 27 obscure
     remedies absent from the transcription keep their prior (cleaned) text.
     Remedy names, slugs and the compact structure are unchanged.

2. **Parsing into remedies**
   - Detect monograph titles (all-caps chapter headings), skip front matter and
     the trailing Repertory section, and slice the body text between titles.
   - Boericke specifics: strip running page-headers, split `NAME—SYNONYM`
     headings on the em-dash, take the leading all-caps run as the remedy name,
     and fuzzy-dedupe OCR heading echoes.
   - **Running-header recovery:** some monographs have no clean title line — the
     name survives only in page-numbered running headers (e.g. `440 KREOSOTUM`).
     A recovery pass reads single-name running headers to find remedies missing
     from the detected titles and inserts boundaries for them (guarded against
     continuation-page fragments by prefix/substring checks).
   - **Title fixes:** a curated map corrects OCR-garbled remedy names, merges
     duplicate fragments into their canonical entry, and repairs split two-word
     titles (e.g. `MOSA` → *Cimicifuga Racemosa*, `RUBER` → *Cinnabaris*).
   - Output shape per book: `{ id, title, author, source, remedyCount,
     remedies: [{ slug, name, commonName, text }] }`.

3. **OCR cleanup** — `clean_books.py` (re-runnable, idempotent)
   - Repairs mis-decoded characters first: the Médi-T pages are cp1252, and
     their `œ`/`Œ` reached us as the C1 controls U+009C/U+008C
     (`Diarrh\x9ca` → `Diarrhoea`, `\x8cdema` → `Oedema`); Tyler's PDF text uses
     U+FFFE for hyphens (→ `-`). Any other C0/C1 control character except the
     paragraph newline is dropped.
   - Resolves the OCR `@` glyph (the `œ` ligature → `oe`; a lone `@` → the
     article "a").
   - Strips junk characters (`_ « » |`) and tidies punctuation/spacing.
   - Corrects section headers against a closed vocabulary
     (e.g. `Stemach.` → `Stomach.`, `Doge.` → `Dose.`).
   - Applies a curated list of high-confidence, unambiguous word fixes
     (e.g. `stumach` → `stomach`, `semarkable` → `remarkable`).

   Only high-confidence fixes are applied; deeper, low-frequency OCR quirks are
   left untouched to avoid introducing errors.

## Repertory (`gen_publicum.py`)

`public/repertory/kent.json` (the "Repertorium Publicum" option) is built from
the **OOREP** open database (`oorep.sql.gz`) — a complete, properly-graded (1–4)
public Kentian repertory with clean remedy names and full chapter coverage.

`gen_publicum.py` reads the OOREP PostgreSQL dump and emits a **compact** JSON
(remedy dictionary + integer-indexed rubric/grade pairs), which the app expands
at load. Attribution and licensing (GPL-3.0) are in
`public/repertory/ATTRIBUTION.md`.

> An earlier version reconstructed Kent from a scanned/compressed PDF via OCR,
> with grades approximated from letter-case; that was replaced by the OOREP
> import above, which has exact grades and full coverage.

## Allen's Keynotes (`gen_allen.py`)

_Allen's Keynotes Rearranged and Classified_ (B. Jain, 10th ed.) has a clean
text layer, so no OCR is needed:

```bash
python3 -m pip install pypdfium2
python3 scripts/ingestion/gen_allen.py "Allens Keynotes.pdf" public/books/allen.json
python3 scripts/ingestion/clean_books.py   # shared spelling normalisation
python3 scripts/ingestion/check_books.py   # must report 0 errors
```

The PDF isn't kept in the repo. The script also accepts the cached text layer
instead, as a JSON list of page strings (one per PDF page, 0-based), and then
doesn't need `pypdfium2`:

```bash
python3 scripts/ingestion/gen_allen.py allen-pages.json public/books/allen.json
```

Remedy titles are ALL-CAPS lines. Some carry a footnote mark (`LYSSINUM1`,
`TUBERCULINUM – BACILLINUM*`); the mark is accepted and dropped from the name,
otherwise that monograph runs on into the previous remedy's chapter. After a
change to the title rules, diff the old and new `allen.json` and check that
only the intended chapters changed.

The script keeps Allen's own classification: each remedy's `text` is
`"<Section>\n• keynote\n• keynote\n\n<Section>\n…"`, which the reader renders
as headings with bullet lists and the drug-picture distiller maps section by
section (Constitution, Mental Generals, Physical Generals, Modalities'
Aggravation and Amelioration). It also emits an optional `family` field. The
eight bowel nosodes (Bach / Paterson) are kept as prose; Paterson's essay and
the repertorial index at the back are skipped.

> **Copyright.** This is a copyrighted edition (B. Jain Publishers), used
> pending the publisher's permission. Serve it only from a deployment behind
> Vercel Deployment Protection, and don't commit the source PDF.

## Re-running the cleanup

```bash
python3 scripts/ingestion/clean_books.py
```

Operates in place on `public/books/{boericke,tyler,allen}.json`. Safe to run repeatedly.

The section-label fixer snaps near-miss headings onto the closed vocabulary
(`CANON`), so a real heading that happens to be close to one (e.g. `Eye`,
`Spleen`) must be listed in `KEEP_LABELS`. After changing the script, diff the
text before and after a run and check every label it changed.

## Checking the books — `check_books.py`

```bash
python3 scripts/ingestion/check_books.py          # or pass another books directory
```

Read-only; prints each problem and exits non-zero if there are any. Run it
after every re-ingestion or cleanup. It fails on:

- a book that doesn't parse, lacks `remedies`, or whose `remedyCount` is wrong;
- a remedy without `slug`/`name`/`text`, or with text under 120 characters;
- mis-decoded characters anywhere: C1 controls U+0080–U+009F or U+FFFE;
- duplicate slugs within a book;
- two differently named remedies with identical text (one monograph copied
  over another), except known synonyms listed in `SYNONYMS`
  (Ustilago / Ustilago Maydis);
- a Boericke entry with more than one `Dose.` section, counting OCR variants
  such as `Dose, —` (the next monograph ran into it — a second `Dose.` after a
  `Non-Homœopathic Uses. —` label is allowed), or with text after the
  `Copyright © Médi-T 1999 Home` footer;
- a Boericke polychrest (Sulphur, Lycopodium, Calcarea Carbonica, Pulsatilla,
  Natrum Muriaticum, Sepia, Phosphorus, Arsenicum Album, Nux Vomica, Lachesis)
  shorter than 2000 characters. An entry showing the "not yet available"
  notice is reported as a warning instead.

## Repairs to the Boericke text

Fixed from the Médi-T transcription of Boericke published at
homeoint.org/books/boericmm/. That site is not reachable from our build
environment, so the pages were taken from two public GitHub repositories that
keep copies of them, fetched via raw.githubusercontent.com:
`pragya6/homoeo-quiz` (`*.html`) and `kgsnipes/homeoparser` (`*.htm`). The two
copies of each page were compared word for word and agree. Each page was
converted to the format of the other entries:

- the page header (title, author, "Presented by Médi-T") and the monograph's
  own title line are dropped; the text runs up to the `Copyright ©` line;
- each `<p>` becomes a paragraph, separated by a blank line; tags are removed,
  HTML entities decoded and whitespace collapsed;
- the common name and synonym line are joined onto the start of the first
  paragraph;
- a section label `Mind.--` becomes `Mind. — `, any other `--` becomes ` — `,
  and `œ`/`Œ` become `oe`/`Oe`;
- `Copyright © Médi-T 1999 Home` is appended to the last paragraph, as in the
  other Médi-T entries.

The entries repaired (page paths relative to `boericmm/`):

- **Sulphur** held a copy of Sulphur Iodatum's text; it now has its own
  chapter (`s/sulph.htm`).
- **Illicium** (Médi-T: *Anisum Stellatum*) was OCR text with the next two
  monographs run into it; it now has its own text (`a/anis.htm`), and
  **Ilex Aquifolium** (`i/ilx-a.htm`) and **Indigo** (`i/indg.htm`) are separate
  entries.
- **Juniperus** carried Justicia Adhatoda's sections; it now has its own text
  (`j/juni-c.htm`). Justicia's own entry was intact apart from its
  `Relationship.` section, which, like most Médi-T entries, the original
  import dropped.

Unlike most Médi-T-sourced entries, these repaired entries keep their
`Relationship.` section.

> The source PDFs are not kept in the repo (their text now ships as JSON). To
> re-ingest a new book, reproduce stages 1–2 for that title, then run the
> cleanup.
