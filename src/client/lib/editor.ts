// Chart editor state (CHART-2): stamps from the fixed set, one snapped path, one X. Every change
// pushes history (undo up to 20). No freehand, no text: positions are whole tiles only.
import { MAX_SEGMENTS, MAX_STAMPS } from '../../shared/chart.ts';
import {
  inBounds,
  type ChartPiece,
  type LandmarkType,
  type Tile,
} from '../../shared/types.ts';

export type Tool = { k: 'stamp'; t: LandmarkType } | { k: 'path' } | { k: 'x' };
/** A selected stamp/X by piece index, or one point of the path. */
export type Sel = { piece: number; point?: number } | null;

export type EditorState = {
  pieces: ChartPiece[];
  sel: Sel;
  history: ChartPiece[][];
};

export const HISTORY = 20;
export const emptyEditor = (): EditorState => ({
  pieces: [],
  sel: null,
  history: [],
});

const push = (s: EditorState, pieces: ChartPiece[], sel: Sel): EditorState => ({
  pieces,
  sel,
  history: [...s.history, s.pieces].slice(-HISTORY),
});

export const counts = (
  pieces: readonly ChartPiece[]
): { stamps: number; steps: number; hasX: boolean } => {
  let stamps = 0;
  let steps = 0;
  let hasX = false;
  for (const p of pieces) {
    if (p.k === 'stamp') stamps++;
    else if (p.k === 'path') steps += Math.max(0, p.pts.length - 1);
    else hasX = true;
  }
  return { stamps, steps, hasX };
};

const same = (a: Tile, b: Tile): boolean => a.x === b.x && a.y === b.y;
const pathIndex = (pieces: readonly ChartPiece[]): number =>
  pieces.findIndex((p) => p.k === 'path');

/** Apply the current tool at a tile. */
export const place = (s: EditorState, tool: Tool, at: Tile): EditorState => {
  if (!inBounds(at.x, at.y)) return s;
  const c = counts(s.pieces);
  if (tool.k === 'stamp') {
    if (c.stamps >= MAX_STAMPS) return s;
    return push(s, [...s.pieces, { k: 'stamp', t: tool.t, x: at.x, y: at.y }], {
      piece: s.pieces.length,
    });
  }
  if (tool.k === 'x') {
    const i = s.pieces.findIndex((p) => p.k === 'x');
    const x: ChartPiece = { k: 'x', x: at.x, y: at.y };
    if (i < 0) return push(s, [...s.pieces, x], { piece: s.pieces.length });
    return push(
      s,
      s.pieces.map((p, j) => (j === i ? x : p)),
      { piece: i }
    );
  }
  const i = pathIndex(s.pieces);
  if (i < 0)
    return push(s, [...s.pieces, { k: 'path', pts: [at] }], {
      piece: s.pieces.length,
      point: 0,
    });
  const path = s.pieces[i];
  if (path === undefined || path.k !== 'path') return s;
  const last = path.pts[path.pts.length - 1];
  if (
    path.pts.length >= MAX_SEGMENTS + 1 ||
    (last !== undefined && same(last, at))
  )
    return s;
  const pts = [...path.pts, at];
  return push(
    s,
    s.pieces.map((p, j) => (j === i ? { k: 'path', pts } : p)),
    { piece: i, point: pts.length - 1 }
  );
};

/** The piece (or path point) nearest to a tile, within 1.5 tiles. */
export const hit = (pieces: readonly ChartPiece[], at: Tile): Sel => {
  let best: Sel = null;
  let bestD = 2.25;
  pieces.forEach((p, i) => {
    const pts = p.k === 'path' ? p.pts : [p];
    pts.forEach((t, j) => {
      const d = (t.x - at.x) ** 2 + (t.y - at.y) ** 2;
      // Stamps and the X win ties over path points: they're what people aim at.
      if (d < bestD || (d === bestD && p.k !== 'path')) {
        bestD = d;
        best = p.k === 'path' ? { piece: i, point: j } : { piece: i };
      }
    });
  });
  return best;
};

export const moveSel = (
  s: EditorState,
  to: Tile,
  record = true
): EditorState => {
  if (s.sel === null || !inBounds(to.x, to.y)) return s;
  const { piece, point } = s.sel;
  const pieces = s.pieces.map((p, i): ChartPiece => {
    if (i !== piece) return p;
    if (p.k === 'path' && point !== undefined)
      return { k: 'path', pts: p.pts.map((t, j) => (j === point ? to : t)) };
    if (p.k === 'stamp') return { ...p, x: to.x, y: to.y };
    if (p.k === 'x') return { k: 'x', x: to.x, y: to.y };
    return p;
  });
  return record ? push(s, pieces, s.sel) : { ...s, pieces };
};

export const removeSel = (s: EditorState): EditorState => {
  if (s.sel === null) return s;
  const { piece, point } = s.sel;
  const target = s.pieces[piece];
  if (target?.k === 'path' && point !== undefined && target.pts.length > 1) {
    const pts = target.pts.filter((_, j) => j !== point);
    return push(
      s,
      s.pieces.map((p, i) => (i === piece ? { k: 'path', pts } : p)),
      null
    );
  }
  return push(
    s,
    s.pieces.filter((_, i) => i !== piece),
    null
  );
};

export const undo = (s: EditorState): EditorState => {
  const prev = s.history[s.history.length - 1];
  return prev === undefined
    ? s
    : { pieces: prev, sel: null, history: s.history.slice(0, -1) };
};

export const clear = (s: EditorState): EditorState =>
  s.pieces.length === 0 ? s : push(s, [], null);

/** Tab order: every stamp, the X, then each path point. */
export const cycle = (s: EditorState, dir: 1 | -1): EditorState => {
  const all: NonNullable<Sel>[] = [];
  s.pieces.forEach((p, i) =>
    p.k === 'path'
      ? p.pts.forEach((_, j) => all.push({ piece: i, point: j }))
      : all.push({ piece: i })
  );
  if (all.length === 0) return s;
  const cur = all.findIndex(
    (a) => s.sel !== null && a.piece === s.sel.piece && a.point === s.sel.point
  );
  const next = all[(cur + dir + all.length) % all.length] ?? null;
  return { ...s, sel: next };
};

/** What gets submitted: a one-point path is dropped (a path needs two points). */
export const submittable = (pieces: readonly ChartPiece[]): ChartPiece[] =>
  pieces.filter((p) => p.k !== 'path' || p.pts.length >= 2);
