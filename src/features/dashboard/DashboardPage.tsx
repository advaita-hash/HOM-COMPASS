import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BookMarked,
  CalendarDays,
  FlaskConical,
  Library,
  Sparkles,
} from 'lucide-react';
import { REMEDIES, remedyOfTheDay } from '../../data/remedies';
import { useLibraryStore } from '../library/libraryStore';

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
    <Link to={to} className="card p-4 transition-shadow hover:shadow-md">
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
  const remedy = useMemo(() => remedyOfTheDay(today), [today]);
  const bookCount = useLibraryStore((s) => s.books.length);

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

      {/* Remedy of the Day hero */}
      <Link
        to="/remedy-of-the-day"
        className="group block overflow-hidden rounded-2xl border border-brand-200 bg-gradient-to-br from-brand-600 to-brand-500 text-white shadow-sm transition-transform hover:-translate-y-0.5"
      >
        <div className="flex flex-col gap-4 p-6 md:flex-row md:items-center md:justify-between">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 text-brand-50">
              <CalendarDays className="h-4 w-4" />
              <span className="text-xs font-medium uppercase tracking-wide">
                Remedy of the Day
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <h2 className="font-serif text-3xl font-bold">{remedy.name}</h2>
              <span className="text-sm text-brand-100">{remedy.commonName}</span>
            </div>
            <p className="mt-2 font-serif text-[15px] italic leading-relaxed text-white/95">
              “{remedy.essence}”
            </p>
            <ul className="mt-3 flex flex-wrap gap-2">
              {remedy.keynotes.slice(0, 3).map((k, i) => (
                <li
                  key={i}
                  className="inline-flex items-center gap-1 rounded-full bg-white/15 px-3 py-1 text-xs"
                >
                  <Sparkles className="h-3 w-3" />
                  {k.length > 42 ? `${k.slice(0, 42)}…` : k}
                </li>
              ))}
            </ul>
          </div>
          <div className="inline-flex items-center gap-1 self-start rounded-lg bg-white/15 px-3 py-2 text-sm font-medium md:self-center">
            Study now
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </div>
        </div>
      </Link>

      {/* Quick stats */}
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <StatCard icon={FlaskConical} label="Remedies in library" value={REMEDIES.length} to="/materia-medica" />
        <StatCard icon={Library} label="Books uploaded" value={bookCount} to="/library" />
        <StatCard icon={BookMarked} label="Repertory chapters" value="—" to="/repertory" />
      </div>

      {/* Quick actions */}
      <section className="mt-6">
        <h3 className="mb-2 text-sm font-semibold text-slate-700">Quick actions</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <Link to="/library" className="card flex items-center gap-3 p-4 hover:shadow-md">
            <Library className="h-5 w-5 text-brand-600" />
            <div>
              <div className="text-sm font-medium text-slate-800">Upload a book</div>
              <div className="text-xs text-slate-500">Add a repertory or materia medica</div>
            </div>
          </Link>
          <Link to="/materia-medica" className="card flex items-center gap-3 p-4 hover:shadow-md">
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
