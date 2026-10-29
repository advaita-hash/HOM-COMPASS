import { useState } from 'react';
import { Loader2, LogIn } from 'lucide-react';
import { COMMON_ROOM_URL } from '../../lib/commonRoom';
import { signInToCommonRoom } from './useCommonRoom';

/** Sign in with a Common Room account to see your own remedy notes. */
export default function CommonRoomSignIn() {
  const [id, setId] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  return (
    <form
      // shared target: the My notes tour points here (it also shows on a remedy's page)
      data-tour="common-room-sign-in"
      className="max-w-sm space-y-3"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError('');
        try {
          await signInToCommonRoom(id, password);
        } catch (err) {
          setError((err as Error).message);
        }
        setBusy(false);
      }}
    >
      <p className="text-sm text-slate-600">
        Your remedy notes are written in Common Room's OPD notes. Sign in with the same Common Room account to
        see them here.
      </p>
      <input
        className="w-full rounded-lg border px-3 py-2 text-sm"
        placeholder="Username or email"
        autoComplete="username"
        autoCapitalize="none"
        value={id}
        onChange={(e) => setId(e.target.value)}
        required
        aria-label="Common Room username or email"
      />
      <input
        className="w-full rounded-lg border px-3 py-2 text-sm"
        type="password"
        placeholder="Password"
        autoComplete="current-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
        aria-label="Common Room password"
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button className="btn-primary" disabled={busy}>
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />} Sign in with
        Common Room
      </button>
      <p className="text-xs text-slate-500">
        No password yet? Set one in{' '}
        <a className="underline" href={COMMON_ROOM_URL} target="common-room" rel="noopener noreferrer">
          Common Room
        </a>{' '}
        under Edit profile.
      </p>
    </form>
  );
}
