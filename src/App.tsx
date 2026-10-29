import { useEffect } from 'react';
import { NavLink, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import {
  Activity,
  BookOpen,
  BookText,
  CalendarDays,
  CircleHelp,
  Compass,
  FlaskConical,
  LayoutDashboard,
  Library,
  Menu,
  Network,
  Search,
  Users,
  X,
  NotebookPen,
  Columns3,
  Sun,
  Moon,
  SunMoon,
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
import RemedyProfilePage from './features/remedy/RemedyProfilePage';
import MyNotesPage from './features/notes/MyNotesPage';
import SharedNotePage from './features/notes/SharedNotePage';
import ComparePage from './features/compare/ComparePage';
import HelpPage from './features/tour/HelpPage';
import { TourOverlay } from './features/tour/TourOverlay';
import { useWelcomeTour } from './features/tour/usePageTour';
import { useCompare } from './features/compare/compareStore';
import { SegmentedControl } from './components/ui/SegmentedControl';
import { StorageStatusBanner } from './components/StorageStatusBanner';
import { ErrorBoundary } from './components/ErrorBoundary';
import { DISCLAIMER } from './components/ClinicalDisclaimer';
import { type Appearance, useAppearance, useApplyAppearance } from './lib/appearance';
import { useShell } from './lib/shell';

// ---------------------------------------------------------------------------
// Application shell — responsive navigation + routed module outlet.
// Desktop (lg+): a persistent left sidebar. Phone/tablet: a top bar with a
// hamburger that opens the same nav as a slide-in drawer.
// ---------------------------------------------------------------------------

// `tour` is the item's data-tour target for the welcome tour (features/tour).
const NAV: readonly { to: string; label: string; icon: typeof Search; tour: string; demo?: true }[] = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, tour: 'nav-dashboard' },
  { to: '/search', label: 'Search', icon: Search, tour: 'nav-search' },
  { to: '/remedy-of-the-day', label: 'Remedy of the Day', icon: CalendarDays, tour: 'nav-remedy-of-the-day' },
  { to: '/repertory', label: 'Repertory', icon: BookOpen, tour: 'nav-repertory' },
  { to: '/analysis', label: 'Cases', icon: Activity, tour: 'nav-cases' },
  { to: '/materia-medica', label: 'Materia Medica', icon: FlaskConical, tour: 'nav-materia-medica' },
  { to: '/compare', label: 'Compare', icon: Columns3, tour: 'nav-compare' },
  { to: '/my-notes', label: 'My notes', icon: NotebookPen, tour: 'nav-my-notes' },
  { to: '/books', label: 'Reference Books', icon: BookText, tour: 'nav-books' },
  { to: '/library', label: 'Library', icon: Library, tour: 'nav-library' },
  // Built from the 55-rubric sample repertory, not the full Kent repertory.
  { to: '/graph', label: 'Knowledge Graph', icon: Network, tour: 'nav-graph', demo: true },
  { to: '/patients', label: 'Patients', icon: Users, tour: 'nav-patients' },
  { to: '/help', label: 'Help & tour', icon: CircleHelp, tour: 'nav-help' },
];

const APPEARANCE_CAPTION: Record<Appearance, string> = {
  light: 'Light',
  dark: 'Dark',
  system: 'Auto — matches your system',
};

/** Light / Dark / Auto, as in Settings › Display & Brightness. */
function AppearanceControl() {
  const mode = useAppearance((s) => s.mode);
  const setMode = useAppearance((s) => s.setMode);
  const icon = (Icon: typeof Sun, label: string) => (
    <>
      <Icon className="h-4 w-4" aria-hidden />
      <span className="sr-only">{label}</span>
    </>
  );
  return (
    <div className="px-4 pt-4" data-tour="nav-appearance">
      <div className="mb-2 px-1 text-2xs font-semibold uppercase tracking-wide text-ink/60">Appearance</div>
      <SegmentedControl
        fullWidth
        ariaLabel="Appearance"
        value={mode}
        onChange={setMode}
        options={[
          { value: 'light', title: 'Light', label: icon(Sun, 'Light') },
          { value: 'dark', title: 'Dark', label: icon(Moon, 'Dark') },
          { value: 'system', title: 'Auto (match system)', label: icon(SunMoon, 'Auto') },
        ]}
      />
      <p className="mt-2 px-1 text-2xs text-ink/60" aria-live="polite">
        {APPEARANCE_CAPTION[mode]}
      </p>
    </div>
  );
}

function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const compareCount = useCompare((s) => s.items.length);
  return (
    <aside
      className={`material fixed inset-y-0 left-0 z-50 flex w-64 max-w-[80vw] shrink-0 transform flex-col border-r border-ink/10 transition-transform duration-500 ease-smooth lg:static lg:z-auto lg:w-60 lg:max-w-none lg:translate-x-0 ${
        open ? 'translate-x-0 shadow-float' : '-translate-x-full lg:shadow-none'
      }`}
      style={{
        paddingTop: 'env(safe-area-inset-top)',
        paddingLeft: 'env(safe-area-inset-left)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      <div className="flex items-center gap-3 px-5 py-5">
        <Compass className="h-7 w-7 shrink-0 text-brand-600" />
        <div className="min-w-0">
          <div className="text-lg font-bold leading-none text-ink/90">HOM-COMPASS</div>
          <div className="mt-1 text-2xs uppercase tracking-wide text-ink/60">
            Repertory &amp; Materia Medica
          </div>
        </div>
        <button
          onClick={onClose}
          className="tap ml-auto flex h-8 w-8 items-center justify-center rounded-full bg-ink/[0.06] text-ink/60 transition-colors hover:bg-ink/10 lg:hidden"
          aria-label="Close menu"
        >
          <X className="h-4 w-4" strokeWidth={2.5} />
        </button>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3">
        {NAV.map(({ to, label, icon: Icon, tour, demo }) => (
          <NavLink
            key={to}
            to={to}
            data-tour={tour}
            onClick={onClose}
            className={({ isActive }) =>
              `flex min-h-[44px] items-center gap-3 rounded-lg px-3 py-2 text-sm transition-[background-color,color,transform,opacity] duration-300 ease-spring active:scale-[0.96] active:opacity-80 ${
                isActive
                  ? 'bg-accent/[0.12] font-semibold text-brand-700'
                  : 'font-medium text-ink/80 hover:bg-ink/[0.05]'
              }`
            }
          >
            {/* SF-Symbols-style: glyphs carry the accent, labels stay neutral */}
            <Icon className="h-[18px] w-[18px] shrink-0 text-brand-600" />
            {/* Truncate rather than wrap, so every row keeps the 44px list rhythm. */}
            <span className="min-w-0 flex-1 truncate">
              {label}
              {demo && <span className="sr-only"> (demo, sample data)</span>}
            </span>
            {demo && (
              <span
                className="ml-auto h-2 w-2 shrink-0 rounded-full bg-amber-700"
                title="Uses sample data"
                aria-hidden="true"
              />
            )}
            {to === '/compare' && compareCount > 0 && (
              <span
                className="ml-auto min-w-[20px] shrink-0 rounded-full bg-accent px-2 text-center text-2xs font-semibold tabular-nums leading-5 text-on-accent"
                aria-label={`${compareCount} selected`}
              >
                {compareCount}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-ink/10">
        <AppearanceControl />
      </div>

      <div className="px-5 py-4 text-2xs text-ink/60">
        {isSupabaseConfigured ? (
          <span className="inline-flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500" /> Connected
          </span>
        ) : (
          <span className="inline-flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-amber-500" /> Demo mode
          </span>
        )}
        {/* Always-visible clinical disclaimer; full wording on hover / for screen readers. */}
        <p className="mt-2 leading-snug" title={DISCLAIMER}>
          Study aid — not a diagnosis or prescription.
          <span className="sr-only"> {DISCLAIMER}</span>
        </p>
      </div>
    </aside>
  );
}

export default function App() {
  const menuOpen = useShell((s) => s.menuOpen);
  const setMenuOpen = useShell((s) => s.setMenuOpen);
  const location = useLocation();

  // Close the drawer on navigation.
  useEffect(() => setMenuOpen(false), [location.pathname, setMenuOpen]);
  useApplyAppearance();
  // The welcome tour, once per device (not on the bare shared-note page).
  useWelcomeTour(location.pathname !== '/shared/note');

  // Shared-note links are a clean public page — no sidebar/app shell.
  if (location.pathname === '/shared/note')
    return (
      <ErrorBoundary>
        <SharedNotePage />
      </ErrorBoundary>
    );

  return (
    <div className="flex h-full">
      {/* Mobile / tablet top bar */}
      <header
        className="material fixed inset-x-0 top-0 z-30 border-b border-ink/10 lg:hidden"
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
      >
        <div className="flex h-14 items-center gap-2 px-2">
          <button
            onClick={() => setMenuOpen(true)}
            className="tap flex h-10 w-10 items-center justify-center rounded-full text-brand-600 transition-colors hover:bg-ink/[0.06] active:opacity-60"
            aria-label="Open menu"
            data-tour="nav-menu-button"
          >
            <Menu className="h-6 w-6" />
          </button>
          <Compass className="h-6 w-6 text-brand-600" />
          <span className="text-base font-semibold text-ink/90">HOM-COMPASS</span>
        </div>
      </header>

      {/* Dimmed backdrop behind the drawer (fades instead of popping) */}
      <div
        className={`fixed inset-0 z-40 transition-opacity duration-500 ease-smooth lg:hidden ${
          menuOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        style={{ background: 'var(--dim)' }}
        onClick={() => setMenuOpen(false)}
        aria-hidden
      />

      <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} />

      <main className="min-w-0 flex-1 overflow-auto pt-[calc(3.5rem+env(safe-area-inset-top))] lg:pt-0">
        <StorageStatusBanner />
        {/* Reset by route: a crash stays on its screen and navigating away recovers. */}
        <ErrorBoundary resetKey={location.pathname}>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/remedy-of-the-day" element={<RemedyOfTheDayPage />} />
            <Route path="/repertory" element={<RepertoryPage />} />
            <Route path="/analysis" element={<RepertorizationPage />} />
            <Route path="/materia-medica" element={<MateriaMedicaPage />} />
            <Route path="/materia-medica/:remedyId" element={<MateriaMedicaPage />} />
            <Route path="/remedy/:name" element={<RemedyProfilePage />} />
            <Route path="/my-notes" element={<MyNotesPage />} />
            <Route path="/compare" element={<ComparePage />} />
            <Route path="/books" element={<BooksPage />} />
            <Route path="/books/:bookId" element={<BookReaderPage />} />
            <Route path="/books/:bookId/:remedySlug" element={<BookReaderPage />} />
            <Route path="/library" element={<LibraryPage />} />
            <Route path="/graph" element={<KnowledgeGraphPage />} />
            <Route path="/search" element={<GlobalSearchPage />} />
            <Route path="/patients" element={<PatientsPage />} />
            <Route path="/patients/:patientId" element={<PatientDetailPage />} />
            <Route path="/help" element={<HelpPage />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </ErrorBoundary>
      </main>

      {/* The active tutorial, portaled over everything (features/tour). */}
      <TourOverlay />
    </div>
  );
}
