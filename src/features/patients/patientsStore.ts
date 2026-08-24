import { create } from 'zustand';
import { persist } from 'zustand/middleware';

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
    { name: 'hom-compass.patients' },
  ),
);
