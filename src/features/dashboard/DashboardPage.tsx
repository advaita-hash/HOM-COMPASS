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
import { DAILY_BOOK, localDayNumber, openingLede, useDailyRemedy } from '../remedy/dailyRemedy';
import { BOOKS } from '../books/booksIndex';
import { useLibraryStore } from '../library/libraryStore';
import { DISCLAIMER } from '../../components/ClinicalDisclaimer';
import { useDisclaimerAck } from './disclaimerStore';

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
          <div className="text-xs text-slate-500">{label}</div>
        </div>
      </div>
    </Link>
  );
}

export default function DashboardPage() {
  const today = useMemo(() => new Date(), []);
  const { book, pick } = useDailyRemedy(localDayNumber(today));
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

  const dateLabel = today.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="mx-auto max-w-5xl p-6 md:p-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-800">Dashboard</h1>
        <p className="text-sm text-slate-500">{dateLabel}</p>
      </header>

      {/* One-time clinical disclaimer (the sidebar keeps a short version visible). */}
      {!disclaimerAck && (
        <section
          aria-label="About this app"
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
        className="pressable group block overflow-hidden rounded-2xl bg-gradient-to-br from-art-pine to-art-sea text-white shadow-card"
      >
        <div className="flex flex-col gap-4 p-6 md:flex-row md:items-center md:justify-between">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 text-white/80">
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
                    <span className="text-sm text-white/80">{commonNameFor(DAILY_BOOK, remedy, book)}</span>
                  )}
                </div>
                <p className="mt-2 font-serif text-subhead italic leading-relaxed text-white/95">
                  “{openingLede(remedy)}”
                </p>
                {keynotes.length > 0 && (
                  <ul className="mt-3 flex flex-wrap gap-2">
                    {keynotes.map((k, i) => (
                      <li
                        key={i}
                        className="inline-flex items-center gap-1 rounded-full bg-white/15 px-3 py-1 text-xs"
                      >
                        <Sparkles className="h-3 w-3" aria-hidden />
                        {k.length > 42 ? `${k.slice(0, 42).trimEnd()}…` : k}
                      </li>
                    ))}
                  </ul>
                )}
              </>
            ) : (
              <p className="mt-2 font-serif text-2xl text-white/90">Opening today’s remedy from Boericke…</p>
            )}
          </div>
          <div className="inline-flex items-center gap-1 self-start rounded-lg bg-white/15 px-3 py-2 text-sm font-medium md:self-center">
            Study now
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </div>
        </div>
      </Link>

      {/* Quick stats */}
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <StatCard icon={FlaskConical} label="Remedies" value={`${REMEDY_TOTAL}+`} to="/materia-medica" />
        <StatCard icon={Library} label="Books uploaded" value={bookCount} to="/library" />
        <StatCard icon={BookMarked} label="Repertory chapters" value="—" to="/repertory" />
      </div>

      {/* Quick actions */}
      <section className="mt-6">
        <h3 className="mb-2 text-sm font-semibold text-slate-700">Quick actions</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <Link to="/library" className="card flex items-center gap-3 p-4 pressable">
            <Library className="h-5 w-5 text-brand-600" />
            <div>
              <div className="text-sm font-medium text-slate-800">Upload a book</div>
              <div className="text-xs text-slate-500">Add a repertory or materia medica</div>
            </div>
          </Link>
          <Link to="/materia-medica" className="card flex items-center gap-3 p-4 pressable">
            <FlaskConical className="h-5 w-5 text-brand-600" />
            <div>
              <div className="text-sm font-medium text-slate-800">Browse Materia Medica</div>
              <div className="text-xs text-slate-500">Study remedy profiles</div>
            </div>
          </Link>
        </div>
      </section>
    </div>
  );
}
