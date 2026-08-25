import { useState } from 'react';
import { Link } from 'react-router-dom';
import { X } from 'lucide-react';
import type { Grade, Repertory } from './types';
import { repertorize, useWorksheet } from './worksheetStore';

const GRADE_CELL: Record<number, string> = {
  1: 'bg-slate-100 text-slate-500',
  2: 'bg-blue-100 text-blue-700 font-medium',
  3: 'bg-violet-100 text-violet-700 font-semibold',
  4: 'bg-red-100 text-red-700 font-bold',
};

const COLUMN_OPTIONS = [12, 25, 50];

function remedyBookLink(name: string) {
  return `/books/boericke?q=${encodeURIComponent(name.split(/\s+/)[0])}`;
}

/** The repertorisation grid + remedy ranking for the current worksheet. */
export function WorksheetGrid({
  rep,
  onRemedy,
}: {
  rep: Repertory | undefined;
  onRemedy?: (name: string) => void;
}) {
  const items = useWorksheet((s) => s.items);
  const remove = useWorksheet((s) => s.remove);
  const setIntensity = useWorksheet((s) => s.setIntensity);
  const [showN, setShowN] = useState(25);

  const { scores, rubrics } = repertorize(rep, items);
  const top = scores.slice(0, Math.min(showN, scores.length));
  const byId = new Map(rubrics.map((r) => [r.id, r]));

  if (items.length === 0) {
    return (
      <div className="card p-8 text-center text-sm text-slate-500">
        No rubrics yet — add them from the symptom translator or the{' '}
        <Link to="/repertory" className="text-brand-600 underline">
          Repertory
        </Link>
        .
      </div>
    );
  }

  return (
    <>
      {/* Ranked remedies — click for Materia Medica support */}
      <div className="mb-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {top.slice(0, 6).map((s, i) => {
          const inner = (
            <>
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-50 text-sm font-semibold text-brand-700">
                {i + 1}
              </span>
              <span className="flex-1 truncate text-left text-sm font-medium text-slate-800">
                {s.name}
              </span>
              <span className="text-xs text-slate-500">
                {s.rubricsCovered}/{items.length} · {s.totalScore}
              </span>
            </>
          );
          return onRemedy ? (
            <button
              key={s.name}
              onClick={() => onRemedy(s.name)}
              className="card flex items-center gap-3 p-3 text-left hover:shadow-md"
              title="Show Materia Medica support"
            >
              {inner}
            </button>
          ) : (
            <Link key={s.name} to={remedyBookLink(s.name)} className="card flex items-center gap-3 p-3 hover:shadow-md">
              {inner}
            </Link>
          );
        })}
      </div>

      {/* Controls */}
      <div className="mb-2 flex items-center justify-between text-xs text-slate-500">
        <span>
          {scores.length} remedies across {items.length} rubric
          {items.length === 1 ? '' : 's'}
        </span>
        <label className="inline-flex items-center gap-1.5">
          Show
          <select
            value={showN}
            onChange={(e) => setShowN(Number(e.target.value))}
            className="rounded border border-slate-200 bg-white px-1.5 py-0.5 text-xs"
          >
            {COLUMN_OPTIONS.map((n) => (
              <option key={n} value={n}>
                top {n}
              </option>
            ))}
            <option value={scores.length}>all ({scores.length})</option>
          </select>
        </label>
      </div>

      {/* Grid */}
      <div className="card overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-slate-200">
              <th className="sticky left-0 z-10 bg-white px-3 py-2 text-left font-medium text-slate-500">
                Rubric
              </th>
              <th className="px-2 py-2 text-center font-medium text-slate-400">Int.</th>
              {top.map((s) => (
                <th key={s.name} className="px-1 py-2 align-bottom">
                  {onRemedy ? (
                    <button
                      onClick={() => onRemedy(s.name)}
                      className="mx-auto block h-28 w-6 whitespace-nowrap text-left text-xs font-medium text-slate-600 hover:text-brand-600"
                      style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
                      title={`${s.name} — show Materia Medica support`}
                    >
                      {s.name}
                    </button>
                  ) : (
                    <Link
                      to={remedyBookLink(s.name)}
                      className="mx-auto block h-28 w-6 whitespace-nowrap text-left text-xs font-medium text-slate-600 hover:text-brand-600"
                      style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
                      title={s.name}
                    >
                      {s.name}
                    </Link>
                  )}
                </th>
              ))}
              <th className="px-2 py-2" />
            </tr>
          </thead>
          <tbody>
            {items.map(({ rubricId, intensity }) => {
              const rubric = byId.get(rubricId);
              if (!rubric) return null;
              return (
                <tr key={rubricId} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="sticky left-0 z-10 w-[360px] min-w-[240px] max-w-[360px] bg-white px-3 py-2 align-top">
                    <div className="break-words">
                      <span className="text-[10px] uppercase tracking-wide text-slate-400">
                        {rubric.chapter}
                      </span>{' '}
                      <span className="text-slate-800">{rubric.rubric}</span>
                    </div>
                  </td>
                  <td className="px-2 py-2 text-center">
                    <select
                      value={intensity}
                      onChange={(e) => setIntensity(rubricId, Number(e.target.value))}
                      className="rounded border border-slate-200 bg-white px-1 py-0.5 text-xs"
                      title="Rubric intensity"
                    >
                      {[1, 2, 3].map((n) => (
                        <option key={n} value={n}>
                          ×{n}
                        </option>
                      ))}
                    </select>
                  </td>
                  {top.map((s) => {
                    const g = s.grades[rubricId] as Grade | undefined;
                    return (
                      <td key={s.name} className="px-1 py-1 text-center">
                        {g ? (
                          <span
                            className={`inline-flex h-6 w-6 items-center justify-center rounded ${GRADE_CELL[g]}`}
                          >
                            {g}
                          </span>
                        ) : (
                          <span className="text-slate-200">·</span>
                        )}
                      </td>
                    );
                  })}
                  <td className="px-2 py-2 text-center">
                    <button
                      onClick={() => remove(rubricId)}
                      className="rounded p-1 text-slate-300 hover:bg-red-50 hover:text-red-600"
                      aria-label="Remove rubric"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-slate-200 bg-slate-50 font-semibold">
              <td className="sticky left-0 z-10 bg-slate-50 px-3 py-2 text-slate-600">Score</td>
              <td />
              {top.map((s) => (
                <td key={s.name} className="px-1 py-2 text-center text-brand-700">
                  {s.totalScore}
                </td>
              ))}
              <td />
            </tr>
            <tr className="bg-slate-50 text-xs text-slate-500">
              <td className="sticky left-0 z-10 bg-slate-50 px-3 py-1">Rubrics covered</td>
              <td />
              {top.map((s) => (
                <td key={s.name} className="px-1 py-1 text-center">
                  {s.rubricsCovered}
                </td>
              ))}
              <td />
            </tr>
          </tfoot>
        </table>
      </div>

      <p className="mt-3 text-xs text-slate-400">
        Score = Σ (grade × rubric intensity). Ranked by rubrics covered, then score.
        Showing {top.length} of {scores.length} remedies.
      </p>
    </>
  );
}
