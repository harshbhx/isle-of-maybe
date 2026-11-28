// The spoiler-free result line for shares and challenges (COM-2.6): day, shovels used, found or
// missed, depth and Ink grade. Never coordinates or landmark positions. Words come from the caller.
import type { Grade } from './chart.ts';
import type { Depth } from './types.ts';

export type ResultParts = {
  dayNumber: number;
  hunt: { found: boolean; shovelsUsed: number } | null;
  chest: { depth: Depth; grade: Grade | null } | null;
};

export type ResultWords = {
  day: string;
  found: string;
  missed: string;
  chest: string;
  grade: string;
  depth: Record<Depth, string>;
  ink: Record<Grade, string>;
};

const fill = (t: string, v: Record<string, string | number>): string =>
  t.replace(/\{(\w+)\}/g, (m, k: string) => (k in v ? String(v[k]) : m));

export const resultLine = (p: ResultParts, w: ResultWords): string => {
  const parts = [fill(w.day, { n: p.dayNumber })];
  if (p.hunt !== null)
    parts.push(
      fill(p.hunt.found ? w.found : w.missed, { n: p.hunt.shovelsUsed })
    );
  if (p.chest !== null) {
    parts.push(fill(w.chest, { depth: w.depth[p.chest.depth] }));
    if (p.chest.grade !== null)
      parts.push(fill(w.grade, { grade: w.ink[p.chest.grade] }));
  }
  return parts.join(' · ');
};
