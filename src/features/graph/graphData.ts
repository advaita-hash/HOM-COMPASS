import { useQuery } from '@tanstack/react-query';
import type { Repertory } from '../repertory/types';

export type NodeLabel = 'REMEDY' | 'RUBRIC' | 'CHAPTER';

export interface GNode {
  id: string;
  label: NodeLabel;
  name: string;
  degree: number;
}

export interface GEdge {
  source: string;
  target: string;
  relationship: 'HAS_RUBRIC' | 'BELONGS_TO_CHAPTER';
  weight: number;
}

export interface Graph {
  nodes: Map<string, GNode>;
  neighbors: Map<string, { node: GNode; relationship: string; weight: number }[]>;
}

function build(rep: Repertory): Graph {
  const nodes = new Map<string, GNode>();
  const adj = new Map<string, { node: GNode; relationship: string; weight: number }[]>();

  const ensure = (id: string, label: NodeLabel, name: string) => {
    let n = nodes.get(id);
    if (!n) {
      n = { id, label, name, degree: 0 };
      nodes.set(id, n);
      adj.set(id, []);
    }
    return n;
  };
  const link = (a: GNode, b: GNode, rel: GEdge['relationship'], w: number) => {
    adj.get(a.id)!.push({ node: b, relationship: rel, weight: w });
    adj.get(b.id)!.push({ node: a, relationship: rel, weight: w });
    a.degree += 1;
    b.degree += 1;
  };

  for (const r of rep.rubrics) {
    const rub = ensure(`rub:${r.id}`, 'RUBRIC', r.rubric);
    const chap = ensure(`chap:${r.chapter}`, 'CHAPTER', r.chapter);
    link(rub, chap, 'BELONGS_TO_CHAPTER', 1);
    for (const rem of r.remedies) {
      const remedy = ensure(`rem:${rem.name}`, 'REMEDY', rem.name);
      link(remedy, rub, 'HAS_RUBRIC', rem.grade);
    }
  }

  // sort each node's neighbours by weight desc for nicer radial layouts
  for (const list of adj.values()) list.sort((a, b) => b.weight - a.weight);
  return { nodes, neighbors: adj };
}

async function fetchGraph(): Promise<Graph> {
  const res = await fetch(`${import.meta.env.BASE_URL}repertory/seed.json`);
  if (!res.ok) throw new Error('Could not load graph data');
  return build(await res.json());
}

export function useGraph() {
  return useQuery({ queryKey: ['graph'], queryFn: fetchGraph, staleTime: Infinity });
}
