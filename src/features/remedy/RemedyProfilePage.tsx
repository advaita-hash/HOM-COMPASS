import { useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, BookText, FlaskConical, Loader2, NotebookPen, SearchX } from 'lucide-react';
import { EmptyState } from '../../components/ui/EmptyState';
import { SegmentedControl } from '../../components/ui/SegmentedControl';
import MyRemedyNotes from '../notes/MyRemedyNotes';
import { RemedyNotepad } from '../notepad/RemedyNotepad';
import { canonicalName } from '../../lib/remedyName';
import { REMEDIES } from '../../data/remedies';
import ABBREV from '../../data/remedyAbbrev.json';
import { useRepertoryById } from '../repertory/repertoryData';
import { useQueries } from '@tanstack/react-query';
import { BOOKS, bookQueryOptions, findBookRemedy } from '../books/booksIndex';
import type { Grade } from '../repertory/types';

// ---------------------------------------------------------------------------
// Remedy profile: one remedy and its repertory settings — every rubric of the
// Repertorium Publicum it appears in, grouped by chapter with its grade.
//
// Opened at /remedy/:name, where name may be the full repertory name
// ("Nux Vomica"), a Kentian abbreviation ("Nux-v."), an alternative name, or a
// classic spelling ("Kali Bichromicum" for "Kalium Bichromicum"). Common Room's
// OPD notes link here for every remedy a student mentions.
// ---------------------------------------------------------------------------

const TABLE = ABBREV as unknown as Record<string, [string] | [string, string[]]>;
const SAME: Record<string, string> = { kali: 'kalium', natrum: 'natrium', platina: 'platinum', china: 'cinchona' };
const key = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(' ')
    .map((w) => SAME[w] ?? w)
    .join(' ');

/** Lookup by full name, abbreviation (with or without its dots) or alternative name. */
const INDEX = (() => {
  const m = new Map<string, string>();
  for (const [name, [abbr, alts = []]] of Object.entries(TABLE)) {
    for (const k of [abbr, name, ...alts]) if (!m.has(key(k))) m.set(key(k), name);
  }
  return m;
})();

/** Everyday short names whose prefix match would otherwise be a toss-up. */
const COMMON: Record<string, string> = {
  nux: 'Nux Vomica',
  merc: 'Mercurius Solubilis',
  mercurius: 'Mercurius Solubilis',
};

/** Every spelling of each remedy as word lists, for word-prefix matching. */
const SPELLINGS = Object.entries(TABLE).flatMap(([name, [abbr, alts = []]]) =>
  [name, ...alts].map((s) => ({ name, abbr, words: key(s).split(' ') })),
);

/**
 * Common names: "Pulsatilla", "Arsenicum", "Nat mur", "Calc carb", "Rhus tox".
 * Each typed word must start the matching word of a full name, in order. When
 * several remedies fit, the classic polychrest wins — the one with the plain
 * Kentian abbreviation ("Puls." over "Puls-n.", "Ars." over "Ars-i.").
 */
function resolveCommon(k: string): string | undefined {
  if (COMMON[k] && TABLE[COMMON[k]]) return COMMON[k];
  const typed = k.split(' ').filter(Boolean);
  if (!typed.length) return undefined;
  const hits = SPELLINGS.filter(
    (s) => s.words.length >= typed.length && typed.every((w, i) => s.words[i].startsWith(w)),
  );
  if (!hits.length) return undefined;
  hits.sort(
    (a, b) =>
      Number(a.abbr.includes('-')) - Number(b.abbr.includes('-')) ||
      a.words.length - b.words.length ||
      a.abbr.length - b.abbr.length ||
      a.name.localeCompare(b.name),
  );
  return hits[0].name;
}

export function resolveRemedy(param: string): string | undefined {
  const k = key(param);
  return (
    INDEX.get(k) ??
    INDEX.get(key(param.replace(/\./g, ''))) ??
    resolveCommon(k) ??
    resolveCommon(key(param.replace(/\./g, '')))
  );
}

const GRADE_CLASS: Record<Grade, string> = {
  1: 'text-grade-1',
  2: 'text-grade-2 font-medium italic',
  3: 'text-grade-3 font-semibold uppercase',
  4: 'text-grade-4 font-bold uppercase',
};
const PAGE = 300;

export default function RemedyProfilePage() {
  const { name: param = '' } = useParams();
  const [search, setSearch] = useSearchParams();
  const tab = search.get('tab') === 'notes' ? 'notes' : 'repertory';
  const setTab = (t: 'repertory' | 'notes') => setSearch(t === 'notes' ? { tab: 'notes' } : {}, { replace: true });
  const name = resolveRemedy(decodeURIComponent(param));
  const { data: rep, isLoading, error } = useRepertoryById('kent');
  const books = useQueries({ queries: BOOKS.map((b) => bookQueryOptions(b.id)) });
  const [chapter, setChapter] = useState('all');
  const [minGrade, setMinGrade] = useState<Grade>(1);
  const [query, setQuery] = useState('');
  const [shown, setShown] = useState(PAGE);

  const rows = useMemo(() => {
    if (!rep || !name) return [];
    return rep.rubrics.flatMap((r) => {
      const hit = r.remedies.find((x) => x.name === name);
      return hit ? [{ id: r.id, chapter: r.chapter, rubric: r.rubric, grade: hit.grade, others: r.remedies.length }] : [];
    });
  }, [rep, name]);

  const counts = useMemo(() => {
    const c = { 1: 0, 2: 0, 3: 0, 4: 0 } as Record<Grade, number>;
    for (const r of rows) c[r.grade]++;
    return c;
  }, [rows]);

  const chapters = useMemo(() => [...new Set(rows.map((r) => r.chapter))], [rows]);
  const q = query.trim().toLowerCase();
  const filtered = rows.filter(
    (r) => (chapter === 'all' || r.chapter === chapter) && r.grade >= minGrade && (!q || r.rubric.toLowerCase().includes(q)),
  );
  const grouped = useMemo(() => {
    const g = new Map<string, typeof filtered>();
    for (const r of filtered.slice(0, shown)) g.set(r.chapter, [...(g.get(r.chapter) ?? []), r]);
    return [...g.entries()];
  }, [filtered, shown]);

  if (!name) {
    return (
      <div className="page">
        <div className="card">
          <EmptyState
            icon={SearchX}
            title="Remedy not found"
            description={<>“{decodeURIComponent(param)}” isn’t in the Repertorium Publicum. Try its full name or Kentian abbreviation.</>}
            action={
              <Link to="/repertory" className="btn-primary">
                Open the repertory
              </Link>
            }
          />
        </div>
      </div>
    );
  }

  const [abbr, alts = []] = TABLE[name];
  const display = canonicalName(name);
  const curated = REMEDIES.find((r) => r.abbr === abbr || canonicalName(r.name) === display);
  const bookLinks = BOOKS.flatMap((meta, i) => {
    const data = books[i].data;
    const hit = data ? findBookRemedy(data, name) : undefined;
    return hit ? [{ meta, slug: hit.slug }] : [];
  });

  return (
    <div className="page space-y-5">
      <Link to="/repertory" className="tap inline-flex items-center gap-1 text-sm text-brand-600 hover:text-brand-700">
        <ArrowLeft className="h-3.5 w-3.5" /> Repertory
      </Link>

      <header className="card p-5">
        <div className="flex flex-wrap items-baseline gap-3">
          <h1 className="text-2xl font-semibold text-slate-900">{display}</h1>
          <span className="rounded-md bg-brand-50 px-2 py-1 font-mono text-sm font-semibold text-brand-700" title="Kentian abbreviation">
            {abbr}
          </span>
        </div>
        {display !== name && <p className="mt-1 text-sm text-slate-500">Repertory name: {name}</p>}
        {alts.length > 0 && <p className="mt-1 text-sm text-slate-500">Also known as {alts.join(', ')}</p>}
        <div className="mt-4 flex flex-wrap gap-2">
          {curated && (
            <Link to={`/materia-medica/${curated.id}`} className="btn-ghost inline-flex items-center gap-2">
              <FlaskConical className="h-4 w-4" /> Materia Medica profile
            </Link>
          )}
          {bookLinks.map(({ meta, slug }) => (
            <Link key={meta.id} to={`/books/${meta.id}/${slug}`} className="btn-ghost inline-flex items-center gap-2">
              <BookText className="h-4 w-4" /> {meta.label}
            </Link>
          ))}
        </div>
      </header>

      <SegmentedControl
        ariaLabel="Remedy section"
        value={tab}
        onChange={setTab}
        options={[
          { value: 'repertory', label: <span className="inline-flex items-center gap-2"><BookText className="h-4 w-4" /> Repertory</span> },
          { value: 'notes', label: <span className="inline-flex items-center gap-2"><NotebookPen className="h-4 w-4" /> My notes</span> },
        ]}
      />

      {tab === 'notes' ? (
        <>
          <section className="card p-5" aria-labelledby="notepad-heading">
            <h2 id="notepad-heading" className="mb-3 text-lg font-semibold">
              Notepad
            </h2>
            <RemedyNotepad remedyKey={name} remedyName={display} />
          </section>
          <section className="card p-5" aria-labelledby="common-room-heading">
            <h3 id="common-room-heading" className="mb-3 text-base font-semibold">
              From Common Room
            </h3>
            <MyRemedyNotes remedy={name} abbr={abbr} />
          </section>
        </>
      ) : (
      <section className="card p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-lg font-semibold">Repertory</h2>
          <p className="text-sm text-slate-500">
            {rows.length.toLocaleString()} rubrics in {rep?.title ?? 'the repertory'} · grade 4: {counts[4]} · 3: {counts[3]} · 2:{' '}
            {counts[2]} · 1: {counts[1]}
          </p>
        </div>

        {isLoading ? (
          <div className="flex items-center gap-2 py-10 text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading the repertory…
          </div>
        ) : error ? (
          <p className="py-6 text-sm text-red-600">Could not load the repertory. Check your connection and reload.</p>
        ) : (
          <>
            <div className="mt-3 flex flex-wrap gap-2">
              <input
                className="input min-w-0 flex-1"
                placeholder="Filter rubrics…"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setShown(PAGE);
                }}
                aria-label="Filter rubrics"
              />
              <select
                className="rounded-lg border px-3 text-sm"
                value={chapter}
                onChange={(e) => {
                  setChapter(e.target.value);
                  setShown(PAGE);
                }}
                aria-label="Chapter"
              >
                <option value="all">All chapters</option>
                {chapters.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
              <SegmentedControl
                ariaLabel="Minimum grade"
                value={minGrade}
                onChange={(g) => {
                  setMinGrade(g);
                  setShown(PAGE);
                }}
                options={([1, 2, 3] as Grade[]).map((g) => ({
                  value: g,
                  label: g === 1 ? 'All grades' : `Grade ${g}+`,
                }))}
              />
            </div>
            <p className="mt-2 text-xs text-slate-500">
              <span className="text-grade-3 font-semibold uppercase">bold capitals</span> grade 3–4 ·{' '}
              <span className="text-grade-2 font-medium italic">italic</span> grade 2 · <span className="text-grade-1">plain</span> grade 1
            </p>

            {grouped.length === 0 ? (
              <EmptyState
                icon={SearchX}
                title="No matching rubrics"
                description="Nothing in this remedy’s repertory matches the current filter, chapter and grade."
                action={
                  <button
                    className="btn-secondary"
                    onClick={() => {
                      setQuery('');
                      setChapter('all');
                      setMinGrade(1);
                      setShown(PAGE);
                    }}
                  >
                    Clear filters
                  </button>
                }
              />
            ) : (
              <div className="mt-4 space-y-5">
                {grouped.map(([ch, list]) => (
                  <div key={ch}>
                    <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">{ch}</h3>
                    <ul className="divide-y divide-slate-100">
                      {list.map((r) => (
                        <li key={r.id} className="flex items-baseline justify-between gap-3 py-2 text-sm">
                          <span className={GRADE_CLASS[r.grade]}>{r.rubric.slice(ch.length).replace(/^,\s*/, '') || ch}</span>
                          <span className="shrink-0 font-mono text-xs text-slate-400" title={`${r.others} remedies in this rubric`}>
                            {r.grade} · {r.others}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
                {filtered.length > shown && (
                  <button className="btn-ghost" onClick={() => setShown(shown + PAGE)}>
                    Show more ({(filtered.length - shown).toLocaleString()} left)
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </section>
      )}
    </div>
  );
}
