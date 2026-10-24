import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { safeStorage } from '../../lib/safeStorage';

export interface Patient {
  id: string;
  name: string;
  age: number | null;
  gender: string | null;
  notes: string | null;
  created_at: string;
}

export interface Case {
  id: string;
  patient_id: string;
  visit_date: string;
  symptoms_list: string[];
  notes: string;
}

interface PatientsState {
  patients: Patient[];
  cases: Case[];
  addPatient: (p: Omit<Patient, 'id' | 'created_at'>) => Patient;
  updatePatient: (id: string, patch: Partial<Patient>) => void;
  removePatient: (id: string) => void;
  addCase: (patientId: string) => Case;
  updateCase: (id: string, patch: Partial<Case>) => void;
  removeCase: (id: string) => void;
  casesFor: (patientId: string) => Case[];
}

function uid(prefix: string): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `${prefix}_${Date.now().toString(36)}_${Math.floor(Math.random() * 1e6).toString(36)}`;
}

// ---- Persisted-data migration ------------------------------------------------
// Older saves (version 0) and hand-edited backups may carry nulls or missing
// fields. Every load is normalised to the shapes above (migrate for old
// versions, merge for everything) so the UI never has to guard against them.

type Loose = Record<string, unknown>;

const isObj = (v: unknown): v is Loose => typeof v === 'object' && v !== null && !Array.isArray(v);
const str = (v: unknown, fallback = ''): string => (typeof v === 'string' ? v : fallback);
const strOrNull = (v: unknown): string | null => (typeof v === 'string' && v !== '' ? v : null);

function normalisePatient(raw: Loose): Patient {
  const age =
    typeof raw.age === 'number' ? raw.age : typeof raw.age === 'string' && raw.age.trim() ? Number(raw.age) : NaN;
  return {
    id: str(raw.id) || uid('pat'),
    name: str(raw.name).trim() || 'Unnamed patient',
    age: Number.isFinite(age) ? age : null,
    gender: strOrNull(raw.gender),
    notes: typeof raw.notes === 'string' ? raw.notes : null,
    created_at: str(raw.created_at) || new Date(0).toISOString(),
  };
}

function normaliseCase(raw: Loose): Case {
  const symptoms = Array.isArray(raw.symptoms_list)
    ? raw.symptoms_list
    : typeof raw.symptoms_list === 'string'
      ? raw.symptoms_list.split('\n')
      : [];
  return {
    id: str(raw.id) || uid('case'),
    patient_id: str(raw.patient_id),
    visit_date: str(raw.visit_date) || new Date(0).toISOString(),
    symptoms_list: symptoms.filter((s): s is string => typeof s === 'string'),
    notes: str(raw.notes),
  };
}

/** Brings persisted patients data from any earlier version to the current shape. */
export function migratePatients(persisted: unknown): Pick<PatientsState, 'patients' | 'cases'> {
  const state = isObj(persisted) ? persisted : {};
  const patients = Array.isArray(state.patients) ? state.patients.filter(isObj).map(normalisePatient) : [];
  const cases = Array.isArray(state.cases) ? state.cases.filter(isObj).map(normaliseCase) : [];
  return { patients, cases };
}

export const usePatients = create<PatientsState>()(
  persist(
    (set, get) => ({
      patients: [],
      cases: [],
      addPatient: (p) => {
        const patient: Patient = { id: uid('pat'), created_at: new Date().toISOString(), ...p };
        set({ patients: [patient, ...get().patients] });
        return patient;
      },
      updatePatient: (id, patch) =>
        set({ patients: get().patients.map((p) => (p.id === id ? { ...p, ...patch } : p)) }),
      removePatient: (id) =>
        set({
          patients: get().patients.filter((p) => p.id !== id),
          cases: get().cases.filter((c) => c.patient_id !== id),
        }),
      addCase: (patientId) => {
        const c: Case = {
          id: uid('case'),
          patient_id: patientId,
          visit_date: new Date().toISOString(),
          symptoms_list: [],
          notes: '',
        };
        set({ cases: [c, ...get().cases] });
        return c;
      },
      updateCase: (id, patch) =>
        set({ cases: get().cases.map((c) => (c.id === id ? { ...c, ...patch } : c)) }),
      removeCase: (id) => set({ cases: get().cases.filter((c) => c.id !== id) }),
      casesFor: (patientId) =>
        get()
          .cases.filter((c) => c.patient_id === patientId)
          .sort((a, b) => b.visit_date.localeCompare(a.visit_date)),
    }),
    {
      name: 'hom-compass.patients',
      storage: safeStorage(),
      version: 1,
      migrate: (persisted) => migratePatients(persisted) as PatientsState,
      merge: (persisted, current) => ({ ...current, ...migratePatients(persisted) }),
    },
  ),
);
