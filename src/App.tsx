import { NavLink, Navigate, Route, Routes } from 'react-router-dom';
import {
  Activity,
  BookOpen,
  BookText,
  CalendarDays,
  Compass,
  FlaskConical,
  LayoutDashboard,
  Library,
  Network,
  Search,
  Users,
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
// Application shell — sidebar navigation + routed module outlet.
// ---------------------------------------------------------------------------

const NAV = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/search', label: 'Search', icon: Search },
  { to: '/remedy-of-the-day', label: 'Remedy of the Day', icon: CalendarDays },
  { to: '/repertory', label: 'Repertory', icon: BookOpen },
  { to: '/analysis', label: 'Repertorisation', icon: Activity },
  { to: '/materia-medica', label: 'Materia Medica', icon: FlaskConical },
  { to: '/books', label: 'Reference Books', icon: BookText },
  { to: '/library', label: 'Library', icon: Library },
  { to: '/graph', label: 'Knowledge Graph', icon: Network },
  { to: '/patients', label: 'Patients & Cases', icon: Users },
] as const;

function Sidebar() {
  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-slate-200 bg-white">
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
            <Icon className="h-[18px] w-[18px]" />
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
