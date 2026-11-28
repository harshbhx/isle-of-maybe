// Temporary walkable island on the kit page, to check the renderer and input before the hunt screen.
import { useCallback, useMemo, useState } from 'react';
import { revealRadius } from '../../shared/day.ts';
import { revealAround } from '../../shared/path.ts';
import type { Island, Tile } from '../../shared/types.ts';
import { Button } from '../components/ui.tsx';
import { copy } from '../copy.ts';
import type { Footprint } from './draw.ts';
import { useKeys, useRoute } from './input.ts';
import { IslandCanvas } from './IslandCanvas.tsx';
import { useWalker } from './walker.ts';

const mark = (mask: Uint8Array, t: Tile, r: number): Uint8Array => {
  const next = new Uint8Array(mask);
  for (const i of revealAround(t, r))
    next[i >> 3] = (next[i >> 3] ?? 0) | (1 << (i & 7));
  return next;
};

export const IslandDemo = ({ island }: { island: Island }) => {
  const r = revealRadius(island.modifier);
  const [at, setAt] = useState<Tile>(island.dock);
  const [seen, setSeen] = useState(() =>
    mark(new Uint8Array(200), island.dock, r)
  );
  const [prints, setPrints] = useState<Footprint[]>([]);
  const [zoom, setZoom] = useState(1);
  const walker = useWalker(island.dock);
  const go = useCallback(
    (route: Tile[]) => {
      void walker.walk(route, at, (t) => {
        setSeen((m) => mark(m, t, r));
        setPrints((p) => [...p.slice(-80), { ...t, t: performance.now() }]);
        setAt(t);
      });
    },
    [walker, at, r]
  );
  const input = useRoute(island.terrain, at, walker.busy, go);
  useKeys({
    ArrowUp: () => input.step(0, -1),
    ArrowDown: () => input.step(0, 1),
    ArrowLeft: () => input.step(-1, 0),
    ArrowRight: () => input.step(1, 0),
    '+': () => setZoom((z) => Math.min(2, z + 0.5)),
    '-': () => setZoom((z) => Math.max(0, z - 0.5)),
  });
  const scene = useMemo(
    () => ({
      island,
      seen,
      sailor: walker.pos,
      footprints: prints,
      holes: [],
      route: input.route,
      markers: [],
      link: false,
      highlight: null,
    }),
    [island, seen, walker.pos, prints, input.route]
  );
  return (
    <div className="flex flex-col gap-2">
      <div className="aspect-square w-full overflow-hidden rounded-[6px]">
        <IslandCanvas
          scene={scene}
          zoom={zoom}
          focus={walker.pos}
          onTap={input.onTap}
          label={island.name}
        />
      </div>
      <div className="flex gap-2">
        <Button
          kind="ink"
          className="bg-parchment"
          label={copy.hunt.zoomOut}
          onClick={() => setZoom((z) => Math.max(0, z - 0.5))}
        >
          −
        </Button>
        <Button
          kind="ink"
          className="bg-parchment"
          label={copy.hunt.zoomIn}
          onClick={() => setZoom((z) => Math.min(2, z + 0.5))}
        >
          +
        </Button>
      </div>
    </div>
  );
};
