// Practice Cove (UI-9.1, ADV-9.1): a fixed island and a perfect Old Captain chart, played entirely in
// the browser. In 3D a coach walks you through five steps (move, run, read the chart, the tide, dig)
// and the find plays the real chest cinematic. Skippable at any step; remembered (UI-9.2).
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { revealRadius } from '../../shared/day.ts';
import { generateIsland } from '../../shared/island.ts';
import { aStar, digFinds, walkable } from '../../shared/path.ts';
import {
  W,
  type ChartPiece,
  type Island,
  type Tile,
} from '../../shared/types.ts';
import { useApp } from '../app-context.ts';
import { ChartView } from '../components/ChartView.tsx';
import { Coach } from '../components/Coach.tsx';
import { Joystick } from '../components/Joystick.tsx';
import type { Island3D } from '../island/three/island3d.ts';
import { reducedMotion } from '../island/walker.ts';
import { Button, Card, ShovelIcon, Title } from '../components/ui.tsx';
import { copy } from '../copy.ts';
import { coastDistance, flooded } from '../../shared/tide.ts';
import { hazardsFor } from '../../shared/hazards.ts';
import type { Footprint, Marker } from '../island/draw.ts';
import { useDriveKeys, useKeys, useRoute } from '../island/input.ts';
import { IslandCanvas } from '../island/IslandCanvas.tsx';
import { useWalker } from '../island/walker.ts';
import { post } from '../lib/api.ts';
import { emptyMask, reveal } from '../lib/fog.ts';

export const PRACTICE_SEED = 'practice-cove';

/** A chest 6–9 steps from the dock and a chart that is exactly right. */
const cove = (): { island: Island; chest: Tile; pieces: ChartPiece[] } => {
  const island = generateIsland(PRACTICE_SEED, 'clear');
  let chest = island.dock;
  let route: Tile[] = [];
  for (let r = 3; r < 12 && route.length === 0; r++) {
    for (let dy = -r; dy <= 0 && route.length === 0; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        const t = { x: island.dock.x + dx, y: island.dock.y + dy };
        if (!walkable(island.terrain, t.x, t.y)) continue;
        const p = aStar(island.terrain, island.dock, t);
        if (p !== null && p.length >= 7 && p.length <= 10) {
          chest = t;
          route = p;
          break;
        }
      }
    }
  }
  const near = island.landmarks
    .map((l) => ({
      l,
      d: Math.abs(l.at.x - chest.x) + Math.abs(l.at.y - chest.y),
    }))
    .sort((a, b) => a.d - b.d)
    .slice(0, 2);
  const corners = route.filter((_, i) => {
    const a = route[i - 1];
    const b = route[i + 1];
    return a === undefined || b === undefined || (a.x !== b.x && a.y !== b.y);
  });
  return {
    island,
    chest,
    pieces: [
      ...near.map(({ l }): ChartPiece => ({
        k: 'stamp',
        t: l.type,
        x: l.at.x,
        y: l.at.y,
      })),
      { k: 'path', pts: corners.slice(0, 9) },
      { k: 'x', x: chest.x, y: chest.y },
    ],
  };
};

export const Practice = ({ onDone }: { onDone: () => void }) => {
  const app = useApp();
  const { island, chest, pieces } = useMemo(() => cove(), []);
  const r = revealRadius('clear');
  const [stage, setStage] = useState<'offer' | 'play' | 'won'>('offer');
  const [at, setAt] = useState<Tile>(island.dock);
  const [seen, setSeen] = useState(() => reveal(emptyMask(), [island.dock], r));
  const [prints, setPrints] = useState<Footprint[]>([]);
  const [holes, setHoles] = useState<Tile[]>([]);
  const [shovels, setShovels] = useState(3);
  const [walked, setWalked] = useState(false);
  const walker = useWalker(island.dock);
  // 3D coaching (ADV-9.1): the steps wait for the player; steps are counted from the explorer.
  const [h3d, setH3d] = useState<Island3D | null>(null);
  const [coach, setCoach] = useState(0);
  const stepCount = useRef(0);
  const coachRef = useRef(0);
  const advance = useCallback((n: number) => {
    coachRef.current = n;
    setCoach(n);
  }, []);
  const [chartOpen, setChartOpen] = useState(false);
  const stepsAt = useRef(0);
  const viewRef = useRef<HTMLDivElement>(null);
  const coast = useMemo(() => coastDistance(island), [island]);
  const hz = useMemo(() => hazardsFor(island), [island]);
  const tideRef = useRef(0);
  const touch = useMemo(
    () => window.matchMedia?.('(pointer: coarse)').matches ?? false,
    []
  );

  const finish = useCallback(() => {
    void post('/practice/done').catch(() => undefined);
    void app.refresh();
    onDone();
  }, [app, onDone]);

  const go = useCallback(
    (route: Tile[]) => {
      setWalked(true);
      void walker.walk(route, at, (t) => {
        setSeen((m) => reveal(m, [t], r));
        setPrints((p) => [...p.slice(-60), { ...t, t: performance.now() }]);
        setAt(t);
      });
    },
    [walker, at, r]
  );
  useEffect(() => {
    if (h3d === null || stage !== 'play') return;
    h3d.drive({
      start: at,
      blocked: (x, y) =>
        !walkable(island.terrain, x, y) ||
        flooded(coast, { x, y }, tideRef.current),
      ground: (x, y) => {
        const i = y * W + x;
        // No quicksand in practice: the cove teaches moving, not traps.
        return hz.thicket.has(i) ? 'thicket' : 'open';
      },
      onStep: (t) => {
        setWalked(true);
        // Coach steps that finish by doing: walk 3 tiles, then 8 more (running).
        stepCount.current += 1;
        if (coachRef.current === 0 && stepCount.current >= 3) {
          stepsAt.current = stepCount.current;
          advance(1);
        } else if (
          coachRef.current === 1 &&
          stepCount.current - stepsAt.current >= 8
        )
          advance(2);
        setSeen((m) => reveal(m, [t], r));
        setPrints((p) => [...p.slice(-60), { ...t, t: performance.now() }]);
        setAt(t);
      },
    });
    return () => h3d.drive(null);
    // Driving starts once per renderer; `at` is only its starting tile.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [h3d, stage]);
  // The practice tide: a gentle rise over 60 s, never a failure (ADV-9.1).
  useEffect(() => {
    if (h3d === null || stage !== 'play') return;
    const born = performance.now();
    const id = window.setInterval(() => {
      const el = (performance.now() - born) / 1000;
      h3d.setTide(Math.min(1, el / 60));
      tideRef.current = el >= 60 ? 1 : 0;
    }, 250);
    return () => window.clearInterval(id);
  }, [h3d, stage]);

  useDriveKeys(stage === 'play' ? h3d : null);
  const input = useRoute(
    island.terrain,
    at,
    walker.busy || stage !== 'play',
    go
  );
  const [digging, setDigging] = useState(false);
  const dig = async (): Promise<void> => {
    if (walker.busy || digging || stage !== 'play' || shovels <= 0) return;
    if (h3d !== null) {
      setDigging(true);
      h3d.pose('dig');
      await new Promise((ok) =>
        window.setTimeout(ok, reducedMotion() ? 0 : 1100)
      );
      h3d.pose(null);
      setDigging(false);
    }
    setHoles((h) => [...h, at]);
    if (digFinds(at, chest)) {
      if (h3d !== null)
        await h3d.cinematic({
          kind: 'found',
          chest,
          label: copy.hunt.plaqueCaptain,
          stamp: null,
          font: "'Fraunces', Georgia, serif",
        });
      setStage('won');
      app.announce(copy.practice.done);
      return;
    }
    setShovels((n) => (n <= 1 ? 3 : n - 1)); // Practice never ends in failure: shovels refill.
    app.announce(shovels === 3 ? copy.hunt.miss1 : copy.hunt.miss2);
  };
  useKeys(
    {
      ArrowUp: () => h3d === null && input.step(0, -1),
      ArrowDown: () => h3d === null && input.step(0, 1),
      ArrowLeft: () => h3d === null && input.step(-1, 0),
      ArrowRight: () => h3d === null && input.step(1, 0),
      Enter: () => void input.confirm(),
      ' ': () => void dig(),
    },
    stage === 'play'
  );

  const markers = useMemo(
    (): Marker[] => (stage === 'won' ? [{ at: chest, kind: 'chestOpen' }] : []),
    [stage, chest]
  );
  const scene = useMemo(
    () => ({
      island,
      seen: stage === 'won' ? null : seen,
      sailor: walker.pos,
      footprints: prints,
      holes,
      route: input.route,
      markers,
      link: false,
      highlight: null,
    }),
    [island, seen, stage, walker.pos, prints, holes, input.route, markers]
  );

  if (stage === 'offer') {
    return (
      <div className="mx-auto flex w-full max-w-[520px] flex-col gap-3 p-3">
        <Card torn className="anim-rise flex flex-col gap-3">
          <Title>{copy.practice.title}</Title>
          <p>{copy.practice.intro}</p>
          <div className="mx-auto w-48">
            <ChartView
              island={island}
              pieces={pieces}
              depth="shallow"
              captain
              label={copy.common.captainBy}
            />
          </div>
          <div className="flex gap-2">
            <Button
              kind="gold"
              className="flex-1"
              onClick={() => setStage('play')}
            >
              {copy.practice.start}
            </Button>
            <Button onClick={finish}>{copy.practice.skip}</Button>
          </div>
        </Card>
      </div>
    );
  }
  const total = 5;
  const coachText = [
    touch ? copy.practice.move.touch : copy.practice.move.keys,
    touch ? copy.practice.run.touch : copy.practice.run.keys,
    copy.practice.chart,
    copy.practice.tide,
    copy.practice.dig,
  ][coach];
  const hint2d =
    stage === 'won'
      ? copy.practice.done
      : !walked
        ? copy.hint.hunt
        : copy.hint.dig;
  const target = (k: number): string =>
    h3d !== null && stage === 'play' && coach === k ? 'coach-target' : '';
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 px-3 py-1 text-sm">
        <span className="font-display text-[18px]">{copy.practice.title}</span>
        <span className="ml-auto inline-flex gap-0.5">
          {[0, 1, 2].map((i) => (
            <ShovelIcon key={i} used={i >= shovels} />
          ))}
        </span>
      </div>
      <div ref={viewRef} className="relative min-h-0 flex-1">
        <IslandCanvas
          scene={scene}
          zoom={h3d !== null ? 1 : 1.5}
          focus={walker.pos}
          onTap={(t) =>
            h3d !== null
              ? h3d.goTo(t)
              : walker.busy
                ? walker.skip()
                : input.onTap(t)
          }
          onHandle={setH3d}
          label={copy.practice.title}
        />
        {h3d !== null && touch && stage === 'play' && (
          <Joystick
            label={copy.hunt.stick}
            showHint={coach === 0}
            onMove={(x, y) => h3d.input(x, y, false)}
            onTap={(cx, cy) => {
              const rect = viewRef.current?.getBoundingClientRect();
              if (rect === undefined) return;
              const t = h3d.tileAt(cx - rect.left, cy - rect.top);
              if (t !== null) h3d.goTo(t);
            }}
          />
        )}
        <button
          type="button"
          onClick={() => {
            setChartOpen(true);
            if (coach === 2) advance(3);
          }}
          aria-label={copy.practice.chartTitle}
          className={`parchment absolute right-2 top-2 w-28 p-1 sm:w-36 ${target(2)}`}
        >
          <ChartView island={island} pieces={pieces} captain label="" />
        </button>
        <div className="absolute left-2 right-32 top-2 sm:right-40">
          {h3d !== null && stage === 'play' ? (
            <Coach
              step={coach + 1}
              total={total}
              text={coachText ?? ''}
              {...(coach === 3 ? { onNext: () => advance(4) } : {})}
              onSkip={finish}
            />
          ) : (
            <p className="parchment anim-rise px-3 py-2 text-sm" role="status">
              {h3d !== null ? copy.practice.done : hint2d}
            </p>
          )}
        </div>
        {chartOpen && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-lagoon/50 p-4 anim-fade">
            <div className="parchment w-full max-w-[360px] p-2">
              <ChartView
                island={island}
                pieces={pieces}
                captain
                label={copy.practice.chartTitle}
              />
            </div>
            <Button kind="gold" onClick={() => setChartOpen(false)}>
              {copy.common.close}
            </Button>
          </div>
        )}
      </div>
      <div className="flex items-center gap-2 px-3 py-3">
        {stage === 'won' ? (
          <Button kind="gold" className="w-full" onClick={finish}>
            {copy.dispatch.cta}
          </Button>
        ) : (
          <>
            <Button kind="quiet" className="text-foam" onClick={finish}>
              {copy.practice.skip}
            </Button>
            <Button
              kind="gold"
              className={`ml-auto min-w-28 ${target(4)}`}
              onClick={() => void dig()}
              disabled={walker.busy || digging}
            >
              {copy.hunt.dig}
            </Button>
          </>
        )}
      </div>
    </div>
  );
};
