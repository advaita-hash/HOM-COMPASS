import { useEffect, useState } from 'react';
import { NavLink, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import {
  Activity,
  BookOpen,
  BookText,
  CalendarDays,
  Compass,
  FlaskConical,
  LayoutDashboard,
  Library,
  Menu,
  Network,
  Search,
  Users,
  X,
} from 'lucide-react';
import { isSupabaseConfigured } from './lib/supabase';
import DashboardPage from './features/dashboard/DashboardPage';
import LibraryPage from './features/library/LibraryPage';
import RemedyOfTheDayPage from './features/remedy/RemedyOfTheDayPage';
import MateriaMedicaPage from './features/materia-medica/MateriaMedicaPage';
import BooksPage from './features/books/BooksPage';
import BookReaderPage from './features/books/BookReaderPage';
import RepertoryPage from './features/repertory/RepertoryPage';
import RepertorizationPage from './features/repertory/RepertorizationPage';
import GlobalSearchPage from './features/search/GlobalSearchPage';
import PatientsPage from './features/patients/PatientsPage';
import PatientDetailPage from './features/patients/PatientDetailPage';
import KnowledgeGraphPage from './features/graph/KnowledgeGraphPage';

// ---------------------------------------------------------------------------
// Application shell — responsive navigation + routed module outlet.
// Desktop (lg+): a persistent left sidebar. Phone/tablet: a top bar with a
// hamburger that opens the same nav as a slide-in drawer.
// ---------------------------------------------------------------------------

const NAV = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/search', label: 'Search', icon: Search },
  { to: '/remedy-of-the-day', label: 'Remedy of the Day', icon: CalendarDays },
  { to: '/repertory', label: 'Repertory', icon: BookOpen },
  { to: '/analysis', label: 'Cases', icon: Activity },
  { to: '/materia-medica', label: 'Materia Medica', icon: FlaskConical },
  { to: '/books', label: 'Reference Books', icon: BookText },
  { to: '/library', label: 'Library', icon: Library },
  { to: '/graph', label: 'Knowledge Graph', icon: Network },
  { to: '/patients', label: 'Patients', icon: Users },
] as const;

function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <aside
      className={`fixed inset-y-0 left-0 z-50 flex w-64 max-w-[80vw] shrink-0 transform flex-col border-r border-slate-200 bg-white transition-transform duration-200 lg:static lg:z-auto lg:w-60 lg:max-w-none lg:translate-x-0 ${
        open ? 'translate-x-0 shadow-xl' : '-translate-x-full lg:shadow-none'
      }`}
    >
      <div className="flex items-center gap-2 px-5 py-5">
        <Compass className="h-7 w-7 shrink-0 text-brand-600" />
        <div className="min-w-0">
          <div className="text-lg font-bold leading-none text-slate-800">HOM-COMPASS</div>
          <div className="text-[11px] uppercase tracking-wide text-slate-400">
            Repertory &amp; Materia Medica
          </div>
        </div>
        <button
          onClick={onClose}
          className="ml-auto rounded-md p-1.5 text-slate-400 hover:bg-slate-100 lg:hidden"
          aria-label="Close menu"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3">
        {NAV.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-100'
              }`
            }
          >
            <Icon className="h-[18px] w-[18px] shrink-0" />
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
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  // Close the drawer on navigation.
  useEffect(() => setMenuOpen(false), [location.pathname]);

  return (
    <div className="flex h-full">
      {/* Mobile / tablet top bar */}
      <header className="fixed inset-x-0 top-0 z-30 flex h-14 items-center gap-3 border-b border-slate-200 bg-white/95 px-4 backdrop-blur lg:hidden">
        <button
          onClick={() => setMenuOpen(true)}
          className="rounded-md p-1.5 text-slate-600 hover:bg-slate-100"
          aria-label="Open menu"
        >
          <Menu className="h-6 w-6" />
        </button>
        <Compass className="h-6 w-6 text-brand-600" />
        <span className="font-bold text-slate-800">HOM-COMPASS</span>
      </header>

      {/* Backdrop when the drawer is open (mobile/tablet only) */}
      {menuOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/40 lg:hidden"
          onClick={() => setMenuOpen(false)}
          aria-hidden
        />
      )}

      <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} />

      <main className="min-w-0 flex-1 overflow-auto pt-14 lg:pt-0">
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/remedy-of-the-day" element={<RemedyOfTheDayPage />} />
          <Route path="/repertory" element={<RepertoryPage />} />
          <Route path="/analysis" element={<RepertorizationPage />} />
          <Route path="/materia-medica" element={<MateriaMedicaPage />} />
          <Route path="/materia-medica/:remedyId" element={<MateriaMedicaPage />} />
          <Route path="/books" element={<BooksPage />} />
          <Route path="/books/:bookId" element={<BookReaderPage />} />
          <Route path="/books/:bookId/:remedySlug" element={<BookReaderPage />} />
          <Route path="/library" element={<LibraryPage />} />
          <Route path="/graph" element={<KnowledgeGraphPage />} />
          <Route path="/search" element={<GlobalSearchPage />} />
          <Route path="/patients" element={<PatientsPage />} />
          <Route path="/patients/:patientId" element={<PatientDetailPage />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </main>
    </div>
  );
}
