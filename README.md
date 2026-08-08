# HOM-COMPASS

**AI-powered Homeopathic Repertory & Materia Medica** — a full-stack web
application modelled after professional desktop platforms (RadarOpus, Synthesis,
Hompath Firefly), built on a **Supabase GraphRAG knowledge graph** (relational
Node/Edge schema + `pgvector` for hybrid entity resolution) with a React /
Tailwind frontend.

> ⚠️ **Status: scaffolding.** The project skeleton, design system, routing
> shell, Supabase client and the GraphRAG database schema are in place. The
> feature modules (Repertory, Repertorisation, Materia Medica, Knowledge Graph,
> Patients & Cases) are stubbed and will be implemented next.

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
