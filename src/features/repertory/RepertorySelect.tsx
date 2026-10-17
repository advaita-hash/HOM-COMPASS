import { Library } from 'lucide-react';
import { REPERTORIES, useRepertorySelection } from './repertoryData';
import { useWorksheet } from './worksheetStore';

/** Dropdown to switch the active repertory. Clears the worksheet on change,
 *  since rubric ids are not shared between repertories. */
export function RepertorySelect() {
  const id = useRepertorySelection((s) => s.id);
  const setId = useRepertorySelection((s) => s.setId);
  const clear = useWorksheet((s) => s.clear);

  return (
    <label className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm text-slate-600">
      <Library className="h-4 w-4 text-brand-600" />
      <select
        value={id}
        onChange={(e) => {
          if (e.target.value !== id) {
            clear();
            setId(e.target.value);
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
  );
}
