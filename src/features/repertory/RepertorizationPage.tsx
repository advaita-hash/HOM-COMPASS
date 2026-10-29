import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Activity, BookOpen, CheckCircle2, Save, Trash2 } from 'lucide-react';
import { REPERTORIES, useRepertory, useRepertorySelection } from './repertoryData';
import { repertorize, useBindWorksheet, useWorksheet } from './worksheetStore';
import { RepertorySelect } from './RepertorySelect';
import { SymptomTranslator } from './SymptomTranslator';
import { CausativeFactor } from './CausativeFactor';
import { WorksheetGrid } from './WorksheetGrid';
import { RemedySupportModal } from './RemedySupportModal';
import { cleanSymptoms, useCaseDraft } from './caseDraftStore';
import { usePatients } from '../patients/patientsStore';
import { SegmentedControl } from '../../components/ui/SegmentedControl';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { ClinicalDisclaimer } from '../../components/ClinicalDisclaimer';
import { usePageTour } from '../tour/usePageTour';
import { TourButton } from '../tour/TourButton';
import { useTour } from '../tour/tourStore';
import { getTour } from '../tour/registry';

/** Phone/tablet tabs so each part of the case fits one screen (desktop shows
 *  everything in two columns, unchanged). */
type CaseTab = 'patient' | 'symptoms' | 'analysis';
const TABS: { id: CaseTab; label: string }[] = [
  { id: 'patient', label: 'Patient' },
  { id: 'symptoms', label: 'Symptoms' },
  { id: 'analysis', label: 'Analysis' },
];

/** The phone/tablet tab that holds each of the page tour's targets. */
const TOUR_TABS: Record<string, CaseTab | undefined> = {
  'cases-patient': 'patient',
  'causative-factor': 'symptoms',
  'symptom-translator': 'symptoms',
  'cases-save': 'symptoms',
  'cases-results': 'analysis',
  'cases-table': 'analysis',
};

/**
 * Case workspace: enter patient details, translate plain-language symptoms into
 * rubrics, repertorise live, and save the case to the patient's record.
 */
export default function RepertorizationPage() {
  usePageTour('cases');
  const { data: rep, isError: repFailed } = useRepertory();
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
  const clearSymptoms = useCaseDraft((s) => s.clear);
  /** The last saved case's patient — shown until the next edit starts a new case. */
  const [savedTo, setSavedTo] = useState<{ id: string; name: string } | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const [caseKey, setCaseKey] = useState(0); // remounts per-case inputs on reset
  const headingRef = useRef<HTMLHeadingElement>(null);
  const openRecordRef = useRef<HTMLAnchorElement>(null);
  const focusAfterClear = useRef(false);
  const [supportRemedy, setSupportRemedy] = useState<string | null>(null);
  const [tab, setTab] = useState<CaseTab>('patient'); // phone/tablet only
  // While the page tour points at something on another tab, that tab shows;
  // the person's own tab comes back when the tour ends. The switch waits a
  // frame so the tour is already looking for the new target when the old one
  // hides (switching in the same render left the tour stuck on the old step).
  const tourTab = useTour((s) => {
    const step = s.active?.tourId === 'cases' ? getTour('cases')?.steps[s.active.index] : undefined;
    return step?.target ? TOUR_TABS[step.target] : undefined;
  });
  const [tourShownTab, setTourShownTab] = useState<CaseTab | undefined>(undefined);
  useEffect(() => {
    const raf = requestAnimationFrame(() => setTourShownTab(tourTab));
    return () => cancelAnimationFrame(raf);
  }, [tourTab]);
  const shownTab = tourShownTab ?? tab;
  const symptomList = cleanSymptoms(symptoms); // individual, non-empty symptoms

  // On phone/tablet a section is shown only when its tab is active; on desktop
  // (lg+) every section is always visible in the two-column grid.
  const panel = (id: CaseTab) => (shownTab === id ? '' : 'hidden lg:block');

  const { scores, rubrics } = repertorize(rep, items);

  /** Empty the whole case — rubrics, symptoms and the causative-factor search. */
  function clearCase() {
    clear();
    clearSymptoms();
    setCaseKey((k) => k + 1);
  }

  // Only save once the repertory has loaded and the rubrics resolve: saving
  // clears the worksheet, so saving an unresolved (empty) case would lose it.
  const canSave = !!rep && rubrics.length > 0 && (patientId !== '' || name.trim() !== '');

  function saveCase() {
    // The guard against double saves is the live worksheet: it is emptied
    // synchronously after a save, so a repeat click finds nothing to save.
    if (!canSave || useWorksheet.getState().items.length === 0) return;
    let pid = patientId;
    let patientName = patients.find((p) => p.id === pid)?.name ?? '';
    if (!pid) {
      const p = addPatient({
        name: name.trim(),
        age: age ? Number(age) : null,
        gender: gender || null,
        notes: null,
      });
      pid = p.id;
      patientName = p.name;
    }
    const symptomLines = symptomList; // each symptom saved individually
    const topRemedies = scores.slice(0, 5).map((s) => `${s.name} (${s.totalScore})`);
    const notes =
      `Rubrics (${rubrics.length}): ${rubrics.map((r) => r.rubric).join('; ')}` +
      (topRemedies.length
        ? `\n\nAutomated repertorisation (study aid, not a prescription): ${topRemedies.join(', ')}`
        : '');
    const c = addCase(pid);
    updateCase(c.id, { symptoms_list: symptomLines, notes });

    // Start the next patient from a clean slate — nothing carries over.
    clearCase();
    setPatientId('');
    setName('');
    setAge('');
    setGender('');
    setSavedTo({ id: pid, name: patientName });
  }

  const hasCaseText = items.length > 0 || symptoms.some((s) => s.trim() !== '');
  const isBlank =
    !hasCaseText && patientId === '' && name.trim() === '' && age === '' && gender === '';

  // The success message stays until the next case is started.
  useEffect(() => {
    if (!isBlank) setSavedTo(null);
  }, [isBlank]);

  // The Save button disables itself after saving, so move keyboard focus to
  // the success message's link instead of leaving it stranded.
  useEffect(() => {
    if (savedTo) openRecordRef.current?.focus();
  }, [savedTo]);

  // "Clear case" unmounts its own button; land focus on the page heading
  // (this runs after the dialog's attempt to refocus the removed button).
  useEffect(() => {
    if (!confirmClear && focusAfterClear.current) {
      focusAfterClear.current = false;
      headingRef.current?.focus();
    }
  }, [confirmClear]);

  const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;
  const clearSummary = [
    items.length > 0 ? plural(items.length, 'rubric') : '',
    symptomList.length > 0 ? plural(symptomList.length, 'symptom') : '',
  ]
    .filter(Boolean)
    .join(' and ');

  function requestClear() {
    // Only ask when there is something to lose (stray blank lines are not).
    if (items.length > 0 || symptomList.length > 0) setConfirmClear(true);
    else clearCase();
  }
  const cancelClear = useCallback(() => setConfirmClear(false), []);

  return (
    // p-4 on phones (the HIG 16pt margin) leaves the three equal segments room for
    // "Analysis" plus its badge down to 360px wide; sm+ keeps the roomier padding.
    <div className="mx-auto max-w-6xl p-4 sm:p-6 md:p-8">
      <header className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Activity className="h-6 w-6 text-brand-600" />
          <div>
            <h1
              ref={headingRef}
              tabIndex={-1}
              className="text-2xl font-semibold text-slate-800 focus:outline-none"
            >
              Case
            </h1>
            <p className="text-sm text-slate-500">
              {items.length} rubric{items.length === 1 ? '' : 's'} · grade-weighted analysis
            </p>
          </div>
        </div>
        <div data-tour="cases-tools" className="flex flex-wrap items-center gap-2">
          <RepertorySelect />
          <Link to="/repertory" className="btn-secondary">
            <BookOpen className="h-4 w-4" /> Repertory
          </Link>
          {hasCaseText && (
            <button onClick={requestClear} className="btn-ghost text-red-600 hover:bg-red-50">
              <Trash2 className="h-4 w-4" /> Clear case
            </button>
          )}
          <TourButton tour="cases" />
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

      {/* Phone/tablet: segmented control — each segment fits one screen. Hidden on desktop. */}
      <div data-tour="cases-tabs" className="mb-4 lg:hidden">
        <SegmentedControl
          fullWidth
          ariaLabel="Case section"
          value={shownTab}
          onChange={setTab}
          options={TABS.map((t) => ({
            value: t.id,
            label: t.label,
            // -ml-1 tightens the label→badge gap to 4px; -mr-1 lets the badge use 4px of
            // the segment's 12px end padding on phones, so "Analysis" + badge fit at 360px.
            badge:
              t.id === 'analysis' && items.length > 0 ? (
                <span className="-ml-1 -mr-1 min-w-[20px] shrink-0 rounded-full bg-accent px-1 text-center text-2xs font-semibold leading-5 text-on-accent sm:mr-0">
                  {items.length}
                </span>
              ) : undefined,
          }))}
        />
      </div>

      {/* Shown once per screen (desktop and every phone tab), not per panel. */}
      <ClinicalDisclaimer className="mb-4" />

      {/* minmax(0,…) + min-w-0 let wide content (the score table) scroll inside
          its own card instead of widening the column and the page. */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[340px_minmax(0,1fr)]">
        {/* Left: STEP 1 — patient's language → rubrics */}
        <div className="min-w-0 space-y-4">
          <div className="hidden text-xs font-semibold uppercase tracking-wide text-slate-400 lg:block">
            Step 1 · Patient’s language → rubrics
          </div>
          <div data-tour="cases-patient" className={`card p-4 ${panel('patient')}`}>
            <h2 id="case-patient-heading" className="mb-2 text-sm font-semibold text-slate-700">
              Patient
            </h2>
            <select
              aria-labelledby="case-patient-heading"
              value={patientId}
              onChange={(e) => setPatientId(e.target.value)}
              className="mb-2 w-full rounded-lg border border-slate-200 bg-surface px-3 py-2 text-sm"
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
                  aria-label="Patient name"
                  autoComplete="off"
                  className="min-w-0 flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none"
                />
                <input
                  value={age}
                  onChange={(e) => setAge(e.target.value.replace(/\D/g, ''))}
                  placeholder="Age"
                  aria-label="Age"
                  inputMode="numeric"
                  className="w-16 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none"
                />
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  aria-label="Sex"
                  className="w-24 rounded-lg border border-slate-200 bg-surface px-2 py-2 text-sm"
                >
                  <option value="">Sex</option>
                  <option>Female</option>
                  <option>Male</option>
                  <option>Other</option>
                </select>
              </div>
            )}
          </div>

          <div className={`space-y-4 ${panel('symptoms')}`}>
          <CausativeFactor key={caseKey} rep={rep} />

          <SymptomTranslator
            rep={rep}
            text={symptoms.join('\n')}
            onTextChange={setFromText}
          />

          {symptomList.length > 0 && (
            <div className="card p-3">
              <div className="mb-2 text-2xs font-semibold uppercase tracking-wide text-slate-400">
                Symptoms saved individually ({symptomList.length})
              </div>
              <div className="flex flex-wrap gap-2">
                {symptoms.map((s, i) =>
                  s.trim() ? (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-3 py-1 text-xs text-brand-700"
                    >
                      {s.trim()}
                      <button
                        onClick={() => removeSymptom(i)}
                        className="tap px-1 text-brand-600 transition-colors hover:text-red-600"
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
            data-tour="cases-save"
            className="btn-primary w-full justify-center"
          >
            <Save className="h-4 w-4" /> Save case
          </button>
          {items.length > 0 && !rep && (
            <p className="text-center text-xs text-ink/60">
              {repFailed
                ? 'The repertory couldn’t load, so this case can’t be saved yet. Your rubrics are kept.'
                : 'Loading the repertory — you can save once it’s ready.'}
            </p>
          )}
          <div role="status" aria-live="polite">
            {savedTo && (
              <div className="flex items-start gap-2 rounded-lg border border-brand-200 bg-brand-50 px-3 py-2 text-sm text-ink/90">
                <CheckCircle2 className="mt-px h-4 w-4 shrink-0 text-brand-600" aria-hidden />
                <span className="min-w-0 flex-1">
                  Case saved to {savedTo.name}’s record. The worksheet is clear for the next
                  patient.{' '}
                  <Link
                    ref={openRecordRef}
                    to={`/patients/${savedTo.id}`}
                    className="tap font-medium text-brand-600 hover:underline"
                  >
                    Open record
                  </Link>
                </span>
              </div>
            )}
          </div>
          {patients.length > 0 && (
            <Link
              to="/patients"
              className="block text-center text-xs text-slate-500 hover:text-brand-600"
            >
              View all patients &amp; cases →
            </Link>
          )}
          </div>
        </div>

        {/* Right: STEP 2 & 3 — chosen rubrics graded & evaluated */}
        <div className={`min-w-0 ${panel('analysis')}`}>
          <div className="mb-2 hidden text-xs font-semibold uppercase tracking-wide text-slate-400 lg:block">
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

      <ConfirmDialog
        open={confirmClear}
        title="Clear this case?"
        message={`Removes ${clearSummary}. This can’t be undone.`}
        confirmLabel="Clear case"
        destructive
        onConfirm={() => {
          clearCase();
          focusAfterClear.current = true;
          setConfirmClear(false);
        }}
        onCancel={cancelClear}
      />

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
