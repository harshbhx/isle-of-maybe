// W4 · Hunt (HUNT-2 – HUNT-4 client side): walk with a route preview, open the chart any time, dig
// where you stand. Steps go to the server in batches; the server decides every dig.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  ChartPublic,
  DigResponse,
  HuntStartResponse,
  PickSlot,
  Reveal,
  StepsResponse,
} from '../../shared/api.ts';
import { revealRadius } from '../../shared/day.ts';
import {
  PACE_SLACK_SECONDS,
  hazardsFor,
  stepSeconds,
} from '../../shared/hazards.ts';
import { walkable } from '../../shared/path.ts';
import {
  HUNT_SECONDS,
  TIDE_WAVES,
  coastDistance,
  flooded,
  tideLevel,
} from '../../shared/tide.ts';
import { W as GRID_W } from '../../shared/types.ts';
import type { Tile } from '../../shared/types.ts';
import { Joystick } from '../components/Joystick.tsx';
import type { Island3D } from '../island/three/island3d.ts';
import { useApp } from '../app-context.ts';
import { ChartView } from '../components/ChartView.tsx';
import { Hint } from '../components/Hint.tsx';
import { Button, Sheet, ShovelIcon, SrTitle } from '../components/ui.tsx';
import { copy, fmt } from '../copy.ts';
import { IslandCanvas } from '../island/IslandCanvas.tsx';
import type { Footprint } from '../island/draw.ts';
import { useKeys, useRoute } from '../island/input.ts';
import { reducedMotion, useWalker } from '../island/walker.ts';
import { ApiFailure, post } from '../lib/api.ts';
import { emptyMask, reveal } from '../lib/fog.ts';
import { markHintSeen } from '../lib/hints.ts';
import { toast } from '../lib/platform.ts';
import { play } from '../lib/sound.ts';

type Props = { start: HuntStartResponse; chart: ChartPublic; slot: PickSlot };

const clock = (s: number): string =>
  `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

export const Hunt = ({ start, chart }: Props) => {
  const app = useApp();
  const { island } = app;
  const r = revealRadius(island.modifier);
  const [at, setAt] = useState<Tile>(start.at);
  const [seen, setSeen] = useState(() => reveal(emptyMask(), [start.at], r));
  const [prints, setPrints] = useState<Footprint[]>([]);
  const [holes, setHoles] = useState<Tile[]>([]);
  const [shovels, setShovels] = useState(start.shovels);
  const [steps, setSteps] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [chartOpen, setChartOpen] = useState(false);
  const [confirmQuit, setConfirmQuit] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [walked, setWalked] = useState(false);
  const [puffs, setPuffs] = useState<{ at: Tile; t: number }[]>([]);
  const walker = useWalker(start.at);
  // The 3D renderer, once running: the explorer then moves freely (ADV-3).
  const [h3d, setH3d] = useState<Island3D | null>(null);
  const coast = useMemo(() => coastDistance(island), [island]);
  const tideRef = useRef(0);
  const [left, setLeft] = useState(HUNT_SECONDS);
  const coarse = useMemo(
    () => window.matchMedia?.('(pointer: coarse)').matches ?? false,
    []
  );

  // Steps the server hasn't confirmed yet, flushed in order.
  const pending = useRef<Tile[]>([]);
  const index = useRef(0);
  const flushing = useRef<Promise<void>>(Promise.resolve());
  const hz = useMemo(() => hazardsFor(island), [island]);
  // The client's clock starts a moment after the server's, so pacing by it never runs ahead of
  // the server's check (ADV-2.3). `sentT` is the summed minimum time of the confirmed steps.
  const born = useRef(0);
  useEffect(() => {
    born.current = performance.now();
  }, []);
  const sentT = useRef(0);
  const ended = useRef<((rev: Reveal) => void) | null>(null);
  const flush = useCallback((): Promise<void> => {
    flushing.current = flushing.current.then(async () => {
      if (pending.current.length === 0) return;
      const elapsed = (performance.now() - born.current) / 1000;
      let t = sentT.current;
      let n = 0;
      for (const s of pending.current.slice(0, 200)) {
        const c = stepSeconds(hz, s);
        if (t + c > elapsed + PACE_SLACK_SECONDS / 2) break;
        t += c;
        n++;
      }
      if (n === 0) return;
      const batch = pending.current.slice(0, n);
      const res = await post<StepsResponse>('/hunt/steps', {
        huntId: start.huntId,
        from: index.current,
        steps: batch,
      });
      if (res.reveal !== undefined) {
        pending.current = [];
        ended.current?.(res.reveal);
        return;
      }
      index.current = res.index;
      sentT.current = t;
      pending.current = pending.current.slice(batch.length);
    });
    return flushing.current;
  }, [start.huntId, hz]);
  /** Flush everything, waiting for the pace to allow it (before a dig or giving up). */
  const flushAll = useCallback(async (): Promise<void> => {
    for (let i = 0; i < 40 && pending.current.length > 0; i++) {
      await flush();
      if (pending.current.length > 0)
        await new Promise((ok) => window.setTimeout(ok, 250));
    }
  }, [flush]);
  useEffect(() => {
    const id = window.setInterval(() => {
      if (pending.current.length > 0)
        flush().catch(() => setError(copy.err.network));
    }, 800);
    return () => window.clearInterval(id);
  }, [flush]);

  const onStep = useCallback(
    (t: Tile) => {
      pending.current.push(t);
      setSteps((n) => n + 1);
      setSeen((m) => reveal(m, [t], r));
      setPrints((p) => [...p.slice(-120), { ...t, t: performance.now() }]);
      setAt(t);
    },
    [r]
  );
  const onStepRef = useRef(onStep);
  useEffect(() => {
    onStepRef.current = onStep;
  });
  const go = useCallback(
    (route: Tile[]) => {
      if (!walked) markHintSeen('hunt');
      setWalked(true);
      void walker.walk(route, at, onStep);
    },
    [walker, at, walked, onStep]
  );
  const input = useRoute(island.terrain, at, walker.busy || busy, go);

  // Free movement in 3D: the renderer walks the explorer and hands us each tile step.
  const walkedRef = useRef(false);
  useEffect(() => {
    if (h3d === null) return;
    h3d.drive({
      start: at,
      blocked: (x, y) =>
        !walkable(island.terrain, x, y) ||
        flooded(coast, { x, y }, tideRef.current),
      ground: (x, y) => {
        const i = y * GRID_W + x;
        return hz.quicksand.has(i)
          ? 'quicksand'
          : hz.thicket.has(i)
            ? 'thicket'
            : 'open';
      },
      onStep: (t) => {
        if (!walkedRef.current) {
          walkedRef.current = true;
          markHintSeen('roam');
          setWalked(true);
        }
        onStepRef.current(t);
      },
    });
    return () => h3d.drive(null);
    // Driving starts once per renderer; `at` is only its starting tile.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [h3d]);

  // Keys in 3D: hold to move, Shift to run.
  useEffect(() => {
    if (h3d === null) return;
    const down = new Set<string>();
    const push = (): void => {
      const x =
        (down.has('arrowright') || down.has('d') ? 1 : 0) -
        (down.has('arrowleft') || down.has('a') ? 1 : 0);
      const y =
        (down.has('arrowdown') || down.has('s') ? 1 : 0) -
        (down.has('arrowup') || down.has('w') ? 1 : 0);
      const len = Math.hypot(x, y) || 1;
      h3d.input(x / len, y / len, down.has('shift'));
    };
    const keys = [
      'arrowup',
      'arrowdown',
      'arrowleft',
      'arrowright',
      'w',
      'a',
      's',
      'd',
      'shift',
    ];
    const on = (e: KeyboardEvent): void => {
      const k = e.key.toLowerCase();
      if (!keys.includes(k)) return;
      if (
        e.target instanceof HTMLElement &&
        /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)
      )
        return;
      e.preventDefault();
      if (e.type === 'keydown') down.add(k);
      else down.delete(k);
      push();
    };
    window.addEventListener('keydown', on);
    window.addEventListener('keyup', on);
    return () => {
      window.removeEventListener('keydown', on);
      window.removeEventListener('keyup', on);
    };
  }, [h3d]);

  // The tide (ADV-1, ADV-4.2): each wave takes 3 s to roll in; the server ends the hunt at 150 s.
  const outOfTime = useRef(false);
  const endByTide = useRef<() => Promise<void>>(async () => undefined);
  useEffect(() => {
    const id = window.setInterval(() => {
      if (born.current === 0) return;
      const el = (performance.now() - born.current) / 1000;
      tideRef.current = tideLevel(el);
      let smooth = 0;
      for (const [f] of TIDE_WAVES)
        smooth += Math.max(0, Math.min(1, (el - f * HUNT_SECONDS) / 3));
      h3d?.setTide(smooth);
      setLeft(Math.max(0, HUNT_SECONDS - el));
      if (el >= HUNT_SECONDS && !outOfTime.current) {
        outOfTime.current = true;
        void endByTide.current();
      }
    }, 200);
    return () => window.clearInterval(id);
  }, [h3d]);

  const finish = (rev: Reveal, finalHoles: Tile[]): void => {
    app.setLastHunt({ chart, reveal: rev });
    app.announce(
      rev.found
        ? fmt(chart.captain ? copy.reveal.foundCaptain : copy.reveal.found, {
            name: chart.author,
          })
        : fmt(copy.reveal.missed, { d: rev.distance ?? 0 })
    );
    void app.refresh();
    app.go({ k: 'reveal', chart, reveal: rev, holes: finalHoles });
  };
  useEffect(() => {
    ended.current = (rev) => finish(rev, holes);
  });

  const dig = async (): Promise<void> => {
    if (busy || walker.busy || shovels <= 0) return;
    setBusy(true);
    setError(null);
    try {
      await flushAll();
      if (tideRef.current > 0 && flooded(coast, at, tideRef.current)) {
        setBusy(false);
        toast(copy.hunt.tideCovered);
        return;
      }
      play('dig');
      h3d?.pose('dig');
      await new Promise((ok) =>
        window.setTimeout(ok, reducedMotion() ? 0 : 1100)
      );
      h3d?.pose(null);
      if (!reducedMotion())
        setPuffs((p) => [...p.slice(-3), { at, t: performance.now() }]);
      const res = await post<DigResponse>('/hunt/dig', {
        huntId: start.huntId,
        at,
      });
      const nextHoles = [...holes, at];
      setHoles(nextHoles);
      setShovels(res.shovelsLeft);
      if (res.done && res.reveal !== undefined)
        return finish(res.reveal, nextHoles);
      const line =
        shovels === start.shovels ? copy.hunt.miss1 : copy.hunt.miss2;
      toast(line);
      app.announce(`${line} ${fmt(copy.hunt.shovels, { n: res.shovelsLeft })}`);
      setBusy(false);
    } catch (e) {
      setBusy(false);
      setError(
        e instanceof ApiFailure && e.code === 'quota'
          ? copy.err.quota
          : copy.err.network
      );
    }
  };

  const giveUp = async (): Promise<void> => {
    setConfirmQuit(false);
    setBusy(true);
    try {
      await flushAll().catch(() => undefined);
      const res = await post<{ reveal: Reveal }>('/hunt/giveup', {
        huntId: start.huntId,
      });
      finish(res.reveal, holes);
    } catch {
      setBusy(false);
      setError(copy.err.network);
    }
  };

  useEffect(() => {
    endByTide.current = giveUp;
  });

  const report = async (): Promise<void> => {
    try {
      await post('/chart/report', { chartId: chart.id });
    } catch {
      // Reporting answers the same either way; nothing to retry.
    }
    toast(copy.err.reported);
    app.announce(copy.err.reported);
  };

  useKeys({
    ArrowUp: () => h3d === null && input.step(0, -1),
    ArrowDown: () => h3d === null && input.step(0, 1),
    ArrowLeft: () => h3d === null && input.step(-1, 0),
    ArrowRight: () => h3d === null && input.step(1, 0),
    w: () => h3d === null && input.step(0, -1),
    s: () => h3d === null && input.step(0, 1),
    a: () => h3d === null && input.step(-1, 0),
    d: () => h3d === null && input.step(1, 0),
    Enter: () => void input.confirm(),
    ' ': () => void dig(),
    m: () => setChartOpen((o) => !o),
    Escape: () => setChartOpen(false),
    '+': () => setZoom((z) => Math.min(2, z + 0.5)),
    '-': () => setZoom((z) => Math.max(0, z - 0.5)),
  });

  const scene = useMemo(
    () => ({
      island,
      seen,
      sailor: walker.pos,
      footprints: prints,
      holes,
      route: input.route,
      markers: [],
      link: false,
      highlight: null,
      puffs,
    }),
    [island, seen, walker.pos, prints, holes, input.route, puffs]
  );
  const by = chart.captain
    ? copy.common.captainBy
    : fmt(copy.common.by, { name: chart.author });

  const chartInfo = (
    <div className="flex items-center justify-between gap-2 px-1 pt-2">
      <span className="text-sm text-ink-soft">
        {by}
        {chart.note !== null && (
          <em className="block font-display text-[16px] text-ink">
            “{copy.notes[chart.note]}”
          </em>
        )}
      </span>
      {!chart.captain && (
        <Button kind="danger" onClick={() => void report()}>
          {copy.hunt.report}
        </Button>
      )}
    </div>
  );

  return (
    <div className="flex h-full">
      <div className="flex min-w-0 flex-1 flex-col">
        <SrTitle>{island.name}</SrTitle>
        <div className="flex items-center gap-3 px-3 py-1 text-sm">
          <span
            className="inline-flex gap-0.5"
            role="img"
            aria-label={fmt(copy.hunt.shovels, { n: shovels })}
          >
            {Array.from({ length: start.shovels }, (_, i) => (
              <ShovelIcon key={i} used={i >= shovels} />
            ))}
          </span>
          <span className="tabular text-seafoam">
            {fmt(copy.hunt.steps, { n: steps })}
          </span>
          <span
            className={`ml-auto tabular font-semibold ${left <= 30 ? 'rounded bg-hibiscus px-1.5 text-paper' : 'text-sun'}`}
            role="timer"
            aria-label={fmt(copy.hunt.timeLeft, { t: clock(left) })}
          >
            {clock(left)}
          </span>
          <span aria-live="polite" />
        </div>
        <div className="relative min-h-0 flex-1">
          <IslandCanvas
            scene={scene}
            zoom={zoom}
            focus={walker.pos}
            onTap={(t) =>
              h3d !== null
                ? h3d.goTo(t)
                : walker.busy
                  ? walker.skip()
                  : input.onTap(t)
            }
            onHandle={setH3d}
            label={`${island.name}. ${fmt(copy.hunt.shovels, { n: shovels })}`}
          />
          {h3d !== null && coarse && (
            <Joystick
              label={copy.hunt.stick}
              onMove={(x, y) => h3d.input(x, y, false)}
            />
          )}
          <button
            type="button"
            onClick={() => setChartOpen(true)}
            aria-label={copy.hunt.chartOpen}
            className="parchment absolute right-2 top-2 w-24 p-1 sm:w-32 lg:hidden"
          >
            <ChartView
              island={island}
              pieces={chart.pieces}
              depth={chart.depth}
              captain={chart.captain}
              label={by}
            />
          </button>
          <div className="absolute left-2 right-28 top-2 flex flex-col gap-2 sm:right-36 lg:right-2">
            {/* One hint at a time (UI-4.4): walking retires the walk hint, then digging is next. */}
            {walked ? (
              <Hint k="dig" />
            ) : (
              <Hint k={h3d !== null ? 'roam' : 'hunt'} />
            )}
            {error !== null && (
              <button
                type="button"
                onClick={() =>
                  void flush().then(
                    () => setError(null),
                    () => undefined
                  )
                }
                className="rounded-[6px] bg-lagoon-2 px-3 py-2 text-left text-sm"
                role="alert"
              >
                {error}{' '}
                <span className="text-sun underline">{copy.err.retry}</span>
              </button>
            )}
          </div>
          {chartOpen && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-lagoon/40 p-3 anim-fade lg:hidden">
              <div className="parchment w-full max-w-[460px] p-2 opacity-[0.92]">
                <ChartView
                  island={island}
                  pieces={chart.pieces}
                  depth={chart.depth}
                  captain={chart.captain}
                  label={by}
                />
                {chartInfo}
                <div className="flex justify-end px-1 pt-2">
                  <Button onClick={() => setChartOpen(false)}>
                    {copy.hunt.chartClose}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 px-3 py-3">
          <Button
            kind="quiet"
            className="text-foam"
            onClick={() => setConfirmQuit(true)}
            disabled={busy}
          >
            {copy.hunt.giveup}
          </Button>
          <div className="ml-auto flex gap-1">
            <Button
              kind="ink"
              className="w-12 border-seafoam/50 px-0 text-foam"
              label={copy.hunt.zoomOut}
              onClick={() => setZoom((z) => Math.max(0, z - 0.5))}
            >
              −
            </Button>
            <Button
              kind="ink"
              className="w-12 border-seafoam/50 px-0 text-foam"
              label={copy.hunt.zoomIn}
              onClick={() => setZoom((z) => Math.min(2, z + 0.5))}
            >
              +
            </Button>
          </div>
          <Button
            kind="gold"
            className="min-w-28"
            onClick={() => void dig()}
            disabled={busy || walker.busy || shovels <= 0}
          >
            {copy.hunt.dig}
          </Button>
        </div>
      </div>
      {/* Wide screens (UI-3.4): the chart sits beside the island, full size and always open, so
          the player compares map and island at a glance instead of toggling an overlay. */}
      <aside className="hidden w-[min(420px,36vw)] shrink-0 flex-col justify-center p-3 lg:flex">
        <div className="parchment p-2">
          <ChartView
            island={island}
            pieces={chart.pieces}
            depth={chart.depth}
            captain={chart.captain}
            label={by}
          />
          {chartInfo}
        </div>
      </aside>
      <Sheet
        open={confirmQuit}
        onClose={() => setConfirmQuit(false)}
        title={copy.hunt.confirmGiveup}
      >
        <div className="flex justify-end gap-2">
          <Button onClick={() => setConfirmQuit(false)}>
            {copy.common.back}
          </Button>
          <Button kind="gold" onClick={() => void giveUp()}>
            {copy.hunt.giveup}
          </Button>
        </div>
      </Sheet>
    </div>
  );
};
