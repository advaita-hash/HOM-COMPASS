import {
  ArrowDownRight,
  ArrowUpRight,
  BookMarked,
  Brain,
  KeyRound,
  Leaf,
  Sparkles,
} from 'lucide-react';
import type { Remedy } from '../../data/remedies';

function Section({
  icon: Icon,
  title,
  items,
  accent = 'text-brand-600',
}: {
  icon: typeof Leaf;
  title: string;
  items: string[];
  accent?: string;
}) {
  return (
    <div className="card p-4">
      <div className="mb-3 flex items-center gap-2">
        <Icon className={`h-4 w-4 ${accent}`} />
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          {title}
        </h3>
      </div>
      <ul className="space-y-1.5">
        {items.map((item, i) => (
          <li key={i} className="flex gap-2 text-sm text-slate-700">
            <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${accent.replace('text-', 'bg-')}`} />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Full presentational view of a single remedy. */
export function RemedyDetail({ remedy }: { remedy: Remedy }) {
  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="card overflow-hidden">
        <div className="bg-gradient-to-r from-brand-600 to-brand-500 px-6 py-6 text-white">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h1 className="font-serif text-3xl font-bold">{remedy.name}</h1>
            <span className="rounded-md bg-white/20 px-2 py-0.5 text-sm font-medium">
              {remedy.abbr}
            </span>
          </div>
          <p className="mt-1 text-sm text-brand-50">
            {remedy.commonName} · {remedy.source}
          </p>
          <p className="mt-3 max-w-2xl font-serif text-[15px] italic leading-relaxed text-white/95">
            “{remedy.essence}”
          </p>
        </div>
      </div>

      {/* Keynotes — highlighted */}
      <div className="card border-brand-200 bg-brand-50/50 p-5">
        <div className="mb-3 flex items-center gap-2">
          <KeyRound className="h-4 w-4 text-brand-700" />
          <h2 className="text-sm font-semibold uppercase tracking-wide text-brand-800">
            Keynotes
          </h2>
        </div>
        <ul className="grid gap-2 sm:grid-cols-2">
          {remedy.keynotes.map((k, i) => (
            <li key={i} className="flex gap-2 text-sm text-slate-800">
              <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-brand-500" />
              <span>{k}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Section icon={Brain} title="Mind & Emotions" items={remedy.mind} accent="text-grade-3" />
        <Section icon={Leaf} title="Physical Generals" items={remedy.generals} accent="text-brand-600" />
        <Section
          icon={ArrowDownRight}
          title="Worse from (aggravation)"
          items={remedy.worse}
          accent="text-grade-4"
        />
        <Section
          icon={ArrowUpRight}
          title="Better from (amelioration)"
          items={remedy.better}
          accent="text-grade-2"
        />
      </div>

      <Section
        icon={BookMarked}
        title="Representative rubrics"
        items={remedy.keyRubrics}
        accent="text-slate-500"
      />
    </div>
  );
}
