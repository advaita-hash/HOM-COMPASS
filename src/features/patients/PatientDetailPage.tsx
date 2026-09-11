import { Link, useParams } from 'react-router-dom';
import { CalendarPlus, ChevronLeft, StickyNote, Trash2 } from 'lucide-react';
import { usePatients } from './patientsStore';

function CaseCard({ caseId }: { caseId: string }) {
  const c = usePatients((s) => s.cases.find((x) => x.id === caseId));
  const updateCase = usePatients((s) => s.updateCase);
  const removeCase = usePatients((s) => s.removeCase);
  if (!c) return null;

  const date = new Date(c.visit_date).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  return (
    <div className="card p-4">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-medium text-slate-700">{date}</span>
        <button
          onClick={() => removeCase(c.id)}
          className="rounded p-1 text-slate-300 hover:bg-red-50 hover:text-red-600"
          aria-label="Delete case"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      <label className="mb-1 block text-xs font-medium text-slate-500">
        Symptoms (one per line)
      </label>
      <textarea
        value={c.symptoms_list.join('\n')}
        onChange={(e) =>
          // keep raw lines (incl. blanks) while typing
          updateCase(c.id, { symptoms_list: e.target.value.split('\n') })
        }
        onBlur={(e) =>
          // tidy to trimmed, non-empty symptoms on blur
          updateCase(c.id, {
            symptoms_list: e.target.value
              .split('\n')
              .map((s) => s.trim())
              .filter(Boolean),
          })
        }
        rows={4}
        placeholder="Anxiety about health&#10;Worse warmth&#10;Craves salt"
        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-400 focus:outline-none"
      />

      {c.symptoms_list.filter(Boolean).length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {c.symptoms_list.filter(Boolean).map((s, i) => (
            <span key={i} className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs text-brand-700">
              {s}
            </span>
          ))}
        </div>
      )}

      <label className="mb-1 mt-3 block text-xs font-medium text-slate-500">Notes</label>
      <textarea
        value={c.notes}
        onChange={(e) => updateCase(c.id, { notes: e.target.value })}
        rows={2}
        placeholder="Observations, remedy given, follow-up…"
        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-400 focus:outline-none"
      />

      <Link
        to="/analysis"
        className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:underline"
      >
        <StickyNote className="h-3.5 w-3.5" /> Open the case workspace →
      </Link>
    </div>
  );
}

export default function PatientDetailPage() {
  const { patientId } = useParams();
  const patient = usePatients((s) => s.patients.find((p) => p.id === patientId));
  const cases = usePatients((s) => (patientId ? s.casesFor(patientId) : []));
  const addCase = usePatients((s) => s.addCase);
  const updatePatient = usePatients((s) => s.updatePatient);

  if (!patient) {
    return (
      <div className="p-8">
        <Link to="/patients" className="btn-ghost mb-4">
          <ChevronLeft className="h-4 w-4" /> Patients
        </Link>
        <p className="text-sm text-slate-500">Patient not found.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl p-6 md:p-8">
      <Link to="/patients" className="btn-ghost mb-3">
        <ChevronLeft className="h-4 w-4" /> Patients
      </Link>

      <div className="card mb-5 p-4">
        <h1 className="text-xl font-semibold text-slate-800">{patient.name}</h1>
        <p className="text-sm text-slate-500">
          {[patient.age ? `${patient.age} years` : null, patient.gender]
            .filter(Boolean)
            .join(' · ') || 'No demographics'}
        </p>
        <textarea
          value={patient.notes ?? ''}
          onChange={(e) => updatePatient(patient.id, { notes: e.target.value })}
          rows={2}
          placeholder="Constitution, background, general notes…"
          className="mt-3 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-400 focus:outline-none"
        />
      </div>

      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-700">
          Cases <span className="text-slate-400">({cases.length})</span>
        </h2>
        <button onClick={() => addCase(patient.id)} className="btn-primary">
          <CalendarPlus className="h-4 w-4" /> New case
        </button>
      </div>

      {cases.length === 0 ? (
        <div className="card p-8 text-center text-sm text-slate-400">
          No cases yet — add the first visit.
        </div>
      ) : (
        <div className="space-y-3">
          {cases.map((c) => (
            <CaseCard key={c.id} caseId={c.id} />
          ))}
        </div>
      )}
    </div>
  );
}
