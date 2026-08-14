import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { CalendarDays, FlaskConical, Shuffle } from 'lucide-react';
import { REMEDIES, remedyOfTheDay } from '../../data/remedies';
import { RemedyDetail } from './RemedyDetail';

/** "Remedy of the Day" — a short daily study card, rotating deterministically. */
export default function RemedyOfTheDayPage() {
  const today = useMemo(() => new Date(), []);
  const remedy = useMemo(() => remedyOfTheDay(today), [today]);

  const dateLabel = today.toLocaleDateString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // Tomorrow's remedy, as a teaser.
  const tomorrow = useMemo(() => {
    const d = new Date(today);
    d.setDate(d.getDate() + 1);
    return remedyOfTheDay(d);
  }, [today]);

  return (
    <div className="mx-auto max-w-4xl p-6 md:p-8">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-brand-600">
            <CalendarDays className="h-4 w-4" />
            <span className="text-xs font-medium uppercase tracking-wide">
              Remedy of the Day
            </span>
          </div>
          <p className="mt-0.5 text-sm text-slate-500">{dateLabel}</p>
        </div>
        <Link to={`/materia-medica/${remedy.id}`} className="btn-ghost">
          <FlaskConical className="h-4 w-4" />
          Open in Materia Medica
        </Link>
      </div>

      <RemedyDetail remedy={remedy} />

      <div className="mt-6 flex items-center justify-between rounded-xl border border-dashed border-slate-300 bg-white/60 px-4 py-3 text-sm text-slate-500">
        <span className="inline-flex items-center gap-2">
          <Shuffle className="h-4 w-4" />
          Tomorrow: <span className="font-medium text-slate-700">{tomorrow.name}</span>
        </span>
        <span className="text-xs">
          Rotates through {REMEDIES.length} remedies · one per day
        </span>
      </div>
    </div>
  );
}
