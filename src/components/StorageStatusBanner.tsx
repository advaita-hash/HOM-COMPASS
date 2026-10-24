import { Link } from 'react-router-dom';
import { TriangleAlert } from 'lucide-react';
import { useStorageHealth } from '../lib/safeStorage';

/**
 * Persistent warning shown while changes cannot be saved on this device.
 * Sticky at the top of the content column so it stays visible while working.
 */
export function StorageStatusBanner() {
  const { failedKey, reason } = useStorageHealth();
  if (!failedKey) return null;
  return (
    <div
      role="alert"
      className="sticky top-0 z-20 border-b border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 md:px-8"
    >
      <div className="mx-auto flex max-w-5xl items-start gap-3">
        <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
        <p className="min-w-0 flex-1">
          <strong className="font-semibold">Not saved.</strong> {reason} New changes will be lost when you close this
          tab.{' '}
          <Link to="/patients#backup" className="font-semibold underline underline-offset-2">
            Export a backup now
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
