import { useRef } from 'react';
import { Check } from 'lucide-react';
import { NOTE_COLORS, type NoteColor, TONES } from './noteColors';

/**
 * A row of colour swatches (radio group): 44px targets, a spoken name each,
 * and a check plus a ring on the chosen one so colour is never the only sign.
 * Arrow keys move between colours and choose, like any radio group.
 */
export function NoteColorPicker({
  value,
  onChange,
  label = 'Note colour',
  className = '',
}: {
  value: NoteColor;
  onChange: (c: NoteColor) => void;
  label?: string;
  className?: string;
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const move = (from: number, by: number) => {
    const i = (from + by + NOTE_COLORS.length) % NOTE_COLORS.length;
    onChange(NOTE_COLORS[i]);
    refs.current[i]?.focus();
  };
  return (
    <div role="radiogroup" aria-label={label} className={`flex items-center ${className}`}>
      {NOTE_COLORS.map((c, i) => {
        const on = c === value;
        return (
          <button
            key={c}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={on}
            aria-label={TONES[c].label}
            title={TONES[c].label}
            tabIndex={on ? 0 : -1}
            onClick={() => onChange(c)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
                e.preventDefault();
                move(i, 1);
              } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
                e.preventDefault();
                move(i, -1);
              }
            }}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full"
          >
            <span
              aria-hidden
              className={`flex h-7 w-7 items-center justify-center rounded-full ring-1 ring-inset ring-black/25 dark:ring-white/20 ${TONES[c].swatch} ${
                on ? 'outline outline-2 outline-offset-2 outline-ink/80' : ''
              }`}
            >
              {on && <Check className="h-4 w-4 text-black/75" strokeWidth={3} />}
            </span>
          </button>
        );
      })}
    </div>
  );
}
