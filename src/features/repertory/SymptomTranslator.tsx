import { useState } from 'react';
import { Check, Plus, Sparkles, Wand2 } from 'lucide-react';
import type { Repertory } from './types';
import { type PhraseResult, translateSymptoms } from './rubricFinder';
import { useWorksheet } from './worksheetStore';

/**
 * Everyday language → repertory rubrics. The clinician types symptoms in plain
 * language; this suggests matching rubrics to add to the worksheet.
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
  const [results, setResults] = useState<PhraseResult[]>([]);
  const has = useWorksheet((s) => s.has);
  const add = useWorksheet((s) => s.add);

  function run() {
    if (!rep) return;
    setResults(translateSymptoms(rep, text));
  }

  return (
    <div className="card p-4">
      <div className="mb-2 flex items-center gap-2">
        <Wand2 className="h-4 w-4 text-brand-600" />
        <h2 className="text-sm font-semibold text-slate-700">
          Symptoms → rubrics
        </h2>
      </div>
      <p className="mb-2 text-xs text-slate-500">
        Type symptoms in plain language, one per line — e.g. “anxious about her
        health”, “worse in warm rooms”, “craves salt”.
      </p>
      <textarea
        value={text}
        onChange={(e) => onTextChange(e.target.value)}
        rows={4}
        placeholder={'anxious about health\nworse in warm rooms\ncraves salt\nweeps when consoled'}
        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-400 focus:outline-none"
      />
      <button onClick={run} disabled={!rep || !text.trim()} className="btn-primary mt-2">
        <Sparkles className="h-4 w-4" /> Find rubrics
      </button>

      {results.length > 0 && (
        <div className="mt-4 space-y-4">
          {results.map((r, i) => (
            <div key={i}>
              <div className="mb-1 text-xs font-medium text-slate-500">
                “{r.phrase}”
              </div>
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
                        className={`flex w-full items-center gap-2 rounded-md border px-3 py-1.5 text-left text-sm ${
                          on
                            ? 'border-brand-200 bg-brand-50 text-brand-700'
                            : 'border-slate-200 hover:border-brand-400 hover:bg-slate-50'
                        }`}
                      >
                        {on ? (
                          <Check className="h-4 w-4 shrink-0 text-brand-600" />
                        ) : (
                          <Plus className="h-4 w-4 shrink-0 text-slate-400" />
                        )}
                        <span className="min-w-0 flex-1 truncate">{m.rubric.rubric}</span>
                        <span className="text-[10px] uppercase text-slate-400">
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
