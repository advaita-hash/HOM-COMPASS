import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Download, HardDrive, TriangleAlert, Upload } from 'lucide-react';
import { usePatients } from './patientsStore';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import {
  PATIENTS_KEY,
  browserStorage,
  buildBackup,
  downloadBackup,
  parseBackup,
  readLastBackup,
  recordLastBackup,
  restoreBackup,
  type Backup,
  type BackupCounts,
} from '../../lib/backup';

const REMIND_AFTER_DAYS = 14;
const DAY_MS = 24 * 60 * 60 * 1000;

function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? '' : 's'}`;
}

function formatDate(d: Date): string {
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

/** "today", "yesterday", "3 days ago", or a date once it's more than a month old. */
function relativeDay(d: Date, now: Date): string {
  const startOf = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const days = Math.round((startOf(now) - startOf(d)) / DAY_MS);
  if (days < 0 || days > 30) return formatDate(d);
  return new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' }).format(-days, 'day');
}

/**
 * Export / restore of everything stored on this device. Lives at
 * /patients#backup, which the global "Not saved" banner links to.
 */
export function BackupSection() {
  const { hash, key: locationKey } = useLocation();
  const sectionRef = useRef<HTMLElement>(null);
  const patientCount = usePatients((s) => s.patients.length);
  const [lastBackup, setLastBackup] = useState<Date | null>(() => readLastBackup(browserStorage()));
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<{ backup: Backup; counts: BackupCounts } | null>(null);
  const [justExported, setJustExported] = useState(false);

  // keyed on the location too, so following the banner link again re-scrolls
  useEffect(() => {
    if (hash === '#backup') sectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [hash, locationKey]);

  const now = new Date();
  const overdue =
    patientCount > 0 && (!lastBackup || now.getTime() - lastBackup.getTime() > REMIND_AFTER_DAYS * DAY_MS);

  function exportBackup() {
    setError(null);
    setJustExported(false);
    try {
      // Export what's on screen, even if the last save to storage failed.
      const { patients, cases } = usePatients.getState();
      const backup = buildBackup(browserStorage(), { [PATIENTS_KEY]: { state: { patients, cases }, version: 1 } });
      downloadBackup(backup);
      const at = new Date(backup.exportedAt);
      recordLastBackup(browserStorage(), at);
      setLastBackup(at);
      setJustExported(true);
    } catch {
      setError('The backup couldn’t be created. Try again, or use a different browser.');
    }
  }

  async function chooseFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    // reset so choosing the same file again still fires a change
    e.target.value = '';
    if (!file) return;
    setError(null);
    setJustExported(false);
    let text: string;
    try {
      text = await file.text();
    } catch {
      setError('That file couldn’t be opened.');
      return;
    }
    const result = parseBackup(text);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setPending({ backup: result.backup, counts: result.counts });
  }

  const cancelRestore = useCallback(() => setPending(null), []);

  function confirmRestore() {
    if (!pending) return;
    const result = restoreBackup(pending.backup, browserStorage());
    if (!result.ok) {
      setPending(null);
      setError(result.error);
      return;
    }
    // reload so every store rehydrates from the restored data
    window.location.reload();
  }

  return (
    <section id="backup" ref={sectionRef} aria-labelledby="backup-heading" className="card mt-6 scroll-mt-16 p-4">
      <div className="flex items-start gap-3">
        <HardDrive className="h-5 w-5 shrink-0 text-brand-600" aria-hidden />
        <div className="min-w-0 flex-1">
          <h2 id="backup-heading" className="text-base font-semibold text-ink/90">
            Backup
          </h2>
          <p className="mt-1 text-sm text-ink/70">
            Patient records are saved only in this browser on this device. They aren’t uploaded or synced, so
            clearing site data, a private window, or a new browser or device starts empty. Export a backup regularly
            and keep the file somewhere safe — it contains patient details.
          </p>
          <p role="status" className="mt-2 text-xs text-ink/70">
            {lastBackup ? `Last backup: ${relativeDay(lastBackup, now)}` : 'No backup yet'}
            {justExported && ' · Backup exported, check your downloads'}
          </p>
        </div>
      </div>

      {overdue && (
        <div className="mt-4 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          <TriangleAlert className="h-4 w-4 shrink-0" aria-hidden />
          <p>
            {lastBackup
              ? `It’s been more than ${REMIND_AFTER_DAYS} days since your last backup.`
              : 'You haven’t exported a backup yet.'}{' '}
            Export one now so these records aren’t lost if this browser’s data is cleared.
          </p>
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-3">
        <button type="button" onClick={exportBackup} className="btn-primary">
          <Download className="h-4 w-4" aria-hidden /> Export backup
        </button>
        <label className="btn-secondary cursor-pointer has-[:focus-visible]:ring-2">
          <Upload className="h-4 w-4" aria-hidden /> Restore from backup
          <input
            type="file"
            accept="application/json,.json"
            onChange={chooseFile}
            className="sr-only"
          />
        </label>
      </div>

      {error && (
        <p role="alert" className="mt-3 text-sm text-red-600">
          {error}
        </p>
      )}

      <ConfirmDialog
        open={pending !== null}
        title="Replace data on this device?"
        message={
          pending && (
            <>
              This backup from {formatDate(new Date(pending.backup.exportedAt))} has{' '}
              {plural(pending.counts.patients, 'patient')} and {plural(pending.counts.cases, 'case')}. Patients, cases and settings in
              this backup replace the ones on this device. This can’t be undone.
            </>
          )
        }
        confirmLabel="Replace"
        destructive
        onConfirm={confirmRestore}
        onCancel={cancelRestore}
      />
    </section>
  );
}
