import { CircleHelp } from 'lucide-react';
import { getTour } from './registry';
import { useTour } from './tourStore';

/**
 * The round ? button at the right end of a page's header row: replays that
 * page's tour, even if it was seen before. Renders nothing for an unknown tour.
 */
export function TourButton({ tour, className = '' }: { tour: string; className?: string }) {
  const start = useTour((s) => s.start);
  if (!getTour(tour)) return null;
  return (
    <button
      type="button"
      onClick={() => start(tour)}
      aria-label="Show tips for this page"
      title="Show tips"
      className={`ml-auto flex h-11 w-11 shrink-0 items-center justify-center self-center rounded-full text-brand-600 transition-colors hover:bg-accent/[0.08] active:opacity-60 ${className}`}
    >
      <CircleHelp className="h-6 w-6" aria-hidden />
    </button>
  );
}

export default TourButton;
