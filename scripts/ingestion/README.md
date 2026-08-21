# Reference-book ingestion pipeline

How the bundled reference books in `public/books/*.json` were produced from the
source PDFs. The generated JSON is what the app ships; these notes document the
method and the re-runnable cleanup step.

## Stages

1. **Text extraction**
   - _Tyler — Homœopathic Drug Pictures_ is a text PDF: extracted directly with
     [`pypdfium2`](https://pypi.org/project/pypdfium2/) (`get_textpage().get_text_range()`).
   - _Boericke — Pocket Manual_ is a **scanned image PDF** (no embedded text):
     each page was rasterised with `pypdfium2` at ~200 DPI and OCR'd with
     **Tesseract 5** via `pytesseract`.

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
   - Resolves the OCR `@` glyph (the `œ` ligature → `oe`; a lone `@` → the
     article "a").
   - Strips junk characters (`_ « » |`) and tidies punctuation/spacing.
   - Corrects section headers against a closed vocabulary
     (e.g. `Stemach.` → `Stomach.`, `Doge.` → `Dose.`).
   - Applies a curated list of high-confidence, unambiguous word fixes
     (e.g. `stumach` → `stomach`, `semarkable` → `remarkable`).

   Only high-confidence fixes are applied; deeper, low-frequency OCR quirks are
   left untouched to avoid introducing errors.

## Re-running the cleanup

```bash
python3 scripts/ingestion/clean_books.py
```

Operates in place on `public/books/*.json`. Safe to run repeatedly.

> The source PDFs are not kept in the repo (their text now ships as JSON). To
> re-ingest a new book, reproduce stages 1–2 for that title, then run the
> cleanup.
