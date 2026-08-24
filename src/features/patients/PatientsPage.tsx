import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Trash2, UserPlus, Users } from 'lucide-react';
import { usePatients } from './patientsStore';

export default function PatientsPage() {
  const { patients, cases, addPatient, removePatient } = usePatients();
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('');

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
          <h1 className="text-2xl font-semibold text-slate-800">Patients &amp; Cases</h1>
          <p className="text-sm text-slate-500">{patients.length} patients</p>
        </div>
      </header>

      <form onSubmit={submit} className="card mb-5 flex flex-wrap items-end gap-3 p-4">
        <div className="flex-1">
          <label className="mb-1 block text-xs font-medium text-slate-500">Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Patient name"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-400 focus:outline-none"
          />
        </div>
        <div className="w-20">
          <label className="mb-1 block text-xs font-medium text-slate-500">Age</label>
          <input
            value={age}
            onChange={(e) => setAge(e.target.value.replace(/\D/g, ''))}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-400 focus:outline-none"
          />
        </div>
        <div className="w-28">
          <label className="mb-1 block text-xs font-medium text-slate-500">Gender</label>
          <select
            value={gender}
            onChange={(e) => setGender(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-white px-2 py-2 text-sm"
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
        <div className="card p-10 text-center text-sm text-slate-400">
          No patients yet — add your first above.
        </div>
      ) : (
        <div className="card overflow-hidden">
          {patients.map((p) => {
            const n = cases.filter((c) => c.patient_id === p.id).length;
            return (
              <div
                key={p.id}
                className="flex items-center gap-3 border-b border-slate-100 px-4 py-3 last:border-0 hover:bg-slate-50"
              >
                <Link to={`/patients/${p.id}`} className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-slate-800">{p.name}</div>
                  <div className="text-xs text-slate-500">
                    {[p.age ? `${p.age}y` : null, p.gender].filter(Boolean).join(' · ') || '—'} ·{' '}
                    {n} case{n === 1 ? '' : 's'}
                  </div>
                </Link>
                <button
                  onClick={() => removePatient(p.id)}
                  className="rounded p-1.5 text-slate-300 hover:bg-red-50 hover:text-red-600"
                  aria-label={`Remove ${p.name}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
                <Link to={`/patients/${p.id}`} className="text-slate-300">
                  <ChevronRight className="h-5 w-5" />
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
