import { NavLink, Navigate, Route, Routes } from 'react-router-dom';
import {
  Activity,
  BookOpen,
  Compass,
  FlaskConical,
  LayoutDashboard,
  Network,
  Users,
} from 'lucide-react';
import { isSupabaseConfigured } from './lib/supabase';

// ---------------------------------------------------------------------------
// Application shell — sidebar navigation + routed module outlet.
// Feature modules are stubbed for now; each will be built out in turn.
// ---------------------------------------------------------------------------

const NAV = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/repertory', label: 'Repertory', icon: BookOpen },
  { to: '/analysis', label: 'Repertorisation', icon: Activity },
  { to: '/materia-medica', label: 'Materia Medica', icon: FlaskConical },
  { to: '/graph', label: 'Knowledge Graph', icon: Network },
  { to: '/patients', label: 'Patients & Cases', icon: Users },
] as const;

function Placeholder({ title }: { title: string }) {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold text-slate-800">{title}</h1>
      <p className="mt-2 max-w-prose text-sm text-slate-500">
        This module is scaffolded and will be implemented next. The application
        shell, routing, design system, Supabase client and the GraphRAG database
        schema are already in place.
      </p>
    </div>
  );
}

function Sidebar() {
  return (
    <aside className="flex w-60 flex-col border-r border-slate-200 bg-white">
      <div className="flex items-center gap-2 px-5 py-5">
        <Compass className="h-7 w-7 text-brand-600" />
        <div>
          <div className="text-lg font-bold leading-none text-slate-800">
            HOM-COMPASS
          </div>
          <div className="text-[11px] uppercase tracking-wide text-slate-400">
            Repertory &amp; Materia Medica
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3">
        {NAV.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-brand-50 text-brand-700'
                  : 'text-slate-600 hover:bg-slate-100'
              }`
            }
          >
            <Icon className="h-4.5 w-4.5" />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="px-5 py-4 text-[11px] text-slate-400">
        {isSupabaseConfigured ? (
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-500" /> Connected
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-amber-500" /> Demo mode
          </span>
        )}
      </div>
    </aside>
  );
}

export default function App() {
  return (
    <div className="flex h-full">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Placeholder title="Dashboard" />} />
          <Route path="/repertory" element={<Placeholder title="Repertory" />} />
          <Route path="/analysis" element={<Placeholder title="Repertorisation" />} />
          <Route
            path="/materia-medica"
            element={<Placeholder title="Materia Medica" />}
          />
          <Route path="/graph" element={<Placeholder title="Knowledge Graph" />} />
          <Route path="/patients" element={<Placeholder title="Patients & Cases" />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </main>
    </div>
  );
}
