import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, BookText, FlaskConical, Loader2 } from 'lucide-react';
import { canonicalName } from '../../lib/remedyName';
import { REMEDIES } from '../../data/remedies';
import ABBREV from '../../data/remedyAbbrev.json';
import { useRepertoryById } from '../repertory/repertoryData';
import { findBookRemedy, useBook } from '../books/booksIndex';
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

export function resolveRemedy(param: string): string | undefined {
  const k = key(param);
  return INDEX.get(k) ?? INDEX.get(key(param.replace(/\./g, '')));
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
  const name = resolveRemedy(decodeURIComponent(param));
  const { data: rep, isLoading, error } = useRepertoryById('kent');
  const boericke = useBook('boericke');
  const tyler = useBook('tyler');
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
      <div className="card p-8 text-center">
        <h1 className="text-lg font-semibold">Remedy not found</h1>
        <p className="mt-2 text-sm text-slate-500">
          “{decodeURIComponent(param)}” is not in the Repertorium Publicum. Try its full name or Kentian abbreviation.
        </p>
        <Link to="/repertory" className="btn btn-ghost mt-4 inline-flex">
          Open the repertory
        </Link>
      </div>
    );
  }

  const [abbr, alts = []] = TABLE[name];
  const display = canonicalName(name);
  const curated = REMEDIES.find((r) => r.abbr === abbr || canonicalName(r.name) === display);
  const bk = boericke.data ? findBookRemedy(boericke.data, name) : undefined;
  const ty = tyler.data ? findBookRemedy(tyler.data, name) : undefined;

  return (
    <div className="space-y-5">
      <Link to="/repertory" className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800">
        <ArrowLeft className="h-3.5 w-3.5" /> Repertory
      </Link>

      <header className="card p-5">
        <div className="flex flex-wrap items-baseline gap-3">
          <h1 className="text-2xl font-semibold text-slate-900">{display}</h1>
          <span className="rounded-md bg-brand-50 px-2 py-0.5 font-mono text-sm font-semibold text-brand-700" title="Kentian abbreviation">
            {abbr}
          </span>
        </div>
        {display !== name && <p className="mt-1 text-sm text-slate-500">Repertory name: {name}</p>}
        {alts.length > 0 && <p className="mt-1 text-sm text-slate-500">Also known as {alts.join(', ')}</p>}
        <div className="mt-4 flex flex-wrap gap-2">
          {curated && (
            <Link to={`/materia-medica/${curated.id}`} className="btn btn-ghost inline-flex items-center gap-1.5">
              <FlaskConical className="h-4 w-4" /> Materia Medica profile
            </Link>
          )}
          {bk && (
            <Link to={`/books/boericke/${bk.slug}`} className="btn btn-ghost inline-flex items-center gap-1.5">
              <BookText className="h-4 w-4" /> Boericke
            </Link>
          )}
          {ty && (
            <Link to={`/books/tyler/${ty.slug}`} className="btn btn-ghost inline-flex items-center gap-1.5">
              <BookText className="h-4 w-4" /> Tyler
            </Link>
          )}
        </div>
      </header>

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
                className="input min-w-0 flex-1 rounded-lg border px-3 py-2 text-sm"
                placeholder="Filter rubrics…"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setShown(PAGE);
                }}
                aria-label="Filter rubrics"
              />
              <select
                className="rounded-lg border px-3 py-2 text-sm"
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
              <div className="flex overflow-hidden rounded-lg border text-sm" role="group" aria-label="Minimum grade">
                {([1, 2, 3] as Grade[]).map((g) => (
                  <button
                    key={g}
                    onClick={() => {
                      setMinGrade(g);
                      setShown(PAGE);
                    }}
                    className={`px-3 py-2 ${minGrade === g ? 'bg-brand-50 font-semibold text-brand-700' : 'text-slate-600'}`}
                    aria-pressed={minGrade === g}
                  >
                    {g === 1 ? 'All grades' : `Grade ${g}+`}
                  </button>
                ))}
              </div>
            </div>
            <p className="mt-2 text-xs text-slate-500">
              <span className="text-grade-3 font-semibold uppercase">bold capitals</span> grade 3–4 ·{' '}
              <span className="text-grade-2 font-medium italic">italic</span> grade 2 · <span className="text-grade-1">plain</span> grade 1
            </p>

            {grouped.length === 0 ? (
              <p className="py-6 text-sm text-slate-500">No rubrics match.</p>
            ) : (
              <div className="mt-4 space-y-5">
                {grouped.map(([ch, list]) => (
                  <div key={ch}>
                    <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">{ch}</h3>
                    <ul className="divide-y divide-slate-100">
                      {list.map((r) => (
                        <li key={r.id} className="flex items-baseline justify-between gap-3 py-1.5 text-sm">
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
                  <button className="btn btn-ghost" onClick={() => setShown(shown + PAGE)}>
                    Show more ({(filtered.length - shown).toLocaleString()} left)
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
