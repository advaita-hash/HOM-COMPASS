import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, Network, Search } from 'lucide-react';
import { type GNode, type NodeLabel, useGraph } from './graphData';
import { canonicalName } from '../../lib/remedyName';

/** Remedy node names get the canonical spelling; rubric/chapter names don't. */
function nodeLabel(n: GNode): string {
  return n.label === 'REMEDY' ? canonicalName(n.name) : n.name;
}

const COLOR: Record<NodeLabel, string> = {
  REMEDY: '#26665c',
  RUBRIC: '#7c3aed',
  CHAPTER: '#3b82f6',
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
      <header className="mb-4 flex items-center gap-3">
        <Network className="h-6 w-6 text-brand-600" />
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">Knowledge Graph</h1>
          <p className="text-sm text-slate-500">
            Explore remedy · rubric · chapter relationships (grade-weighted).
          </p>
        </div>
      </header>

      <div className="relative mb-4">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Find a remedy, rubric or chapter…"
          className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
        />
        {searchResults.length > 0 && (
          <div className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-lg border border-slate-200 bg-white shadow-lg">
            {searchResults.map((n) => (
              <button
                key={n.id}
                onClick={() => {
                  setSelectedId(n.id);
                  setQuery('');
                }}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-slate-50"
              >
                <span className="h-2 w-2 rounded-full" style={{ background: COLOR[n.label] }} />
                <span className="flex-1 truncate">{nodeLabel(n)}</span>
                <span className="text-[10px] uppercase text-slate-400">{LABEL_TEXT[n.label]}</span>
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
          <div className="card overflow-hidden">
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
                    stroke="#cbd5e1"
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
                    <circle cx={x} cy={y} r={9} fill={COLOR[nb.node.label]} opacity={0.85} />
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
              <circle cx={cx} cy={cy} r={16} fill={COLOR[current.label]} />
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
            <div className="card p-4">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: COLOR[current.label] }} />
                <span className="text-[11px] uppercase tracking-wide text-slate-400">
                  {LABEL_TEXT[current.label]}
                </span>
              </div>
              <h2 className="mt-1 font-serif text-lg font-semibold text-slate-800">
                {nodeLabel(current)}
              </h2>
              <p className="text-xs text-slate-500">{current.degree} connections</p>
              {current.label === 'REMEDY' && (
                <Link
                  to={`/books/boericke?q=${encodeURIComponent(current.name.split(/\s+/)[0])}`}
                  className="mt-2 inline-block text-xs font-medium text-brand-600 hover:underline"
                >
                  Read in reference books →
                </Link>
              )}
            </div>
            <div className="card p-3">
              <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                Connections
              </div>
              <div className="max-h-64 space-y-0.5 overflow-auto">
                {neighbors.map((nb) => (
                  <button
                    key={nb.node.id}
                    onClick={() => setSelectedId(nb.node.id)}
                    className="flex w-full items-center gap-2 rounded px-2 py-1 text-left text-sm hover:bg-slate-50"
                  >
                    <span className="h-2 w-2 rounded-full" style={{ background: COLOR[nb.node.label] }} />
                    <span className="flex-1 truncate text-slate-700">{nodeLabel(nb.node)}</span>
                    {nb.relationship === 'HAS_RUBRIC' && (
                      <span className="text-[10px] text-slate-400">g{nb.weight}</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex flex-wrap gap-3 px-1 text-[11px] text-slate-500">
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
