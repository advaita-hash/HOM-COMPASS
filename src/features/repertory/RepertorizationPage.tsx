import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Activity, BookOpen, Check, Save, Trash2 } from 'lucide-react';
import { REPERTORIES, useRepertory, useRepertorySelection } from './repertoryData';
import { repertorize, useBindWorksheet, useWorksheet } from './worksheetStore';
import { RepertorySelect } from './RepertorySelect';
import { SymptomTranslator } from './SymptomTranslator';
import { CausativeFactor } from './CausativeFactor';
import { WorksheetGrid } from './WorksheetGrid';
import { RemedySupportModal } from './RemedySupportModal';
import { cleanSymptoms, useCaseDraft } from './caseDraftStore';
import { usePatients } from '../patients/patientsStore';

/**
 * Case workspace: enter patient details, translate plain-language symptoms into
 * rubrics, repertorise live, and save the case to the patient's record.
 */
export default function RepertorizationPage() {
  const { data: rep } = useRepertory();
  const repId = useRepertorySelection((s) => s.id);
  const repMeta = REPERTORIES.find((r) => r.id === repId);
  useBindWorksheet(repId); // rubrics only ever from the chosen repertory
  const items = useWorksheet((s) => s.items);
  const clear = useWorksheet((s) => s.clear);

  const patients = usePatients((s) => s.patients);
  const addPatient = usePatients((s) => s.addPatient);
  const addCase = usePatients((s) => s.addCase);
  const updateCase = usePatients((s) => s.updateCase);

  const [patientId, setPatientId] = useState<string>('');
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('');
  const symptoms = useCaseDraft((s) => s.symptoms);
  const setFromText = useCaseDraft((s) => s.setFromText);
  const removeSymptom = useCaseDraft((s) => s.removeSymptom);
  const [saved, setSaved] = useState(false);
  const [supportRemedy, setSupportRemedy] = useState<string | null>(null);
  const symptomList = cleanSymptoms(symptoms); // individual, non-empty symptoms

  const { scores, rubrics } = repertorize(rep, items);

  function saveCase() {
    let pid = patientId;
    if (!pid) {
      if (!name.trim()) return;
      const p = addPatient({
        name: name.trim(),
        age: age ? Number(age) : null,
        gender: gender || null,
        notes: null,
      });
      pid = p.id;
      setPatientId(pid);
    }
    const symptomLines = symptomList; // each symptom saved individually
    const topRemedies = scores.slice(0, 5).map((s) => `${s.name} (${s.totalScore})`);
    const notes =
      `Rubrics (${rubrics.length}): ${rubrics.map((r) => r.rubric).join('; ')}` +
      (topRemedies.length ? `\n\nTop remedies: ${topRemedies.join(', ')}` : '');
    const c = addCase(pid);
    updateCase(c.id, { symptoms_list: symptomLines, notes });
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  const canSave = items.length > 0 && (patientId !== '' || name.trim() !== '');

  return (
    <div className="mx-auto max-w-6xl p-6 md:p-8">
      <header className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Activity className="h-6 w-6 text-brand-600" />
          <div>
            <h1 className="text-2xl font-semibold text-slate-800">Case</h1>
            <p className="text-sm text-slate-500">
              {items.length} rubric{items.length === 1 ? '' : 's'} · grade-weighted analysis
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <RepertorySelect />
          <Link to="/repertory" className="btn-ghost border border-slate-200">
            <BookOpen className="h-4 w-4" /> Repertory
          </Link>
          {items.length > 0 && (
            <button onClick={clear} className="btn-ghost text-red-600 hover:bg-red-50">
              <Trash2 className="h-4 w-4" /> Clear
            </button>
          )}
        </div>
      </header>

      {/* Chosen repertory — all rubrics come only from here */}
      <div className="mb-4 flex items-center gap-2 rounded-lg border border-brand-200 bg-brand-50 px-3 py-2 text-xs text-brand-800">
        <BookOpen className="h-4 w-4" />
        <span>
          Rubrics are taken <strong>only</strong> from the chosen repertory:{' '}
          <strong>{repMeta?.label ?? repId}</strong>. Switch it top-right (this clears the
          worksheet).
        </span>
      </div>

      <div className="grid gap-5 lg:grid-cols-[340px_1fr]">
        {/* Left: STEP 1 — patient's language → rubrics */}
        <div className="space-y-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Step 1 · Patient’s language → rubrics
          </div>
          <div className="card p-4">
            <h2 className="mb-2 text-sm font-semibold text-slate-700">Patient</h2>
            <select
              value={patientId}
              onChange={(e) => setPatientId(e.target.value)}
              className="mb-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
            >
              <option value="">New patient…</option>
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                  {p.age ? `, ${p.age}` : ''}
                </option>
              ))}
            </select>
            {patientId === '' && (
              <div className="flex flex-wrap gap-2">
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Name"
                  className="min-w-0 flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-400 focus:outline-none"
                />
                <input
                  value={age}
                  onChange={(e) => setAge(e.target.value.replace(/\D/g, ''))}
                  placeholder="Age"
                  className="w-16 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-400 focus:outline-none"
                />
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="w-24 rounded-lg border border-slate-200 bg-white px-2 py-2 text-sm"
                >
                  <option value="">Sex</option>
                  <option>Female</option>
                  <option>Male</option>
                  <option>Other</option>
                </select>
              </div>
            )}
          </div>

          <CausativeFactor rep={rep} />

          <SymptomTranslator
            rep={rep}
            text={symptoms.join('\n')}
            onTextChange={setFromText}
          />

          {symptomList.length > 0 && (
            <div className="card p-3">
              <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                Symptoms saved individually ({symptomList.length})
              </div>
              <div className="flex flex-wrap gap-1.5">
                {symptoms.map((s, i) =>
                  s.trim() ? (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2.5 py-0.5 text-xs text-brand-700"
                    >
                      {s.trim()}
                      <button
                        onClick={() => removeSymptom(i)}
                        className="text-brand-400 hover:text-red-600"
                        aria-label={`Remove "${s.trim()}"`}
                      >
                        ×
                      </button>
                    </span>
                  ) : null,
                )}
              </div>
            </div>
          )}

          <button
            onClick={saveCase}
            disabled={!canSave}
            className="btn-primary w-full justify-center"
          >
            {saved ? (
              <>
                <Check className="h-4 w-4" /> Saved to patient
              </>
            ) : (
              <>
                <Save className="h-4 w-4" /> Save case
              </>
            )}
          </button>
          {patients.length > 0 && (
            <Link
              to="/patients"
              className="block text-center text-xs text-slate-500 hover:text-brand-600"
            >
              View all patients &amp; cases →
            </Link>
          )}
        </div>

        {/* Right: STEP 2 & 3 — chosen rubrics graded & evaluated */}
        <div>
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Step 2 &amp; 3 · Chosen rubrics — graded &amp; evaluated
          </div>
          <WorksheetGrid rep={rep} onRemedy={setSupportRemedy} />
          {items.length > 0 && (
            <p className="mt-2 text-xs text-slate-400">
              Tip: click any remedy (a ranked card or a column heading) to see the Materia
              Medica lines that support it for these rubrics.
            </p>
          )}
        </div>
      </div>

      {supportRemedy && (
        <RemedySupportModal
          remedyName={supportRemedy}
          rubrics={rubrics}
          onClose={() => setSupportRemedy(null)}
        />
      )}
    </div>
  );
}
