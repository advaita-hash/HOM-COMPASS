import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

/**
 * Empty state in the spirit of ContentUnavailableView: a thin-stroke muted
 * symbol, a bold title, a sentence on why it's empty, and the one action that
 * resolves it.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className = '',
}: {
  icon: LucideIcon;
  title: string;
  description: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex flex-col items-center px-6 py-12 text-center ${className}`}>
      <Icon className="h-12 w-12 text-ink/30" strokeWidth={1.25} aria-hidden />
      <h3 className="mt-4 text-xl font-bold text-ink/90">{title}</h3>
      <p className="mt-2 max-w-sm text-subhead text-ink/70">{description}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
