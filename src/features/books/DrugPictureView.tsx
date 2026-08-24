import { useMemo } from 'react';
import {
  ArrowDownRight,
  ArrowUpRight,
  Brain,
  Leaf,
  Sparkles,
  UserRound,
} from 'lucide-react';
import { type DrugPicture, distill } from './drugPicture';
import type { BookRemedy } from './types';

function Section({
  icon: Icon,
  title,
  items,
  accent,
}: {
  icon: typeof UserRound;
  title: string;
  items: string[];
  accent: string;
}) {
  if (items.length === 0) return null;
  return (
    <div className="card p-4">
      <div className="mb-2 flex items-center gap-2">
        <Icon className={`h-4 w-4 ${accent}`} />
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          {title}
        </h3>
      </div>
      <ul className="space-y-1.5">
        {items.map((s, i) => (
          <li key={i} className="flex gap-2 text-sm leading-relaxed text-slate-700">
            <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${accent.replace('text-', 'bg-')}`} />
            <span>{s}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Auto-distilled drug picture (constitution + portrait) for a book remedy. */
export function DrugPictureView({ remedy }: { remedy: BookRemedy }) {
  const dp: DrugPicture = useMemo(() => distill(remedy.text), [remedy.text]);
  const empty =
    dp.constitution.length +
      dp.mind.length +
      dp.generals.length +
      dp.worse.length +
      dp.better.length ===
    0;

  return (
    <article className="max-w-none">
      <h2 className="font-serif text-2xl font-bold text-slate-800">{remedy.name}</h2>
      {remedy.commonName && (
        <p className="mt-0.5 text-sm italic text-slate-500">{remedy.commonName}</p>
      )}
      <p className="mb-4 mt-1 inline-flex items-center gap-1 text-[11px] text-slate-400">
        <Sparkles className="h-3 w-3" /> Auto-distilled portrait — see “Full text” for the
        complete drug picture.
      </p>

      {empty ? (
        <p className="text-sm text-slate-500">
          Not enough structured cues to distil a portrait — read the full text.
        </p>
      ) : (
        <div className="space-y-4">
          <Section
            icon={UserRound}
            title="Constitution"
            items={dp.constitution}
            accent="text-brand-600"
          />
          <Section icon={Brain} title="Mind" items={dp.mind} accent="text-grade-3" />
          <Section icon={Leaf} title="Generals" items={dp.generals} accent="text-brand-500" />
          <div className="grid gap-4 md:grid-cols-2">
            <Section
              icon={ArrowDownRight}
              title="Worse (aggravation)"
              items={dp.worse}
              accent="text-grade-4"
            />
            <Section
              icon={ArrowUpRight}
              title="Better (amelioration)"
              items={dp.better}
              accent="text-grade-2"
            />
          </div>
        </div>
      )}
    </article>
  );
}
