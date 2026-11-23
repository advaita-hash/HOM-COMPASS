# HOM-COMPASS

**Homeopathic repertory, repertorisation worksheet and materia medica reference
for practitioners** — a React / Tailwind web application modelled after
professional desktop platforms (RadarOpus, Synthesis, Hompath Firefly).

> **Status: working build.** All core modules are implemented and run in demo
> mode (no backend required).

### Modules

- **Search** — one box across the curated materia medica, both reference books
  (full text) and the repertory, with highlighted snippets.
- **Patients & Cases** — patient records and per-visit case-taking (symptom
  lists + notes), persisted in the browser; mirrors the `patients`/`cases`
  tables.
- **Knowledge Graph** — an interactive remedy · rubric · chapter explorer:
  search a node, see its grade-weighted connections radially, click to traverse.

- **Dashboard** — daily remedy hero card + quick stats and actions.
- **Remedy of the Day** — a short daily study card that rotates deterministically
  through the bundled materia medica (same remedy for everyone on a given date).
- **Materia Medica** — searchable list of classic polychrests with short-form
  profiles (keynotes, mind, generals, modalities, representative rubrics), with
  cross-links to the full drug pictures in the reference books.
- **Repertory** — searchable, chapter-filterable rubrics with grade-coloured
  remedy lists; add rubrics to the repertorisation worksheet in one click. A
  repertory selector switches between **Kent's Repertory** (~27k rubrics,
  Mind–Urine, extracted from a scanned PDF) and a hand-verified **study seed**.
- **Repertorisation** — the analysis board: a rubric × remedy grid with live,
  grade-weighted scoring (Σ grade × rubric intensity), remedy ranking, adjustable
  rubric intensities, and cross-links to the reference books.

  The default **Repertorium Publicum** is a complete public Kentian repertory
  (~74k rubrics, all chapters, proper grades 1–4, clean remedy names), sourced
  from the open [OOREP](https://github.com/nondeterministic/oorep) database and
  **GPL-3.0-licensed** — see `public/repertory/ATTRIBUTION.md`. A hand-verified
  **Study Seed** is also available (original to this project, not GPL).
- **Reference Books** — full-text materia medica, browsable and searchable by
  remedy. Ships with two classic works (Boericke's *Pocket Manual* and Tyler's
  *Homœopathic Drug Pictures*), served as static JSON and read in an in-app
  reader. Extracted from source PDFs (Boericke via OCR).
- **Library** — a list of your own repertory / materia medica files (only the
  name, type and size are kept, in the browser).

---

## Architecture

A static React app on Vercel with one server function:

- **Browser:** every page, the repertory and the books (static JSON under
  `public/`), plus patients, cases and notes saved in the browser's storage.
- **`api/ask.ts`:** the "Ask the books" Vercel function. It picks book passages
  and asks Claude to answer only from them, with citations.
- **Common Room:** sign-in, remedy notes and Premium come from Common Room's
  Supabase project (`src/lib/commonRoom.ts`, `src/lib/commonRoomConfig.ts`).

## Tech stack

| Layer   | Choice                                                    |
| ------- | --------------------------------------------------------- |
| Build   | Vite 5 + TypeScript 5                                     |
| UI      | React 18, Tailwind CSS 3, lucide-react                    |
| Routing | React Router 6                                            |
| Data    | TanStack Query, Zustand (saved in the browser)            |
| Server  | One Vercel function (`api/ask.ts`) using the Claude API   |

## Getting started

```bash
npm install
npm run dev
```

Open http://localhost:5173. "Ask the books" needs `ANTHROPIC_API_KEY` set in
the Vercel project (it doesn't run under `npm run dev`).

---

## Disclaimer

HOM-COMPASS is clinical decision-support software for trained homeopathic
practitioners. It does not provide medical diagnoses and is not a substitute for
professional judgement.
