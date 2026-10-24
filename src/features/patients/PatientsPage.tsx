import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Trash2, UserPlus, Users } from 'lucide-react';
import { usePatients, type Patient } from './patientsStore';
import { EmptyState } from '../../components/ui/EmptyState';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { BackupSection } from './BackupSection';

export default function PatientsPage() {
  const { patients, cases, addPatient, removePatient } = usePatients();
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('');
  const [toDelete, setToDelete] = useState<Patient | null>(null);
  const cancelDelete = useCallback(() => setToDelete(null), []);
  // row index to move focus to once a deleted row (and its bin button) is gone
  const [refocusIndex, setRefocusIndex] = useState<number | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const deleteCaseCount = toDelete ? cases.filter((c) => c.patient_id === toDelete.id).length : 0;

  // Runs after ConfirmDialog's cleanup has tried (and failed) to refocus the
  // removed bin button: focus the row that took its place, else the heading.
  useEffect(() => {
    if (refocusIndex === null) return;
    const links = listRef.current?.querySelectorAll<HTMLElement>('[data-patient-link]');
    const next = links && links.length > 0 ? links[Math.min(refocusIndex, links.length - 1)] : headingRef.current;
    next?.focus();
    setRefocusIndex(null);
  }, [refocusIndex]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    addPatient({
      name: name.trim(),
      age: age ? Number(age) : null,
      gender: gender || null,
      notes: null,
    });
    setName('');
    setAge('');
    setGender('');
  }

  return (
    <div className="mx-auto max-w-3xl p-6 md:p-8">
      <header className="mb-5 flex items-center gap-3">
        <Users className="h-6 w-6 text-brand-600" />
        <div>
          <h1 ref={headingRef} tabIndex={-1} className="text-2xl font-semibold text-slate-800">Patients &amp; Cases</h1>
          <p className="text-sm text-slate-500">{patients.length} {patients.length === 1 ? 'patient' : 'patients'}</p>
        </div>
      </header>

      <form onSubmit={submit} className="card mb-5 flex flex-wrap items-end gap-3 p-4">
        <div className="flex-1">
          <label className="mb-1 block text-xs font-medium text-slate-500">Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Patient name"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none"
          />
        </div>
        <div className="w-20">
          <label className="mb-1 block text-xs font-medium text-slate-500">Age</label>
          <input
            value={age}
            onChange={(e) => setAge(e.target.value.replace(/\D/g, ''))}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none"
          />
        </div>
        <div className="w-28">
          <label className="mb-1 block text-xs font-medium text-slate-500">Gender</label>
          <select
            value={gender}
            onChange={(e) => setGender(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-surface px-2 py-2 text-sm"
          >
            <option value="">—</option>
            <option>Female</option>
            <option>Male</option>
            <option>Other</option>
          </select>
        </div>
        <button type="submit" className="btn-primary">
          <UserPlus className="h-4 w-4" /> Add
        </button>
      </form>

      {patients.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={Users}
            title="No patients yet"
            description="Patients appear here once you add one above or save your first case from the Cases workspace."
            action={
              <Link to="/analysis" className="btn-primary">
                Take a new case
              </Link>
            }
          />
        </div>
      ) : (
        <div ref={listRef} className="card overflow-hidden">
          {patients.map((p) => {
            const n = cases.filter((c) => c.patient_id === p.id).length;
            return (
              <div
                key={p.id}
                className="flex items-center gap-3 border-b border-slate-100 px-4 py-3 last:border-0 hover:bg-slate-50"
              >
                <Link to={`/patients/${p.id}`} className="min-w-0 flex-1" data-patient-link>
                  <div className="text-sm font-medium text-slate-800">{p.name}</div>
                  <div className="text-xs text-slate-500">
                    {[p.age ? `${p.age}y` : null, p.gender].filter(Boolean).join(' · ') || '—'} ·{' '}
                    {n} case{n === 1 ? '' : 's'}
                  </div>
                </Link>
                <button
                  type="button"
                  onClick={() => setToDelete(p)}
                  className="tap rounded-full p-2 text-ink/60 transition-colors hover:bg-red-50 hover:text-red-600"
                  aria-label={`Delete ${p.name}`}
                  title="Delete patient"
                >
                  <Trash2 className="h-4 w-4" aria-hidden />
                </button>
                <Link to={`/patients/${p.id}`} className="text-slate-300" aria-hidden tabIndex={-1}>
                  <ChevronRight className="h-5 w-5" />
                </Link>
              </div>
            );
          })}
        </div>
      )}

      <BackupSection />

      <ConfirmDialog
        open={toDelete !== null}
        title={toDelete ? `Delete ${toDelete.name}?` : ''}
        message={
          toDelete &&
          `This permanently removes ${toDelete.name}${
            deleteCaseCount > 0 ? ` and their ${deleteCaseCount} case${deleteCaseCount === 1 ? '' : 's'}` : ''
          } from this device. Export a backup first if you might need ${deleteCaseCount > 0 ? 'them' : 'it'}.`
        }
        confirmLabel="Delete"
        destructive
        onConfirm={() => {
          if (toDelete) {
            setRefocusIndex(patients.findIndex((p) => p.id === toDelete.id));
            removePatient(toDelete.id);
          }
          setToDelete(null);
        }}
        onCancel={cancelDelete}
      />
    </div>
  );
}
