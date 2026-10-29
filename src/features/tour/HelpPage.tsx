import { useId, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CircleHelp, Lightbulb, Play, RotateCcw } from 'lucide-react';
import { WELCOME_ID, allTours } from './registry';
import { startTourWhenPageShows, useTour } from './tourStore';
import { resolveTap, useTouchScreen } from './tapText';

/** iOS-style on/off switch with a 44px hit area (`.tap`). */
function Switch({
  checked,
  onChange,
  labelledBy,
  describedBy,
}: {
  checked: boolean;
  onChange: (on: boolean) => void;
  labelledBy: string;
  describedBy?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-labelledby={labelledBy}
      aria-describedby={describedBy}
      onClick={() => onChange(!checked)}
      className={`tap relative inline-flex h-[31px] w-[51px] shrink-0 items-center rounded-full transition-colors duration-300 ease-spring ${
        checked ? 'bg-accent' : 'bg-ink/20'
      }`}
    >
      <span
        aria-hidden
        className={`h-[27px] w-[27px] rounded-full bg-white shadow-segment transition-transform duration-300 ease-spring ${
          checked ? 'translate-x-[22px]' : 'translate-x-[2px]'
        }`}
      />
    </button>
  );
}

/**
 * Help & tour: replay the welcome tour, switch first-visit tips on or off,
 * and read every page's tour as plain text, with "Show me" to see it live.
 */
export default function HelpPage() {
  const touch = useTouchScreen();
  const navigate = useNavigate();
  const start = useTour((s) => s.start);
  const tipsEnabled = useTour((s) => s.tipsEnabled);
  const setTipsEnabled = useTour((s) => s.setTipsEnabled);
  const resetAll = useTour((s) => s.resetAll);
  const [resetDone, setResetDone] = useState(false);
  const tipsLabel = useId();
  const tipsHint = useId();

  const pageTours = allTours().filter((t) => t.id !== WELCOME_ID);

  function showMe(id: string, route: string) {
    navigate(route);
    startTourWhenPageShows(id);
  }

  return (
    <div className="page max-w-3xl">
      <header className="mb-6 flex items-center gap-3">
        <CircleHelp className="h-6 w-6 shrink-0 text-brand-600" aria-hidden />
        <div>
          <h1 className="text-2xl font-semibold text-ink/90">Help &amp; tour</h1>
          <p className="text-sm text-ink/70">What every page and button does, in plain words.</p>
        </div>
      </header>

      <section aria-label="Tour settings" className="card mb-8 divide-y divide-ink/10">
        <div className="flex flex-wrap items-center justify-between gap-3 p-5">
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-ink/90">Welcome tour</h2>
            <p className="text-sm text-ink/70">A one-minute walk through the menu.</p>
          </div>
          <button type="button" className="btn-primary" onClick={() => start(WELCOME_ID)}>
            <Play className="h-4 w-4" aria-hidden />
            Take the welcome tour
          </button>
        </div>

        <div className="flex items-center justify-between gap-4 p-5">
          <div className="min-w-0">
            <div id={tipsLabel} className="text-base font-medium text-ink/90">
              Show tips on new pages
            </div>
            <p id={tipsHint} className="text-sm text-ink/70">
              A short tour the first time you open each page. The ? buttons work either way.
            </p>
          </div>
          <Switch checked={tipsEnabled} onChange={setTipsEnabled} labelledBy={tipsLabel} describedBy={tipsHint} />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 p-5">
          <div className="min-w-0">
            <div className="text-base font-medium text-ink/90">Start over</div>
            <p className="text-sm text-ink/70" role="status" aria-live="polite">
              {resetDone ? 'Done — every page will show its tips again.' : 'Show every page’s tips again, as on your first visit.'}
            </p>
          </div>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => {
              resetAll();
              setResetDone(true);
            }}
          >
            <RotateCcw className="h-4 w-4" aria-hidden />
            Show all tips again
          </button>
        </div>
      </section>

      <h2 className="mb-4 text-lg font-semibold text-ink/90">Page by page</h2>
      {pageTours.length === 0 ? (
        <p className="card p-5 text-sm text-ink/70">Page tours will be listed here.</p>
      ) : (
        <div className="space-y-4">
          {pageTours.map((tour) => (
            <section key={tour.id} aria-labelledby={`help-${tour.id}`} className="card p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <h3 id={`help-${tour.id}`} className="text-base font-semibold text-ink/90">
                    {tour.title}
                  </h3>
                  <p className="text-sm text-ink/70">{tour.summary}</p>
                </div>
                {tour.route ? (
                  <button type="button" className="btn-secondary" onClick={() => showMe(tour.id, tour.route!)}>
                    <Play className="h-4 w-4" aria-hidden />
                    Show me
                    <span className="sr-only"> the {tour.title} tour</span>
                  </button>
                ) : (
                  <p className="text-sm text-ink/70">Open that page to see this tour.</p>
                )}
              </div>
              <ol className="mt-4 list-decimal space-y-3 pl-5 text-subhead leading-relaxed text-ink/80 marker:text-sm marker:text-ink/70">
                {tour.steps.map((s) => (
                  <li key={s.id} className="pl-1">
                    <span className="font-semibold text-ink/90">
                      {s.title}
                      {/[.!?]$/.test(s.title) ? '' : '.'}
                    </span>{' '}
                    {resolveTap(s.body, touch)}
                    {s.tip && (
                      <span className="mt-1 flex items-start gap-2 text-sm text-ink/80">
                        <Lightbulb className="mt-px h-4 w-4 shrink-0 text-brand-600" aria-hidden />
                        <span>
                          <span className="font-semibold">Try it:</span> {resolveTap(s.tip, touch)}
                        </span>
                      </span>
                    )}
                  </li>
                ))}
              </ol>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
