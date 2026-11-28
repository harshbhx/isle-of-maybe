// Practice Cove (UI-9.1): a fixed island, a perfect Old Captain chart and the hunt hints, played
// entirely in the browser in under a minute. Skippable; finishing or skipping is remembered (UI-9.2).
import { useCallback, useMemo, useState } from 'react';
import { revealRadius } from '../../shared/day.ts';
import { generateIsland } from '../../shared/island.ts';
import { aStar, digFinds, walkable } from '../../shared/path.ts';
import type { ChartPiece, Island, Tile } from '../../shared/types.ts';
import { useApp } from '../app-context.ts';
import { ChartView } from '../components/ChartView.tsx';
import { Button, Card, ShovelIcon, Title } from '../components/ui.tsx';
import { copy } from '../copy.ts';
import type { Footprint, Marker } from '../island/draw.ts';
import { useKeys, useRoute } from '../island/input.ts';
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
  const input = useRoute(
    island.terrain,
    at,
    walker.busy || stage !== 'play',
    go
  );
  const dig = (): void => {
    if (walker.busy || stage !== 'play' || shovels <= 0) return;
    setHoles((h) => [...h, at]);
    if (digFinds(at, chest)) {
      setStage('won');
      app.announce(copy.practice.done);
      return;
    }
    setShovels((n) => (n <= 1 ? 3 : n - 1)); // Practice never ends in failure: shovels refill.
    app.announce(shovels === 3 ? copy.hunt.miss1 : copy.hunt.miss2);
  };
  useKeys(
    {
      ArrowUp: () => input.step(0, -1),
      ArrowDown: () => input.step(0, 1),
      ArrowLeft: () => input.step(-1, 0),
      ArrowRight: () => input.step(1, 0),
      Enter: () => void input.confirm(),
      ' ': dig,
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
  const hint =
    stage === 'won'
      ? copy.practice.done
      : !walked
        ? copy.hint.hunt
        : copy.hint.dig;
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
      <div className="relative min-h-0 flex-1">
        <IslandCanvas
          scene={scene}
          zoom={1.5}
          focus={walker.pos}
          onTap={(t) => (walker.busy ? walker.skip() : input.onTap(t))}
          label={copy.practice.title}
        />
        <div
          className="parchment pointer-events-none absolute right-2 top-2 w-28 p-1 sm:w-36"
          aria-hidden
        >
          <ChartView island={island} pieces={pieces} captain label="" />
        </div>
        <p
          className="parchment anim-rise absolute left-2 right-32 top-2 px-3 py-2 text-sm sm:right-40"
          role="status"
        >
          {hint}
        </p>
      </div>
      <div className="flex items-center gap-2 px-3 py-3">
        {stage === 'won' ? (
          <Button kind="gold" className="w-full" onClick={finish}>
            {copy.dispatch.cta}
          </Button>
        ) : (
          <>
            <Button kind="quiet" className="text-on-night" onClick={finish}>
              {copy.practice.skip}
            </Button>
            <Button
              kind="gold"
              className="ml-auto min-w-28"
              onClick={dig}
              disabled={walker.busy}
            >
              {copy.hunt.dig}
            </Button>
          </>
        )}
      </div>
    </div>
  );
};
