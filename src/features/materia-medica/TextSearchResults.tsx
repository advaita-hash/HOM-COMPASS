import { Fragment } from 'react';
import { Link } from 'react-router-dom';
import { canonicalName } from '../../lib/remedyName';
import { termRanges } from './textSearch';
import type { TextGroup } from './useTextSearch';

/** Lines shown at most; the count above the results says how many matched. */
const SHOWN = 300;

function Marked({ text, terms }: { text: string; terms: string[] }) {
  const ranges = termRanges(text, terms);
  let at = 0;
  return (
    <>
      {ranges.map(([a, b]) => {
        const before = text.slice(at, a);
        at = b;
        return (
          <Fragment key={a}>
            {before}
            <mark className="rounded-sm bg-brand-100 text-brand-800">{text.slice(a, b)}</mark>
          </Fragment>
        );
      })}
      {text.slice(at)}
    </>
  );
}

/** Matching lines grouped by remedy; tapping a line opens it in the book's Full text. */
export function TextSearchResults({
  groups,
  terms,
  total,
  badge,
}: {
  groups: TextGroup[];
  terms: string[];
  total: number;
  badge: (source: string) => string;
}) {
  let left = SHOWN;
  const shown = groups.flatMap((g) => {
    if (left <= 0) return [];
    const hits = g.hits.slice(0, left);
    left -= hits.length;
    return [{ ...g, hits }];
  });
  return (
    <div>
      <p className="mb-3 text-sm text-ink/70" aria-live="polite">
        {total === 0
          ? 'No lines contain all of these words.'
          : `${total.toLocaleString()} ${total === 1 ? 'line' : 'lines'} in ${groups.length.toLocaleString()} ${
              groups.length === 1 ? 'remedy' : 'remedies'
            }${total > SHOWN ? ` · showing the first ${SHOWN}, add a word to narrow` : ''}`}
      </p>
      <ul className="space-y-3">
        {shown.map((g) => (
          <li key={g.key} className="card p-4">
            <div className="mb-2 flex items-center gap-2">
              <Link
                to={g.to}
                className="min-w-0 flex-1 truncate font-serif text-base font-semibold text-slate-800 hover:underline"
              >
                {canonicalName(g.name)}
              </Link>
              <span className={`shrink-0 rounded-full px-2 py-1 text-2xs font-medium ${badge(g.source)}`}>
                {g.source === 'Curated' ? 'Study card' : g.source}
              </span>
            </div>
            <ul className="divide-y divide-ink/10">
              {g.hits.map((h, i) => (
                <li key={i}>
                  <Link
                    to={h.to}
                    className="block min-h-[44px] py-2 font-serif text-subhead leading-relaxed text-ink/80 hover:text-ink/90"
                  >
                    <Marked text={h.text} terms={terms} />
                  </Link>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </div>
  );
}
