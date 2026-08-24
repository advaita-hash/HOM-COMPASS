# HOM-COMPASS

**AI-powered Homeopathic Repertory & Materia Medica** — a full-stack web
application modelled after professional desktop platforms (RadarOpus, Synthesis,
Hompath Firefly), built on a **Supabase GraphRAG knowledge graph** (relational
Node/Edge schema + `pgvector` for hybrid entity resolution) with a React /
Tailwind frontend.

> ⚠️ **Status: early build.** The project skeleton, design system, routing
> shell, Supabase client and the GraphRAG database schema are in place. Working
> modules so far: **Dashboard**, **Remedy of the Day**, **Materia Medica**
> (browse + search) and the **Library** (book uploads). Repertory,
> Repertorisation, Knowledge Graph and Patients & Cases are still stubbed.

### Implemented so far

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

  > **Kent data caveat:** the uploaded Kent PDF was compressed (which strips
  > bold/italic) and page-trimmed, so grades are *reconstructed from letter-case*
  > (emphasised = 2, plain = 1) and are approximate, remedy tallies carry some OCR
  > noise, and coverage runs Mind → Urine only. Use the study seed for
  > hand-verified accuracy.
- **Reference Books** — full-text materia medica, browsable and searchable by
  remedy. Ships with two classic works (Boericke's *Pocket Manual* and Tyler's
  *Homœopathic Drug Pictures*), served as static JSON and read in an in-app
  reader. Extracted from source PDFs (Boericke via OCR).
- **Library** — drag-and-drop upload of repertories / materia medica. In demo
  mode books are catalogued locally (persisted in the browser); with a Supabase
  backend the ingestion function parses them into the knowledge graph.

---

## Architecture

```
┌──────────────────────────────┐        ┌──────────────────────────────────┐
│  React + Tailwind frontend    │        │  Supabase                        │
│  (Vite, TS, React Router,     │  RPC   │  ├─ Postgres + pgvector          │
│   TanStack Query, Zustand)    │◀──────▶│  │   ├─ patients / cases         │
│                              │        │  │   ├─ graph_nodes (VECTOR 1536)│
│  Modules:                    │        │  │   └─ graph_edges (weighted)   │
│   • Dashboard                │        │  ├─ graphrag_repertorize_symptoms│
│   • Repertory search         │        │  │   (multi-hop traversal RPC)   │
│   • Repertorisation board    │        │  └─ Edge Functions               │
│   • Materia Medica           │        │      ├─ generate-embedding       │
│   • Knowledge Graph explorer │        │      ├─ repertorize              │
│   • Patients & Cases         │        │      └─ ai-case-analysis         │
└──────────────────────────────┘        └──────────────────────────────────┘
```

### GraphRAG data model

Everything in the repertory is a **node** with a `label`
(`REMEDY`, `RUBRIC`, `CHAPTER`, `MODALITY`, `MODERN_CONCEPT`) and a 1536-dim
`embedding`. **Edges** connect them with a `relationship_type`
(`HAS_RUBRIC`, `BELONGS_TO_CHAPTER`, `AGGRAVATED_BY`, `SYNONYM_OF`, …) and a
`weight` that encodes the repertory **grade** (Grade 1 = 1.0 … Grade 4 = 4.0).

Repertorisation is a **hybrid vector + graph traversal**: free-text symptoms are
embedded, matched to the nearest rubric/modality nodes by cosine similarity,
then the graph is traversed to remedy nodes and scores are aggregated by grade.
This lives in the `graphrag_repertorize_symptoms` Postgres function
(`supabase/migrations/0001_graphrag_schema.sql`).

---

## Tech stack

| Layer     | Choice                                                        |
| --------- | ------------------------------------------------------------- |
| Build     | Vite 5 + TypeScript 5                                         |
| UI        | React 18, Tailwind CSS 3, lucide-react                        |
| Routing   | React Router 6                                                |
| Data      | TanStack Query, `@supabase/supabase-js`                       |
| State     | Zustand (repertorisation worksheet)                          |
| Backend   | Supabase (Postgres + pgvector + Edge Functions)              |

---

## Getting started

```bash
npm install
cp .env.example .env      # optional — app runs in demo mode without it
npm run dev
```

Open http://localhost:5173.

### Demo mode

With **no** `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`, the app runs against
a bundled seed knowledge graph so every module is explorable without a backend.
The sidebar shows a **Demo mode** indicator; supplying credentials switches it to
**Connected**.

### Connecting Supabase

1. Create a Supabase project and run the migration in
   `supabase/migrations/0001_graphrag_schema.sql` (SQL editor or
   `supabase db push`).
2. Deploy the Edge Functions under `supabase/functions/` and set their secrets
   (see `.env.example`).
3. Put `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `.env`.

---

## Project layout

```
├─ index.html
├─ src/
│  ├─ main.tsx            # app bootstrap (providers, router)
│  ├─ App.tsx             # shell: sidebar + routed modules
│  ├─ index.css           # Tailwind + design-system components
│  └─ lib/
│     ├─ supabase.ts      # client + demo-mode detection
│     └─ types.ts         # domain model (mirrors the DB schema)
├─ supabase/
│  └─ migrations/
│     └─ 0001_graphrag_schema.sql
├─ tailwind.config.js
├─ vite.config.ts
└─ tsconfig*.json
```

---

## Disclaimer

HOM-COMPASS is clinical decision-support software for trained homeopathic
practitioners. It does not provide medical diagnoses and is not a substitute for
professional judgement.
