import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ChevronLeft, FlaskConical, Search } from 'lucide-react';
import { REMEDIES, getRemedyById } from '../../data/remedies';
import { RemedyDetail } from '../remedy/RemedyDetail';
import { BookCrossLinks } from '../books/BookCrossLinks';

function RemedyList() {
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();
  const filtered = q
    ? REMEDIES.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          r.commonName.toLowerCase().includes(q) ||
          r.abbr.toLowerCase().includes(q),
      )
    : REMEDIES;

  return (
    <div className="mx-auto max-w-4xl p-6 md:p-8">
      <header className="mb-5 flex items-center gap-3">
        <FlaskConical className="h-6 w-6 text-brand-600" />
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">Materia Medica</h1>
          <p className="text-sm text-slate-500">
            {REMEDIES.length} remedies · short-form study profiles
          </p>
        </div>
      </header>

      <div className="relative mb-4">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search remedies…"
          className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {filtered.map((r) => (
          <Link
            key={r.id}
            to={`/materia-medica/${r.id}`}
            className="card p-4 transition-shadow hover:shadow-md"
          >
            <div className="flex items-baseline gap-2">
              <h2 className="font-serif text-lg font-semibold text-slate-800">{r.name}</h2>
              <span className="text-xs text-slate-400">{r.abbr}</span>
            </div>
            <p className="text-xs text-slate-500">
              {r.commonName} · {r.source}
            </p>
            <p className="mt-2 line-clamp-2 text-sm text-slate-600">{r.essence}</p>
          </Link>
        ))}
        {filtered.length === 0 && (
          <p className="col-span-full py-8 text-center text-sm text-slate-400">
            No remedies match “{query}”.
          </p>
        )}
      </div>
    </div>
  );
}

export default function MateriaMedicaPage() {
  const { remedyId } = useParams();

  if (!remedyId) return <RemedyList />;

  const remedy = getRemedyById(remedyId);
  if (!remedy) {
    return (
      <div className="mx-auto max-w-4xl p-8">
        <Link to="/materia-medica" className="btn-ghost mb-4">
          <ChevronLeft className="h-4 w-4" /> Back to Materia Medica
        </Link>
        <p className="text-sm text-slate-500">Remedy “{remedyId}” not found.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl p-6 md:p-8">
      <Link to="/materia-medica" className="btn-ghost mb-4">
        <ChevronLeft className="h-4 w-4" /> Back to Materia Medica
      </Link>
      <RemedyDetail remedy={remedy} />
      <div className="mt-5">
        <BookCrossLinks remedyName={remedy.name} />
      </div>
    </div>
  );
}
