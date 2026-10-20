import { type ReactNode, useId, useState } from 'react';
import { ChevronRight } from 'lucide-react';

/**
 * DisclosureGroup for the web. The header is a full-width 44px row; the
 * chevron rotates 90° and the body grows/shrinks on the spring curve using the
 * `grid-template-rows: 0fr → 1fr` technique (animates to the content's real
 * height, no measuring). Collapsed content is `visibility: hidden`, so it
 * can't be tabbed into. Children mount lazily on first open and stay mounted
 * so closing animates too.
 */
export function Disclosure({
  header,
  open,
  onToggle,
  children,
  className = '',
  headerClassName = '',
}: {
  header: ReactNode;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
  className?: string;
  headerClassName?: string;
}) {
  const id = useId();
  const [mounted, setMounted] = useState(open);
  if (open && !mounted) setMounted(true);

  return (
    <div className={className}>
      <button
        type="button"
        id={`${id}-h`}
        aria-expanded={open}
        aria-controls={`${id}-r`}
        onClick={onToggle}
        className={`flex min-h-[44px] w-full items-center gap-3 text-left transition-colors active:bg-ink/[0.06] ${headerClassName}`}
      >
        <ChevronRight
          aria-hidden
          className={`h-4 w-4 shrink-0 text-ink/45 transition-transform duration-300 ease-spring ${open ? 'rotate-90' : ''}`}
          strokeWidth={2.5}
        />
        <span className="flex min-w-0 flex-1 items-center gap-3">{header}</span>
      </button>
      <div
        id={`${id}-r`}
        role="region"
        aria-labelledby={`${id}-h`}
        className={`grid transition-[grid-template-rows,visibility] duration-300 ease-spring ${
          open ? 'visible grid-rows-[1fr]' : 'invisible grid-rows-[0fr]'
        }`}
      >
        <div className="min-h-0 overflow-hidden">{mounted && children}</div>
      </div>
    </div>
  );
}
