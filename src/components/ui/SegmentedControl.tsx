import type { ReactNode } from 'react';

export interface Segment<T extends string | number> {
  value: T;
  label: ReactNode;
  /** Optional trailing count/badge. */
  badge?: ReactNode;
  /** Tooltip, e.g. for icon-only segments. */
  title?: string;
}

/**
 * UISegmentedControl for the web: a translucent brand-tinted track with a
 * solid, softly-shadowed thumb that slides to the active segment on a spring.
 *
 * Geometry follows proportional nesting: track radius 12px with 4px padding →
 * thumb radius 8px. Segments are 36px tall with a 44px hit area (`.tap`), so
 * the whole control is exactly 44px high.
 */
export function SegmentedControl<T extends string | number>({
  options,
  value,
  onChange,
  ariaLabel,
  fullWidth = false,
  className = '',
}: {
  options: Segment<T>[];
  value: T;
  onChange: (v: T) => void;
  ariaLabel: string;
  fullWidth?: boolean;
  className?: string;
}) {
  const n = options.length;
  const index = Math.max(
    0,
    options.findIndex((o) => o.value === value),
  );

  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={`relative grid rounded-lg bg-ink/[0.06] p-1 ${fullWidth ? 'w-full' : 'w-max max-w-full'} ${className}`}
      style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}
    >
      {/* sliding thumb */}
      <span
        aria-hidden
        className="pointer-events-none absolute bottom-1 left-1 top-1 rounded-md bg-thumb shadow-segment transition-transform duration-300 ease-spring"
        style={{ width: `calc((100% - 8px) / ${n})`, transform: `translateX(${index * 100}%)` }}
      />
      {options.map((o, i) => {
        const active = i === index;
        return (
          <button
            key={String(o.value)}
            type="button"
            role="radio"
            aria-checked={active}
            title={o.title}
            onClick={() => onChange(o.value)}
            className={`tap relative z-10 flex h-9 min-w-0 items-center justify-center gap-2 rounded-md px-3 text-sm transition-colors duration-300 ease-spring ${
              active ? 'font-semibold text-ink/90' : 'font-medium text-ink/70 hover:text-ink/90'
            }`}
          >
            <span className="truncate">{o.label}</span>
            {o.badge}
          </button>
        );
      })}
    </div>
  );
}
