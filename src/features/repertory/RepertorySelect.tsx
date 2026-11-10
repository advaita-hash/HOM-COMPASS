import { useState } from 'react';
import { Library } from 'lucide-react';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { REPERTORIES, useRepertorySelection } from './repertoryData';
import { useWorksheet } from './worksheetStore';

/** Dropdown to switch the active repertory. Switching clears the case's
 *  rubrics (rubric ids are not shared between repertories), so it asks before
 *  clearing a non-empty case. */
export function RepertorySelect() {
  const id = useRepertorySelection((s) => s.id);
  const setId = useRepertorySelection((s) => s.setId);
  const clear = useWorksheet((s) => s.clear);
  const count = useWorksheet((s) => s.items.length);
  const [pending, setPending] = useState<string | null>(null);

  return (
    <>
      {/* shared by the Repertory and Case pages, so any tour can point at it */}
      <label
        data-tour="repertory-select"
        className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-surface px-3 py-2 text-sm text-slate-600"
      >
        <Library className="h-4 w-4 text-brand-600" />
        <select
          value={id}
          onChange={(e) => {
            const next = e.target.value;
            if (next === id) return;
            if (count === 0) {
              clear();
              setId(next);
            } else {
              // controlled select keeps showing the current repertory meanwhile
              setPending(next);
            }
          }}
          className="bg-transparent focus:outline-none"
          aria-label="Active repertory"
        >
          {REPERTORIES.map((r) => (
            <option key={r.id} value={r.id}>
              {r.label}
            </option>
          ))}
        </select>
      </label>
      {/* outside the label, so clicks in the dialog don't reach the select */}
      <ConfirmDialog
        open={pending !== null}
        title="Switch repertory?"
        message={`Your ${count} ${count === 1 ? 'rubric' : 'rubrics'} will be removed from the case, because rubrics can’t move between repertories.`}
        confirmLabel="Switch and clear"
        destructive
        onConfirm={() => {
          clear();
          if (pending) setId(pending);
          setPending(null);
        }}
        onCancel={() => setPending(null)}
      />
    </>
  );
}
