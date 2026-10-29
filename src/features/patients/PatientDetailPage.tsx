import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CalendarPlus, ChevronLeft, StickyNote, Trash2 } from 'lucide-react';
import { usePatients } from './patientsStore';
import { ClipboardList } from 'lucide-react';
import { EmptyState } from '../../components/ui/EmptyState';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { TourButton } from '../tour/TourButton';
import { usePageTour } from '../tour/usePageTour';

/** `first`: the newest case, the one the page tour points at. */
function CaseCard({ caseId, first, onRemoved }: { caseId: string; first: boolean; onRemoved: () => void }) {
  const c = usePatients((s) => s.cases.find((x) => x.id === caseId));
  const updateCase = usePatients((s) => s.updateCase);
  const removeCase = usePatients((s) => s.removeCase);
  const [confirming, setConfirming] = useState(false);
  const cancelDelete = useCallback(() => setConfirming(false), []);
  if (!c) return null;

  // older or restored records may lack a symptom list
  const symptoms = Array.isArray(c.symptoms_list) ? c.symptoms_list : [];

  const date = new Date(c.visit_date).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  return (
    <div data-tour={first ? 'patient-detail-case' : undefined} className="card p-4">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-medium text-slate-700">{date}</span>
        <button
          type="button"
          onClick={() => setConfirming(true)}
          data-tour={first ? 'patient-detail-delete' : undefined}
          className="tap rounded-full p-1 text-ink/60 transition-colors hover:bg-red-50 hover:text-red-600"
          aria-label={`Delete case from ${date}`}
          title="Delete case"
        >
          <Trash2 className="h-4 w-4" aria-hidden />
        </button>
      </div>

      <label className="mb-1 block text-xs font-medium text-slate-500">
        Symptoms (one per line)
      </label>
      <textarea
        value={symptoms.join('\n')}
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
        placeholder="Add symptoms, one per line"
        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none"
      />

      {symptoms.filter(Boolean).length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {symptoms.filter(Boolean).map((s, i) => (
            <span key={i} className="rounded-full bg-brand-50 px-3 py-1 text-xs text-brand-700">
              {s}
            </span>
          ))}
        </div>
      )}

      <label className="mb-1 mt-3 block text-xs font-medium text-slate-500">Notes</label>
      <textarea
        value={c.notes ?? ''}
        onChange={(e) => updateCase(c.id, { notes: e.target.value })}
        rows={2}
        placeholder="Observations, remedy given, follow-up…"
        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none"
      />

      <Link
        to="/analysis"
        data-tour={first ? 'patient-detail-workspace' : undefined}
        className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:underline"
      >
        <StickyNote className="h-3.5 w-3.5" /> Open the case workspace →
      </Link>

      <ConfirmDialog
        open={confirming}
        title="Delete this case?"
        message={`This permanently removes the case from ${date}, with its symptoms and notes, from this device.`}
        confirmLabel="Delete"
        destructive
        onConfirm={() => {
          setConfirming(false);
          removeCase(c.id);
          onRemoved();
        }}
        onCancel={cancelDelete}
      />
    </div>
  );
}

export default function PatientDetailPage() {
  const { patientId } = useParams();
  const patient = usePatients((s) => s.patients.find((p) => p.id === patientId));
  const cases = usePatients((s) => (patientId ? s.casesFor(patientId) : []));
  const addCase = usePatients((s) => s.addCase);
  const updatePatient = usePatients((s) => s.updatePatient);
  // no tour on "Patient not found": none of its controls are there
  usePageTour(patient ? 'patient-detail' : '');
  // after a case card (and its bin button) is removed, focus the Cases heading
  // so keyboard and screen-reader focus doesn't fall back to the page top
  const casesHeadingRef = useRef<HTMLHeadingElement>(null);
  const [refocus, setRefocus] = useState(false);
  const caseRemoved = useCallback(() => setRefocus(true), []);
  useEffect(() => {
    if (!refocus) return;
    casesHeadingRef.current?.focus();
    setRefocus(false);
  }, [refocus]);

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
      <Link to="/patients" data-tour="patient-detail-back" className="btn-ghost mb-3">
        <ChevronLeft className="h-4 w-4" /> Patients
      </Link>

      <div className="card mb-5 p-4">
        <div className="flex items-center gap-3">
          <h1 className="min-w-0 flex-1 break-words text-xl font-semibold text-slate-800">{patient.name}</h1>
          {/* -my-2: the 44px button doesn't make the name row taller */}
          <TourButton tour="patient-detail" className="-my-2" />
        </div>
        <p className="text-sm text-slate-500">
          {[patient.age ? `${patient.age} years` : null, patient.gender]
            .filter(Boolean)
            .join(' · ') || 'No demographics'}
        </p>
        <textarea
          data-tour="patient-detail-notes"
          value={patient.notes ?? ''}
          onChange={(e) => updatePatient(patient.id, { notes: e.target.value })}
          rows={2}
          placeholder="Constitution, background, general notes…"
          className="mt-3 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none"
        />
      </div>

      <div className="mb-3 flex items-center justify-between">
        <h2 ref={casesHeadingRef} tabIndex={-1} className="text-sm font-semibold text-slate-700">
          Cases <span className="text-slate-400">({cases.length})</span>
        </h2>
        <button onClick={() => addCase(patient.id)} data-tour="patient-detail-new-case" className="btn-primary">
          <CalendarPlus className="h-4 w-4" /> New case
        </button>
      </div>

      {cases.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={ClipboardList}
            title="No cases yet"
            description="Each visit is recorded as a case with its symptoms and repertorisation. Start with the first visit."
            action={
              <button onClick={() => addCase(patient.id)} className="btn-primary">
                <CalendarPlus className="h-4 w-4" /> New case
              </button>
            }
          />
        </div>
      ) : (
        <div className="space-y-3">
          {cases.map((c, i) => (
            <CaseCard key={c.id} caseId={c.id} first={i === 0} onRemoved={caseRemoved} />
          ))}
        </div>
      )}
    </div>
  );
}
