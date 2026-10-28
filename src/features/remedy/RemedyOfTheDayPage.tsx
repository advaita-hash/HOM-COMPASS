import { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  BookOpenText,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  FlaskConical,
  Loader2,
  Shuffle,
  StickyNote,
} from 'lucide-react';
import { REMEDIES } from '../../data/remedies';
import { canonicalName } from '../../lib/remedyName';
import { DrugPictureView } from '../books/DrugPictureView';
import { distill } from '../books/drugPicture';
import { commonNameFor } from '../books/commonName';
import { BookCrossLinks } from '../books/BookCrossLinks';
import { CompareButton, CompareTray } from '../compare/CompareControls';
import { chapterHref } from '../notepad/links';
import { useRemedyPad } from '../notepad/notepadStore';
import { isRepertoryKey, remedyKeyForBookRemedy, remedyKeyForCurated } from '../notepad/remedyKey';
import { DAILY_BOOK, dateOfDay, dayOfIso, isoOfDay, localDayNumber, openingLede, pickDaily, useDailyRemedy } from './dailyRemedy';

/** Short chapters read better whole than as a distilled portrait. */
const SHORT_CHAPTER = 900;

/**
 * "Remedy of the Day": one of Boericke's remedies per local calendar day, each
 * cycle visiting every remedy once. Earlier days can be revisited (?date=).
 */
export default function RemedyOfTheDayPage() {
  const [params, setParams] = useSearchParams();
  const today = useMemo(() => localDayNumber(new Date()), []);
  // only today and earlier days can be opened
  const requested = dayOfIso(params.get('date'));
  const day = requested !== null && requested <= today ? requested : today;
  const isToday = day === today;
  const { book, pick, isLoading, isError } = useDailyRemedy(day);

  const goTo = (d: number) => setParams(d >= today ? {} : { date: isoOfDay(d) }, { replace: true });

  const dateLabel = dateOfDay(day).toLocaleDateString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const remedy = pick?.remedy;
  const key = book && remedy ? remedyKeyForBookRemedy(book, remedy) : undefined;
  const notes = useRemedyPad(key);
  const curated = key ? REMEDIES.find((r) => remedyKeyForCurated(r) === key) : undefined;
  const common = book && remedy ? commonNameFor(DAILY_BOOK, remedy, book) : null;
  const short = useMemo(
    () => (remedy ? remedy.text.length < SHORT_CHAPTER || isEmptyPortrait(remedy.text) : false),
    [remedy],
  );
  const tomorrow = useMemo(() => (book ? pickDaily(book, today + 1).remedy : undefined), [book, today]);

  return (
    <div className="page pb-28">
      <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-brand-600">
            <CalendarDays className="h-4 w-4" aria-hidden />
            <span className="text-xs font-semibold uppercase tracking-wide">Remedy of the Day</span>
          </div>
          <h1 className="mt-1 text-sm text-ink/70">
            {dateLabel}
            {!isToday && <span className="sr-only"> (an earlier day)</span>}
          </h1>
        </div>
        <nav aria-label="Choose a day" className="flex items-center gap-1">
          <button type="button" onClick={() => goTo(day - 1)} className="btn-ghost px-3" aria-label="Previous day">
            <ChevronLeft className="h-4 w-4" aria-hidden />
          </button>
          <button type="button" onClick={() => goTo(today)} disabled={isToday} className="btn-secondary">
            Today
          </button>
          <button
            type="button"
            onClick={() => goTo(day + 1)}
            disabled={isToday}
            className="btn-ghost px-3"
            aria-label="Next day"
          >
            <ChevronRight className="h-4 w-4" aria-hidden />
          </button>
        </nav>
      </header>

      {isLoading && (
        <div className="card flex items-center gap-2 p-6 text-sm text-ink/70">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Loading Boericke’s Materia Medica…
        </div>
      )}
      {isError && (
        <div className="card p-6 text-sm text-red-700">
          Boericke’s Materia Medica couldn’t load, so today’s remedy can’t be shown. Check your connection and reload.
        </div>
      )}

      {book && remedy && pick && key && (
        <>
          {/* the remedy, its lede and what to do next */}
          <section className="card mb-5 p-5" aria-labelledby="rotd-name">
            <h2 id="rotd-name" className="font-serif text-3xl font-bold leading-tight text-ink/90">
              {canonicalName(remedy.name)}
            </h2>
            {common && <p className="mt-1 text-sm italic text-ink/70">{common}</p>}
            {short ? (
              // a few lines in Boericke: show them all instead of a quote
              <div className="mt-4 space-y-3 font-serif text-subhead leading-relaxed text-ink/80">
                {remedy.text.split(/\n{2,}/).map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
              </div>
            ) : (
              <p className="mt-4 font-serif text-lg italic leading-relaxed text-ink/90">“{openingLede(remedy, 260)}”</p>
            )}
            <p className="mt-2 text-xs text-ink/70">From Boericke, Pocket Manual of Homœopathic Materia Medica</p>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Link to={`/books/${DAILY_BOOK}/${remedy.slug}`} className="btn-primary">
                <BookOpenText className="h-4 w-4" aria-hidden /> Read in Boericke
              </Link>
              <Link to={chapterHref(DAILY_BOOK, remedy.slug)} className="btn-secondary">
                <StickyNote className="h-4 w-4" aria-hidden />
                {notes.length ? `Notes (${notes.length})` : 'Add a note'}
              </Link>
              <CompareButton book={DAILY_BOOK} slug={remedy.slug} name={remedy.name} />
              {isRepertoryKey(key) && (
                <Link to={`/remedy/${encodeURIComponent(key)}`} className="btn-ghost">
                  Repertory profile
                </Link>
              )}
              {curated && (
                <Link to={`/materia-medica/${curated.id}`} className="btn-ghost">
                  <FlaskConical className="h-4 w-4" aria-hidden /> Study card
                </Link>
              )}
            </div>
          </section>

          {!short && (
            <DrugPictureView
              remedy={remedy}
              common={common}
              showHeading={false}
              caption="Auto-distilled from Boericke. Read the full chapter for the complete drug picture."
            />
          )}

          <div className="mt-5">
            <BookCrossLinks remedyName={remedy.name} />
          </div>

          <footer className="mt-6 flex flex-col gap-2 rounded-xl border border-dashed border-ink/20 px-4 py-3 text-sm text-ink/70 sm:flex-row sm:items-center sm:justify-between">
            {tomorrow && isToday ? (
              <span className="inline-flex items-center gap-2">
                <Shuffle className="h-4 w-4" aria-hidden />
                Tomorrow: <span className="font-medium text-ink/90">{canonicalName(tomorrow.name)}</span>
              </span>
            ) : (
              <span />
            )}
            <span className="text-xs">
              Day {pick.dayInCycle} of {pick.cycleLength} · every Boericke remedy once before any repeats
            </span>
          </footer>
        </>
      )}
      <CompareTray />
    </div>
  );
}

function isEmptyPortrait(text: string): boolean {
  const dp = distill(text);
  return dp.constitution.length + dp.mind.length + dp.generals.length + dp.worse.length + dp.better.length < 3;
}
