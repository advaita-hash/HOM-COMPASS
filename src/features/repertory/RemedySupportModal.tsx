import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { BookText, Loader2, X } from 'lucide-react';
import { findBookRemedy, useBook } from '../books/booksIndex';
import type { Rubric } from './types';

const GENERIC = new Set(
  `agg amel from after before during when with general the and side sides region
   extending sensation as if in on of to it a an worse better about into onto
   being cannot everything himself herself thinking feeling general kinds sort
   things something someone which while very much some this that then than there
   generalities clinical`.split(/\s+/),
);

/** Significant keywords from the whole rubric path, INCLUDING the chapter word
 *  (e.g. "Abdomen, pain, cramping" → abdomen, pain, cramping). */
function rubricKeywords(rubricText: string): string[] {
  return [
    ...new Set(
      rubricText
        .toLowerCase()
        .replace(/[^a-z ]/g, ' ')
        .split(/\s+/)
        .filter((w) => w.length >= 4 && !GENERIC.has(w)),
    ),
  ];
}

function splitSentences(text: string): string[] {
  return text
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?;])\s+(?=[A-Z“"(])/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 12);
}

function Highlighted({ text, keywords }: { text: string; keywords: string[] }) {
  if (keywords.length === 0) return <>{text}</>;
  // whole-word match only (\b…\b) so we never highlight a fragment inside a word
  const re = new RegExp(
    `\\b(${keywords.map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})\\b`,
    'ig',
  );
  const parts = text.split(re);
  return (
    <>
      {parts.map((p, i) =>
        keywords.some((k) => k.toLowerCase() === p.toLowerCase()) ? (
          <mark key={i} className="rounded bg-amber-200/70 px-0.5 text-slate-900">
            {p}
          </mark>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </>
  );
}

function BookSupport({
  bookId,
  remedyName,
  rubrics,
}: {
  bookId: 'boericke' | 'tyler';
  remedyName: string;
  rubrics: Rubric[];
}) {
  const { data: book, isLoading } = useBook(bookId);
  const label = bookId === 'boericke' ? 'Boericke' : 'Tyler';

  const result = useMemo(() => {
    if (!book) return null;
    const remedy = findBookRemedy(book, remedyName);
    if (!remedy) return { remedy: null, lines: [] as { text: string; kws: string[]; rubrics: string[] }[] };

    const rubricKws = rubrics.map((r) => ({ rubric: r.rubric, kws: rubricKeywords(r.rubric) }));
    const lines: { text: string; kws: string[]; rubrics: string[] }[] = [];
    for (const sentence of splitSentences(remedy.text)) {
      // whole words of the sentence — match keywords verbatim, never a fragment
      const wordSet = new Set(sentence.toLowerCase().split(/[^a-z]+/).filter(Boolean));
      const hitKws = new Set<string>();
      const hitRubrics = new Set<string>();
      for (const { rubric, kws } of rubricKws) {
        for (const k of kws) {
          if (wordSet.has(k)) {
            hitKws.add(k);
            hitRubrics.add(rubric);
          }
        }
      }
      if (hitKws.size > 0) {
        lines.push({ text: sentence, kws: [...hitKws], rubrics: [...hitRubrics] });
      }
      if (lines.length >= 40) break;
    }
    return { remedy, lines };
  }, [book, remedyName, rubrics]);

  if (isLoading)
    return (
      <div className="flex items-center gap-2 py-3 text-sm text-slate-400">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading {label}…
      </div>
    );
  if (!result?.remedy)
    return <p className="py-2 text-sm text-slate-400">Not found in {label}.</p>;

  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        <BookText className="h-4 w-4 text-brand-600" />
        <span className="text-sm font-semibold text-slate-700">
          {label}: {result.remedy.name}
        </span>
        <Link
          to={`/books/${bookId}/${result.remedy.slug}`}
          className="ml-auto text-xs text-brand-600 hover:underline"
        >
          full text →
        </Link>
      </div>
      {result.lines.length === 0 ? (
        <p className="py-1 text-sm text-slate-400">
          No lines in {label} directly matched these rubrics.
        </p>
      ) : (
        <ul className="space-y-2">
          {result.lines.map((l, i) => (
            <li key={i} className="rounded-lg border border-slate-100 bg-amber-50/40 p-2.5 text-sm leading-relaxed text-slate-700">
              <Highlighted text={l.text} keywords={l.kws} />
              <div className="mt-1 flex flex-wrap gap-1">
                {l.rubrics.slice(0, 3).map((r) => (
                  <span key={r} className="rounded-full bg-brand-50 px-2 py-0.5 text-[10px] text-brand-700">
                    {r}
                  </span>
                ))}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Modal showing the Materia Medica lines that support a remedy for the chosen rubrics. */
export function RemedySupportModal({
  remedyName,
  rubrics,
  onClose,
}: {
  remedyName: string;
  rubrics: Rubric[];
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-2xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
          <div>
            <h2 className="font-serif text-xl font-semibold text-slate-800">{remedyName}</h2>
            <p className="text-xs text-slate-500">
              Materia Medica support for {rubrics.length} selected rubric
              {rubrics.length === 1 ? '' : 's'}
            </p>
          </div>
          <button onClick={onClose} className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="min-h-0 flex-1 space-y-5 overflow-auto px-5 py-4">
          <BookSupport bookId="boericke" remedyName={remedyName} rubrics={rubrics} />
          <BookSupport bookId="tyler" remedyName={remedyName} rubrics={rubrics} />
        </div>
      </div>
    </div>
  );
}
