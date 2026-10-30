import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, Loader2, Network, Search } from 'lucide-react';
import { type GNode, type NodeLabel, useGraph } from './graphData';
import { canonicalName } from '../../lib/remedyName';
import { useBook } from '../books/booksIndex';
import { findChapterFor } from '../notepad/remedyKey';
import { TourButton } from '../tour/TourButton';
import { usePageTour } from '../tour/usePageTour';

/** Remedy node names get the canonical spelling; rubric/chapter names don't. */
function nodeLabel(n: GNode): string {
  return n.label === 'REMEDY' ? canonicalName(n.name) : n.name;
}

// Theme-aware node colours (CSS variables from design/tokens.js).
const COLOR: Record<NodeLabel, string> = {
  REMEDY: 'rgb(var(--accent))',
  RUBRIC: 'rgb(var(--c-violet-500))',
  CHAPTER: 'rgb(var(--c-blue-500))',
};
const LABEL_TEXT: Record<NodeLabel, string> = {
  REMEDY: 'Remedy',
  RUBRIC: 'Rubric',
  CHAPTER: 'Chapter',
};

const MAX_NEIGHBORS = 14;

export default function KnowledgeGraphPage() {
  const { data: graph, isLoading } = useGraph();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  usePageTour('graph');

  const current = useMemo(() => {
    if (!graph) return null;
    if (selectedId && graph.nodes.has(selectedId)) return graph.nodes.get(selectedId)!;
    // default: the highest-degree remedy
    let best: GNode | null = null;
    for (const n of graph.nodes.values())
      if (n.label === 'REMEDY' && (!best || n.degree > best.degree)) best = n;
    return best;
  }, [graph, selectedId]);

  const neighbors = useMemo(() => {
    if (!graph || !current) return [];
    return (graph.neighbors.get(current.id) ?? []).slice(0, MAX_NEIGHBORS);
  }, [graph, current]);

  // the remedy's own chapter in Boericke, when it has one
  const { data: boericke } = useBook('boericke');
  const boerickeSlug =
    boericke && current?.label === 'REMEDY'
      ? (findChapterFor(boericke, current.name) ?? findChapterFor(boericke, canonicalName(current.name)))?.slug
      : undefined;

  const searchResults = useMemo(() => {
    if (!graph || query.trim().length < 2) return [];
    const q = query.toLowerCase();
    const out: GNode[] = [];
    for (const n of graph.nodes.values()) {
      if (n.name.toLowerCase().includes(q)) out.push(n);
      if (out.length > 30) break;
    }
    return out.sort((a, b) => b.degree - a.degree);
  }, [graph, query]);

  // radial layout geometry
  const W = 640;
  const H = 460;
  const cx = W / 2;
  const cy = H / 2;
  const R = 170;

  return (
    <div className="mx-auto max-w-5xl p-6 md:p-8">
      <div
        role="note"
        data-tour="graph-sample"
        className="mb-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800"
      >
        <AlertTriangle className="mt-px h-4 w-4 shrink-0 text-amber-600" aria-hidden />
        <span>Demo data — this graph uses a 55-rubric sample, not the full Kent repertory.</span>
      </div>

      <header className="mb-4 flex items-center gap-3">
        <Network className="mt-1 h-6 w-6 shrink-0 self-start text-brand-600" />
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-semibold text-slate-800">Knowledge Graph</h1>
          <p className="text-sm text-slate-500">
            Explore remedy · rubric · chapter relationships (grade-weighted).
          </p>
        </div>
        <TourButton tour="graph" className="-mr-3" />
      </header>

      <div className="relative mb-4">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          data-tour="graph-search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Find a remedy, rubric or chapter…"
          className="w-full rounded-lg border border-slate-200 bg-surface py-3 pl-10 pr-3 text-sm focus:outline-none"
        />
        {searchResults.length > 0 && (
          <div className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-lg border border-slate-200 bg-surface shadow-lg">
            {searchResults.map((n) => (
              <button
                key={n.id}
                onClick={() => {
                  setSelectedId(n.id);
                  setQuery('');
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-slate-50"
              >
                <span className="h-2 w-2 rounded-full" style={{ background: COLOR[n.label] }} />
                <span className="flex-1 truncate">{nodeLabel(n)}</span>
                <span className="text-2xs uppercase text-slate-400">{LABEL_TEXT[n.label]}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {isLoading && (
        <div className="flex items-center gap-2 p-8 text-sm text-slate-400">
          <Loader2 className="h-4 w-4 animate-spin" /> Building graph…
        </div>
      )}

      {graph && current && (
        <div className="grid gap-4 lg:grid-cols-[1fr_260px]">
          <div data-tour="graph-map" className="card overflow-hidden">
            <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
              {/* edges */}
              {neighbors.map((nb, i) => {
                const a = (i / neighbors.length) * Math.PI * 2 - Math.PI / 2;
                const x = cx + R * Math.cos(a);
                const y = cy + R * Math.sin(a);
                return (
                  <line
                    key={`e-${nb.node.id}`}
                    x1={cx}
                    y1={cy}
                    x2={x}
                    y2={y}
                    style={{ stroke: 'rgb(var(--ink) / 0.15)' }}
                    strokeWidth={nb.weight}
                  />
                );
              })}
              {/* neighbour nodes */}
              {neighbors.map((nb, i) => {
                const a = (i / neighbors.length) * Math.PI * 2 - Math.PI / 2;
                const x = cx + R * Math.cos(a);
                const y = cy + R * Math.sin(a);
                const nm = nodeLabel(nb.node);
                const label = nm.length > 16 ? nm.slice(0, 15) + '…' : nm;
                return (
                  <g
                    key={nb.node.id}
                    className="cursor-pointer"
                    onClick={() => setSelectedId(nb.node.id)}
                  >
                    <circle cx={x} cy={y} r={9} style={{ fill: COLOR[nb.node.label] }} opacity={0.85} />
                    <text
                      x={x}
                      y={y - 13}
                      textAnchor="middle"
                      className="fill-slate-600"
                      style={{ fontSize: 10 }}
                    >
                      {label}
                    </text>
                  </g>
                );
              })}
              {/* center node */}
              <circle cx={cx} cy={cy} r={16} style={{ fill: COLOR[current.label] }} />
              <text
                x={cx}
                y={cy + 34}
                textAnchor="middle"
                className="fill-slate-800"
                style={{ fontSize: 13, fontWeight: 600 }}
              >
                {nodeLabel(current)}
              </text>
            </svg>
          </div>

          <aside className="space-y-3">
            <div data-tour="graph-details" className="card p-4">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: COLOR[current.label] }} />
                <span className="text-2xs uppercase tracking-wide text-slate-400">
                  {LABEL_TEXT[current.label]}
                </span>
              </div>
              <h2 className="mt-1 font-serif text-lg font-semibold text-slate-800">
                {nodeLabel(current)}
              </h2>
              <p className="text-xs text-slate-500">{current.degree} connections</p>
              {boerickeSlug && (
                <Link
                  to={`/books/boericke/${boerickeSlug}?view=full`}
                  className="mt-2 inline-block text-xs font-medium text-brand-600 hover:underline"
                >
                  Read in reference books →
                </Link>
              )}
            </div>
            <div data-tour="graph-connections" className="card p-3">
              <div className="mb-1 text-2xs font-semibold uppercase tracking-wide text-slate-400">
                Connections
              </div>
              <div className="max-h-64 space-y-1 overflow-auto">
                {neighbors.map((nb) => (
                  <button
                    key={nb.node.id}
                    onClick={() => setSelectedId(nb.node.id)}
                    className="flex w-full items-center gap-2 rounded px-2 py-1 text-left text-sm hover:bg-slate-50"
                  >
                    <span className="h-2 w-2 rounded-full" style={{ background: COLOR[nb.node.label] }} />
                    <span className="flex-1 truncate text-slate-700">{nodeLabel(nb.node)}</span>
                    {nb.relationship === 'HAS_RUBRIC' && (
                      <span className="text-2xs text-slate-400">g{nb.weight}</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
            <div data-tour="graph-legend" className="flex flex-wrap gap-3 px-1 text-2xs text-slate-500">
              {(['REMEDY', 'RUBRIC', 'CHAPTER'] as NodeLabel[]).map((l) => (
                <span key={l} className="inline-flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full" style={{ background: COLOR[l] }} />
                  {LABEL_TEXT[l]}
                </span>
              ))}
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
