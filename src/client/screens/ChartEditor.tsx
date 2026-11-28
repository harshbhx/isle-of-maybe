// W7 · Chart editor (CHART-2): the island disappears; only the coastline and dock are printed.
// Stamps from the fixed set, one snapped path, one X. Touch, mouse and keyboard (CHART-2.4).
import { useReducer, useRef, useState, type PointerEvent } from 'react';
import type { ChartSubmitResponse } from '../../shared/api.ts';
import { MAX_SEGMENTS, MAX_STAMPS } from '../../shared/chart.ts';
import { LANDMARK_GLYPHS, X_GLYPH } from '../../shared/glyphs.ts';
import {
  LANDMARK_TYPES,
  type Depth,
  type LandmarkType,
  type Tile,
} from '../../shared/types.ts';
import { useApp } from '../app-context.ts';
import { ChartView } from '../components/ChartView.tsx';
import { Glyph } from '../components/Glyph.tsx';
import { Hint } from '../components/Hint.tsx';
import { Banner, Button, Title } from '../components/ui.tsx';
import { copy, fmt } from '../copy.ts';
import { useKeys } from '../island/input.ts';
import { ApiFailure, post } from '../lib/api.ts';
import * as ed from '../lib/editor.ts';
import { px } from '../lib/geom.ts';
import { InkCheck } from './InkCheck.tsx';

type Action =
  | { k: 'place'; tool: ed.Tool; at: Tile }
  | { k: 'select'; sel: ed.Sel }
  | { k: 'move'; to: Tile; record: boolean }
  | { k: 'remove' }
  | { k: 'undo' }
  | { k: 'clear' }
  | { k: 'cycle'; dir: 1 | -1 };

const reduce = (s: ed.EditorState, a: Action): ed.EditorState => {
  switch (a.k) {
    case 'place':
      return ed.place(s, a.tool, a.at);
    case 'select':
      return { ...s, sel: a.sel };
    case 'move':
      return ed.moveSel(s, a.to, a.record);
    case 'remove':
      return ed.removeSel(s);
    case 'undo':
      return ed.undo(s);
    case 'clear':
      return ed.clear(s);
    case 'cycle':
      return ed.cycle(s, a.dir);
  }
};

const selTile = (s: ed.EditorState): Tile | null => {
  if (s.sel === null) return null;
  const p = s.pieces[s.sel.piece];
  if (p === undefined) return null;
  if (p.k === 'path') return p.pts[s.sel.point ?? 0] ?? null;
  return { x: p.x, y: p.y };
};

export const ChartEditor = ({ at, depth }: { at: Tile; depth: Depth }) => {
  const app = useApp();
  const { island } = app;
  const [s, dispatch] = useReducer(reduce, undefined, ed.emptyEditor);
  const [tool, setTool] = useState<ed.Tool>({ k: 'stamp', t: 'palm' });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [result, setResult] = useState<ChartSubmitResponse | null>(null);
  const svg = useRef<SVGSVGElement | null>(null);
  const drag = useRef<{ moved: boolean } | null>(null);
  const c = ed.counts(s.pieces);

  const toTile = (e: PointerEvent<SVGSVGElement>): Tile => {
    const r = e.currentTarget.getBoundingClientRect();
    return {
      x: Math.min(
        39,
        Math.max(0, Math.floor(((e.clientX - r.left) / r.width) * 40))
      ),
      y: Math.min(
        39,
        Math.max(0, Math.floor(((e.clientY - r.top) / r.height) * 40))
      ),
    };
  };
  const onDown = (e: PointerEvent<SVGSVGElement>): void => {
    const t = toTile(e);
    const hitSel = ed.hit(s.pieces, t);
    if (hitSel !== null) {
      dispatch({ k: 'select', sel: hitSel });
      drag.current = { moved: false };
      e.currentTarget.setPointerCapture(e.pointerId);
      return;
    }
    dispatch({ k: 'place', tool, at: t });
  };
  const onMove = (e: PointerEvent<SVGSVGElement>): void => {
    if (drag.current === null) return;
    const t = toTile(e);
    const cur = selTile(s);
    if (cur !== null && cur.x === t.x && cur.y === t.y) return;
    dispatch({ k: 'move', to: t, record: !drag.current.moved });
    drag.current.moved = true;
  };
  const onUp = (): void => {
    drag.current = null;
  };

  const submit = async (): Promise<void> => {
    if (!c.hasX || busy) return;
    setBusy(true);
    setErr(null);
    try {
      const r = await post<ChartSubmitResponse>('/chart', {
        pieces: ed.submittable(s.pieces),
      });
      app.setMyChest({ depth, grade: r.ink.grade });
      void app.refresh();
      setResult(r);
    } catch (e) {
      setBusy(false);
      setErr(
        e instanceof ApiFailure && e.code === 'quota'
          ? copy.err.quota
          : e instanceof ApiFailure && e.code === 'network'
            ? copy.err.network
            : copy.err.generic
      );
    }
  };

  const nudge = (dx: number, dy: number): void => {
    const cur = selTile(s);
    if (cur !== null)
      dispatch({
        k: 'move',
        to: { x: cur.x + dx, y: cur.y + dy },
        record: true,
      });
  };
  useKeys(
    {
      Tab: () => dispatch({ k: 'cycle', dir: 1 }),
      ArrowUp: () => nudge(0, -1),
      ArrowDown: () => nudge(0, 1),
      ArrowLeft: () => nudge(-1, 0),
      ArrowRight: () => nudge(1, 0),
      Delete: () => dispatch({ k: 'remove' }),
      Backspace: () => dispatch({ k: 'remove' }),
      u: () => dispatch({ k: 'undo' }),
      z: () => dispatch({ k: 'undo' }),
      s: () =>
        setTool((t) => (t.k === 'stamp' ? t : { k: 'stamp', t: 'palm' })),
      p: () => setTool({ k: 'path' }),
      x: () => setTool({ k: 'x' }),
      Enter: () => {
        // Place the current tool at the selection, or the island centre, for keyboard-only charting.
        dispatch({ k: 'place', tool, at: selTile(s) ?? { x: 20, y: 20 } });
      },
    },
    result === null
  );

  if (result !== null)
    return <InkCheck pieces={s.pieces} chest={at} result={result} />;

  const sel = selTile(s);
  const stampFull = c.stamps >= MAX_STAMPS;
  return (
    <div className="mx-auto flex w-full max-w-[560px] flex-col gap-2 p-3 anim-fade">
      <div className="flex items-center gap-2">
        <Title className="text-on-night">{copy.chart.title}</Title>
        <div className="ml-auto flex gap-1">
          <Button
            kind="ink"
            className="border-muted-night/50 px-3 text-on-night"
            onClick={() => dispatch({ k: 'undo' })}
            disabled={s.history.length === 0}
          >
            {copy.chart.undo}
          </Button>
          <Button
            kind="ink"
            className="border-muted-night/50 px-3 text-on-night"
            onClick={() => dispatch({ k: 'clear' })}
            disabled={s.pieces.length === 0}
          >
            {copy.chart.clear}
          </Button>
        </div>
      </div>
      <Hint k="chart" />
      <div className="parchment p-1.5">
        <ChartView
          island={island}
          pieces={s.pieces}
          depth={depth}
          label={copy.chart.title}
          svgProps={{
            ref: svg,
            onPointerDown: onDown,
            onPointerMove: onMove,
            onPointerUp: onUp,
            onPointerCancel: onUp,
            style: { touchAction: 'none', cursor: 'crosshair' },
          }}
        >
          {sel !== null && (
            <circle
              cx={px(sel.x)}
              cy={px(sel.y)}
              r={15}
              fill="none"
              stroke="#E8B341"
              strokeWidth={3}
              strokeDasharray="5 3"
            />
          )}
        </ChartView>
      </div>
      <p
        className="tabular text-center text-sm text-muted-night"
        aria-live="polite"
      >
        {fmt(copy.chart.budget, { s: c.stamps, p: c.steps })}
      </p>
      <div
        role="toolbar"
        aria-label={copy.chart.stamps}
        className="grid grid-cols-5 gap-1.5 sm:grid-cols-10"
      >
        {LANDMARK_TYPES.map((t: LandmarkType) => (
          <button
            key={t}
            type="button"
            aria-label={copy.landmark[t]}
            aria-pressed={tool.k === 'stamp' && tool.t === t}
            disabled={stampFull}
            onClick={() => setTool({ k: 'stamp', t })}
            className={`parchment flex h-12 items-center justify-center disabled:opacity-40 ${tool.k === 'stamp' && tool.t === t ? 'outline outline-3 outline-gold' : ''}`}
          >
            <Glyph glyph={LANDMARK_GLYPHS[t]} size={28} color="#2B2118" />
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <Button
          kind="ink"
          className="border-muted-night/50 text-on-night"
          pressed={tool.k === 'path'}
          onClick={() => setTool({ k: 'path' })}
          disabled={c.steps >= MAX_SEGMENTS && tool.k !== 'path'}
        >
          <svg width="22" height="12" aria-hidden>
            <path
              d="M2 6h18"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeDasharray="3 3"
              strokeLinecap="round"
            />
          </svg>
          {copy.chart.path}
        </Button>
        <Button
          kind="ink"
          className="border-muted-night/50 text-on-night"
          pressed={tool.k === 'x'}
          onClick={() => setTool({ k: 'x' })}
        >
          <Glyph glyph={X_GLYPH} size={20} color="#e7a29b" /> {copy.chart.x}
        </Button>
        {s.sel !== null && (
          <Button
            kind="quiet"
            className="text-on-night"
            onClick={() => dispatch({ k: 'remove' })}
          >
            {copy.chart.remove}
          </Button>
        )}
      </div>
      <Button
        kind="gold"
        className="w-full"
        disabled={!c.hasX || busy}
        onClick={() => void submit()}
      >
        {copy.chart.submit}
      </Button>
      {!c.hasX && (
        <p className="text-center text-sm text-muted-night">
          {copy.chart.needX}
        </p>
      )}
      {err !== null && <Banner>{err}</Banner>}
    </div>
  );
};
