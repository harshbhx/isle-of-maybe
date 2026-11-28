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
import type { Tile } from '../../shared/types.ts';
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
import { toast } from '../lib/platform.ts';
import { play } from '../lib/sound.ts';

type Props = { start: HuntStartResponse; chart: ChartPublic; slot: PickSlot };

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

  // Steps the server hasn't confirmed yet, flushed in order.
  const pending = useRef<Tile[]>([]);
  const index = useRef(0);
  const flushing = useRef<Promise<void>>(Promise.resolve());
  const flush = useCallback((): Promise<void> => {
    flushing.current = flushing.current.then(async () => {
      if (pending.current.length === 0) return;
      const batch = pending.current.slice(0, 200);
      const res = await post<StepsResponse>('/hunt/steps', {
        huntId: start.huntId,
        from: index.current,
        steps: batch,
      });
      index.current = res.index;
      pending.current = pending.current.slice(batch.length);
    });
    return flushing.current;
  }, [start.huntId]);
  useEffect(() => {
    const id = window.setInterval(() => {
      if (pending.current.length > 0)
        flush().catch(() => setError(copy.err.network));
    }, 800);
    return () => window.clearInterval(id);
  }, [flush]);

  const go = useCallback(
    (route: Tile[]) => {
      setWalked(true);
      void walker.walk(route, at, (t) => {
        pending.current.push(t);
        setSteps((n) => n + 1);
        setSeen((m) => reveal(m, [t], r));
        setPrints((p) => [...p.slice(-120), { ...t, t: performance.now() }]);
        setAt(t);
      });
    },
    [walker, at, r]
  );
  const input = useRoute(island.terrain, at, walker.busy || busy, go);

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

  const dig = async (): Promise<void> => {
    if (busy || walker.busy || shovels <= 0) return;
    setBusy(true);
    setError(null);
    try {
      await flush();
      play('dig');
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
      await flush().catch(() => undefined);
      const res = await post<{ reveal: Reveal }>('/hunt/giveup', {
        huntId: start.huntId,
      });
      finish(res.reveal, holes);
    } catch {
      setBusy(false);
      setError(copy.err.network);
    }
  };

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
    ArrowUp: () => input.step(0, -1),
    ArrowDown: () => input.step(0, 1),
    ArrowLeft: () => input.step(-1, 0),
    ArrowRight: () => input.step(1, 0),
    w: () => input.step(0, -1),
    s: () => input.step(0, 1),
    a: () => input.step(-1, 0),
    d: () => input.step(1, 0),
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

  return (
    <div className="flex h-full flex-col">
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
        <span className="tabular text-muted-night">
          {fmt(copy.hunt.steps, { n: steps })}
        </span>
        <span className="ml-auto" aria-live="polite" />
      </div>
      <div className="relative min-h-0 flex-1">
        <IslandCanvas
          scene={scene}
          zoom={zoom}
          focus={walker.pos}
          onTap={(t) => (walker.busy ? walker.skip() : input.onTap(t))}
          label={`${island.name}. ${fmt(copy.hunt.shovels, { n: shovels })}`}
        />
        <button
          type="button"
          onClick={() => setChartOpen(true)}
          aria-label={copy.hunt.chartOpen}
          className="parchment absolute right-2 top-2 w-24 p-1 sm:w-32"
        >
          <ChartView
            island={island}
            pieces={chart.pieces}
            depth={chart.depth}
            captain={chart.captain}
            label={by}
          />
        </button>
        <div className="absolute left-2 right-28 top-2 flex flex-col gap-2 sm:right-36">
          <Hint k="hunt" />
          {walked && <Hint k="dig" />}
          {error !== null && (
            <button
              type="button"
              onClick={() =>
                void flush().then(
                  () => setError(null),
                  () => undefined
                )
              }
              className="rounded-[6px] bg-night-2 px-3 py-2 text-left text-sm"
              role="alert"
            >
              {error}{' '}
              <span className="text-gold underline">{copy.err.retry}</span>
            </button>
          )}
        </div>
        {chartOpen && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-night/40 p-3 anim-fade">
            <div className="parchment w-full max-w-[460px] p-2 opacity-[0.92]">
              <ChartView
                island={island}
                pieces={chart.pieces}
                depth={chart.depth}
                captain={chart.captain}
                label={by}
              />
              <div className="flex items-center justify-between gap-2 px-1 pt-2">
                <span className="text-sm text-ink-soft">
                  {by}
                  {chart.note !== null && (
                    <em className="block font-display text-[16px] text-ink">
                      “{copy.notes[chart.note]}”
                    </em>
                  )}
                </span>
                <div className="flex gap-2">
                  {!chart.captain && (
                    <Button kind="danger" onClick={() => void report()}>
                      {copy.hunt.report}
                    </Button>
                  )}
                  <Button onClick={() => setChartOpen(false)}>
                    {copy.hunt.chartClose}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      <div className="flex items-center gap-2 px-3 py-3">
        <Button
          kind="quiet"
          className="text-on-night"
          onClick={() => setConfirmQuit(true)}
          disabled={busy}
        >
          {copy.hunt.giveup}
        </Button>
        <div className="ml-auto flex gap-1">
          <Button
            kind="ink"
            className="w-12 border-muted-night/50 px-0 text-on-night"
            label={copy.hunt.zoomOut}
            onClick={() => setZoom((z) => Math.max(0, z - 0.5))}
          >
            −
          </Button>
          <Button
            kind="ink"
            className="w-12 border-muted-night/50 px-0 text-on-night"
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
