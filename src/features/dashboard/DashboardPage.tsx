import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BookMarked,
  CalendarDays,
  FlaskConical,
  Info,
  Library,
  Sparkles,
} from 'lucide-react';
import { REMEDIES } from '../../data/remedies';
import { canonicalName } from '../../lib/remedyName';
import { distill } from '../books/drugPicture';
import { commonNameFor } from '../books/commonName';
import { DAILY_BOOK, dateOfDay, openingLede, useDailyRemedy, useLocalDay } from '../remedy/dailyRemedy';
import { BOOKS } from '../books/booksIndex';
import { useLibraryStore } from '../library/libraryStore';
import { DISCLAIMER } from '../../components/ClinicalDisclaimer';
import { useDisclaimerAck } from './disclaimerStore';
import { usePageTour } from '../tour/usePageTour';
import { TourButton } from '../tour/TourButton';

const REMEDY_TOTAL =
  REMEDIES.length + BOOKS.reduce((n, b) => n + b.approxRemedies, 0);

function StatCard({
  icon: Icon,
  label,
  value,
  to,
}: {
  icon: typeof Library;
  label: string;
  value: string | number;
  to: string;
}) {
  return (
    <Link to={to} className="card p-4 pressable">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <div className="text-2xl font-semibold text-slate-800">{value}</div>
          <div className="text-xs text-ink/70">{label}</div>
        </div>
      </div>
    </Link>
  );
}

export default function DashboardPage() {
  usePageTour('dashboard');
  // moves on at local midnight, so a tab left open overnight shows the new day
  const today = useLocalDay();
  const { book, pick, isError } = useDailyRemedy(today);
  const remedy = pick?.remedy;
  // three short keynotes from Boericke's own text for the hero chips
  const keynotes = useMemo(() => {
    if (!remedy) return [];
    const dp = distill(remedy.text);
    return [...dp.mind, ...dp.generals, ...dp.constitution, ...dp.worse].slice(0, 3);
  }, [remedy]);
  const bookCount = useLibraryStore((s) => s.books.length);
  const disclaimerAck = useDisclaimerAck((s) => s.acknowledged);
  const acknowledgeDisclaimer = useDisclaimerAck((s) => s.acknowledge);

  const dateLabel = dateOfDay(today).toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="mx-auto max-w-5xl p-6 md:p-8">
      <header className="mb-6 flex items-center gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold text-slate-800">Dashboard</h1>
          <p className="text-sm text-ink/70">{dateLabel}</p>
        </div>
        <TourButton tour="dashboard" />
      </header>

      {/* One-time clinical disclaimer (the sidebar keeps a short version visible). */}
      {!disclaimerAck && (
        <section
          aria-label="About this app"
          data-tour="dashboard-disclaimer"
          className="card mb-6 flex flex-col gap-3 p-4 sm:flex-row sm:items-center"
        >
          <Info className="h-5 w-5 shrink-0 text-brand-600" aria-hidden />
          <p className="flex-1 text-sm leading-relaxed text-ink/80">
            HOM-COMPASS is a reference and study tool. {DISCLAIMER}
          </p>
          <button type="button" className="btn-secondary self-start sm:self-auto" onClick={acknowledgeDisclaimer}>
            Got it
          </button>
        </section>
      )}

      {/* Remedy of the Day hero */}
      <Link
        to="/remedy-of-the-day"
        data-tour="dashboard-remedy-of-the-day"
        className="pressable group block overflow-hidden rounded-2xl bg-gradient-to-br from-art-pine to-art-sea text-white shadow-card"
      >
        <div className="flex flex-col gap-4 p-6 md:flex-row md:items-center md:justify-between">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 text-white">
              <CalendarDays className="h-4 w-4" />
              <span className="text-xs font-medium uppercase tracking-wide">
                Remedy of the Day
              </span>
            </div>
            {remedy && book ? (
              <>
                <div className="mt-2 flex flex-wrap items-baseline gap-x-2">
                  <h2 className="font-serif text-3xl font-bold">{canonicalName(remedy.name)}</h2>
                  {commonNameFor(DAILY_BOOK, remedy, book) && (
                    <span className="text-sm text-white">{commonNameFor(DAILY_BOOK, remedy, book)}</span>
                  )}
                </div>
                <p className="mt-2 font-serif text-subhead italic leading-relaxed text-white">
                  “{openingLede(remedy)}”
                </p>
                {keynotes.length > 0 && (
                  <ul className="mt-3 flex flex-wrap gap-2">
                    {keynotes.map((k, i) => (
                      <li
                        key={i}
                        className="inline-flex items-center gap-1 rounded-full bg-black/20 px-3 py-1 text-xs"
                      >
                        <Sparkles className="h-3 w-3" aria-hidden />
                        {k.length > 42 ? `${k.slice(0, 42).trimEnd()}…` : k}
                      </li>
                    ))}
                  </ul>
                )}
              </>
            ) : isError ? (
              <p className="mt-2 font-serif text-2xl text-white">
                Today’s remedy couldn’t load from Boericke. Open Remedy of the Day to try again.
              </p>
            ) : (
              <p className="mt-2 font-serif text-2xl text-white">Opening today’s remedy from Boericke…</p>
            )}
          </div>
          <div className="inline-flex items-center gap-1 self-start rounded-lg bg-black/20 px-3 py-2 text-sm font-medium md:self-center">
            Study now
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </div>
        </div>
      </Link>

      {/* Quick stats */}
      <div data-tour="dashboard-stats" className="mt-6 grid gap-4 sm:grid-cols-3">
        <StatCard icon={FlaskConical} label="Remedies" value={`${REMEDY_TOTAL}+`} to="/materia-medica" />
        <StatCard icon={Library} label="Your books" value={bookCount} to="/library" />
        <StatCard icon={BookMarked} label="Repertory chapters" value="—" to="/repertory" />
      </div>

      {/* Quick actions */}
      <section className="mt-6">
        <h3 className="mb-2 text-sm font-semibold text-slate-700">Quick actions</h3>
        <div data-tour="dashboard-quick-actions" className="grid gap-3 sm:grid-cols-2">
          <Link to="/library" className="card flex items-center gap-3 p-4 pressable">
            <Library className="h-5 w-5 text-brand-600" />
            <div>
              <div className="text-sm font-medium text-slate-800">Add a book</div>
              <div className="text-xs text-ink/70">List your own book files</div>
            </div>
          </Link>
          <Link to="/materia-medica" className="card flex items-center gap-3 p-4 pressable">
            <FlaskConical className="h-5 w-5 text-brand-600" />
            <div>
              <div className="text-sm font-medium text-slate-800">Browse Materia Medica</div>
              <div className="text-xs text-ink/70">Study remedy profiles</div>
            </div>
          </Link>
        </div>
      </section>
    </div>
  );
}
