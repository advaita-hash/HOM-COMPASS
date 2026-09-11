import { useState } from 'react';
import { Check, Plus, Zap } from 'lucide-react';
import type { Repertory } from './types';
import { findCausation, type RubricMatch } from './rubricFinder';
import { useWorksheet } from './worksheetStore';

const COMMON = [
  'grief', 'fright', 'anger', 'disappointed love', 'bad news', 'anxiety',
  'getting wet', 'cold', 'injury', 'suppressed discharge', 'overexertion',
];

/**
 * Probable causative factor (etiology). Finds "ailments from…" rubrics and adds
 * them to the worksheet weighted ×2 — causation carries high value in analysis.
 */
export function CausativeFactor({ rep }: { rep: Repertory | undefined }) {
  const [text, setText] = useState('');
  const [matches, setMatches] = useState<RubricMatch[]>([]);
  const has = useWorksheet((s) => s.has);
  const add = useWorksheet((s) => s.add);
  const setIntensity = useWorksheet((s) => s.setIntensity);

  function run(q: string) {
    setText(q);
    if (rep && q.trim()) setMatches(findCausation(rep, q));
    else setMatches([]);
  }
  function addCausation(id: string) {
    add(id);
    setIntensity(id, 2); // weight causation higher
  }

  return (
    <div className="card p-4">
      <div className="mb-2 flex items-center gap-2">
        <Zap className="h-4 w-4 text-amber-500" />
        <h2 className="text-sm font-semibold text-slate-700">Probable causative factor</h2>
      </div>
      <p className="mb-2 text-xs text-slate-500">
        What brought it on? Causation ("ailments from…") is weighted ×2.
      </p>
      <input
        value={text}
        onChange={(e) => run(e.target.value)}
        placeholder="e.g. grief, fright, getting wet…"
        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-400 focus:outline-none"
      />
      <div className="mt-2 flex flex-wrap gap-1.5">
        {COMMON.map((c) => (
          <button
            key={c}
            onClick={() => run(c)}
            className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-slate-600 hover:bg-slate-200"
          >
            {c}
          </button>
        ))}
      </div>

      {matches.length > 0 && (
        <div className="mt-3 space-y-1">
          {matches.map((m) => {
            const on = has(m.rubric.id);
            return (
              <button
                key={m.rubric.id}
                onClick={() => addCausation(m.rubric.id)}
                disabled={on}
                className={`flex w-full items-start gap-2 rounded-md border px-3 py-1.5 text-left text-sm ${
                  on
                    ? 'border-amber-200 bg-amber-50 text-amber-700'
                    : 'border-slate-200 hover:border-amber-400 hover:bg-slate-50'
                }`}
              >
                {on ? (
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                ) : (
                  <Plus className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                )}
                <span className="min-w-0 flex-1 break-words">{m.rubric.rubric}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
