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
      <label className="block">
        <span className="mb-1 block text-sm font-medium text-ink/80">Common Room username or email</span>
        <input
          className="input"
          autoComplete="username"
          autoCapitalize="none"
          value={id}
          onChange={(e) => setId(e.target.value)}
          required
        />
      </label>
      <label className="block">
        <span className="mb-1 block text-sm font-medium text-ink/80">Password</span>
        <input
          className="input"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </label>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button className="btn-primary" disabled={busy}>
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />} Sign in with
        Common Room
      </button>
      <p className="text-sm text-ink/70">
        No password yet? Set one in{' '}
        <a className="underline" href={COMMON_ROOM_URL} target="common-room" rel="noopener noreferrer">
          Common Room
        </a>{' '}
        under Edit profile.
      </p>
    </form>
  );
}
