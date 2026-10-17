import { useState } from 'react';
import { ArrowRight, Check, Loader2, Plus, Sparkles, Wand2 } from 'lucide-react';
import type { Repertory, Rubric } from './types';
import { findRubricsForPhrase, hasCuratedSense } from './rubricFinder';
import { useWorksheet } from './worksheetStore';
import { useSemantic, type WordTranslation } from './semantic/useSemantic';

interface PhraseBlock {
  phrase: string;
  translations: WordTranslation[];
  matches: { rubric: Rubric; score: number }[];
}

/**
 * Everyday language → repertory rubrics. The keyword/chapter matcher always
 * runs; when on-device understanding is on, each common word is first translated
 * to its nearest repertory word ("tummy" → abdomen) and those words are fed into
 * the matcher so plain wording still lands on the right rubrics.
 */
export function SymptomTranslator({
  rep,
  text,
  onTextChange,
}: {
  rep: Repertory | undefined;
  text: string;
  onTextChange: (t: string) => void;
}) {
  const [results, setResults] = useState<PhraseBlock[]>([]);
  const [busy, setBusy] = useState(false);
  const has = useWorksheet((s) => s.has);
  const add = useWorksheet((s) => s.add);
  const sem = useSemantic(rep);

  async function run() {
    if (!rep) return;
    setBusy(true);
    try {
      const phrases = text
        .split(/[\n;]+/)
        .map((p) => p.trim())
        .filter(Boolean);

      // the AI layer only handles words with NO built-in sense — the curated
      // common-language map already covers the rest reliably, and letting the
      // model re-translate known words caused mis-maps ("tummy ache" → ear).
      const allWords = phrases.flatMap((p) =>
        p
          .toLowerCase()
          .split(/[^a-z]+/)
          .filter((w) => w.length >= 3 && !hasCuratedSense(w)),
      );
      const trans = sem.status === 'ready' ? await sem.translate(allWords) : [];
      const transByWord = new Map(trans.map((t) => [t.word, t.to]));

      const blocks: PhraseBlock[] = phrases.map((phrase) => {
        const words = [...new Set(phrase.toLowerCase().split(/[^a-z]+/).filter(Boolean))];
        const translations: WordTranslation[] = [];
        for (const w of words) {
          const to = transByWord.get(w);
          if (to) translations.push({ word: w, to });
        }
        // feed the translated repertory words into the keyword matcher
        const extra = translations.flatMap((t) => t.to).join(' ');
        const augmented = extra ? `${phrase} ${extra}` : phrase;
        const matches = findRubricsForPhrase(rep, augmented, 8);
        return { phrase, translations, matches };
      });
      setResults(blocks);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card p-4">
      <div className="mb-2 flex items-center gap-2">
        <Wand2 className="h-4 w-4 text-brand-600" />
        <h2 className="text-sm font-semibold text-slate-700">Symptoms → rubrics</h2>
      </div>
      <p className="mb-2 text-xs text-slate-500">
        Type symptoms in plain language, one per line — e.g. “anxious about her health”, “worse in
        warm rooms”, “craves salt”.
      </p>

      <SemanticToggle sem={sem} />

      <textarea
        value={text}
        onChange={(e) => onTextChange(e.target.value)}
        rows={4}
        placeholder={'anxious about health\nworse in warm rooms\ncraves salt\nweeps when consoled'}
        className="mt-3 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-400 focus:outline-none"
      />
      <button onClick={run} disabled={!rep || !text.trim() || busy} className="btn-primary mt-2">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
        Find rubrics
      </button>

      {results.length > 0 && (
        <div className="mt-4 space-y-4">
          {results.map((r, i) => (
            <div key={i}>
              <div className="mb-1 text-xs font-medium text-slate-500">“{r.phrase}”</div>

              {r.translations.length > 0 && (
                <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
                  <span className="text-[10px] uppercase tracking-wide text-violet-500">
                    repertory language
                  </span>
                  {r.translations.map((t) => (
                    <span
                      key={t.word}
                      className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2 py-0.5 text-[11px] text-violet-700"
                    >
                      {t.word}
                      <ArrowRight className="h-3 w-3" />
                      {t.to.join(', ')}
                    </span>
                  ))}
                </div>
              )}

              {r.matches.length === 0 ? (
                <p className="text-xs text-slate-400">No rubric match — try different wording.</p>
              ) : (
                <div className="space-y-1">
                  {r.matches.map((m) => {
                    const on = has(m.rubric.id);
                    return (
                      <button
                        key={m.rubric.id}
                        onClick={() => add(m.rubric.id)}
                        disabled={on}
                        className={`flex w-full items-start gap-2 rounded-md border px-3 py-1.5 text-left text-sm ${
                          on
                            ? 'border-brand-200 bg-brand-50 text-brand-700'
                            : 'border-slate-200 hover:border-brand-400 hover:bg-slate-50'
                        }`}
                      >
                        {on ? (
                          <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
                        ) : (
                          <Plus className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                        )}
                        <span className="min-w-0 flex-1 break-words">{m.rubric.rubric}</span>
                        <span className="mt-0.5 shrink-0 text-[10px] uppercase text-slate-400">
                          {m.rubric.remedies.length}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SemanticToggle({ sem }: { sem: ReturnType<typeof useSemantic> }) {
  const pct =
    sem.progress && sem.progress.total > 0
      ? Math.round((sem.progress.done / sem.progress.total) * 100)
      : 0;
  const line: Record<string, string> = {
    off: 'Off — matches keywords only.',
    loading: 'Loading the language model…',
    building: `Learning the repertory’s words… ${pct}%`,
    ready: 'On — translates everyday words into repertory language.',
    unsupported: 'Not supported on this browser — using keyword match.',
    error: 'Couldn’t load the model — using keyword match.',
  };
  const dot =
    sem.status === 'ready'
      ? 'bg-emerald-500'
      : sem.status === 'error' || sem.status === 'unsupported'
        ? 'bg-amber-500'
        : sem.status === 'off'
          ? 'bg-slate-300'
          : 'bg-brand-500 animate-pulse';
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
      <label className="flex cursor-pointer items-center gap-2">
        <input
          type="checkbox"
          checked={sem.enabled}
          onChange={(e) => sem.setEnabled(e.target.checked)}
          className="h-4 w-4 accent-brand-600"
        />
        <Sparkles className="h-4 w-4 text-violet-500" />
        <span className="text-sm font-medium text-slate-700">
          Translate everyday words (on-device AI)
        </span>
        {(sem.status === 'loading' || sem.status === 'building') && (
          <Loader2 className="h-3.5 w-3.5 animate-spin text-brand-500" />
        )}
      </label>
      <div className="mt-1 flex items-center gap-1.5 pl-6 text-[11px] text-slate-500">
        <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
        {line[sem.status]}
      </div>
      {sem.status === 'building' && (
        <div className="ml-6 mt-1 h-1 w-40 overflow-hidden rounded-full bg-slate-200">
          <div className="h-full bg-brand-500 transition-all" style={{ width: `${pct}%` }} />
        </div>
      )}
    </div>
  );
}
