// W6 · Bury (CHART-1): only tiles you uncovered today are lit; tap one to see its depth and pay
// multiplier live, then bury. Logged-out players get the log-in prompt here and nowhere else.
import { useEffect, useMemo, useState } from 'react';
import type { BuryResponse, SeenResponse } from '../../shared/api.ts';
import { depthClass, depthMult } from '../../shared/depth.ts';
import { walkable } from '../../shared/path.ts';
import { seenFromHex } from '../../shared/seen.ts';
import { H, W, idx, type Tile } from '../../shared/types.ts';
import { useApp } from '../app-context.ts';
import { Hint } from '../components/Hint.tsx';
import {
  Banner,
  Button,
  Card,
  DepthDots,
  ErrorState,
  Loading,
  Title,
} from '../components/ui.tsx';
import { copy, fmt } from '../copy.ts';
import { IslandCanvas } from '../island/IslandCanvas.tsx';
import { useKeys } from '../island/input.ts';
import { ApiFailure, get, post } from '../lib/api.ts';
import { askLogin } from '../lib/platform.ts';

const bit = (m: Uint8Array, i: number): boolean =>
  (((m[i >> 3] ?? 0) >> (i & 7)) & 1) === 1;

export const Bury = () => {
  const app = useApp();
  const { island, init } = app;
  const [seen, setSeen] = useState<Uint8Array | null>(null);
  const [pick, setPick] = useState<Tile | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const loggedIn = init.user.loggedIn;

  useEffect(() => {
    if (!loggedIn) return;
    let live = true;
    get<SeenResponse>('/seen').then(
      (r) => live && setSeen(seenFromHex(r.mask)),
      () => live && setErr(copy.err.network)
    );
    return () => {
      live = false;
    };
  }, [loggedIn]);

  // Buryable = seen, walkable, not the dock, not a landmark (CHART-1.4; the server checks again).
  const allowed = useMemo(() => {
    if (seen === null) return null;
    const m = new Uint8Array((W * H) / 8);
    const marks = new Set(island.landmarks.map((l) => idx(l.at.x, l.at.y)));
    for (let i = 0; i < W * H; i++) {
      const x = i % W;
      const y = Math.floor(i / W);
      if (
        bit(seen, i) &&
        walkable(island.terrain, x, y) &&
        !marks.has(i) &&
        !(x === island.dock.x && y === island.dock.y)
      ) {
        m[i >> 3] = (m[i >> 3] ?? 0) | (1 << (i & 7));
      }
    }
    return m;
  }, [seen, island]);

  const can = (t: Tile): boolean =>
    allowed !== null && bit(allowed, idx(t.x, t.y));
  const choose = (t: Tile): void => {
    if (can(t)) setPick(t);
  };
  const nudge = (dx: number, dy: number): void => {
    const from = pick ?? island.dock;
    for (let k = 1; k < 40; k++) {
      const t = { x: from.x + dx * k, y: from.y + dy * k };
      if (t.x < 0 || t.y < 0 || t.x >= W || t.y >= H) return;
      if (can(t)) return setPick(t);
    }
  };
  const bury = async (): Promise<void> => {
    if (pick === null || busy) return;
    setBusy(true);
    try {
      const r = await post<BuryResponse>('/bury', { at: pick });
      void app.refresh();
      app.go({ k: 'chart', at: r.at, depth: r.depth });
    } catch (e) {
      setBusy(false);
      if (e instanceof ApiFailure && e.code === 'conflict') {
        await app.refresh();
        app.go({ k: 'result' });
      } else
        setErr(
          e instanceof ApiFailure && e.code === 'quota'
            ? copy.err.quota
            : copy.err.generic
        );
    }
  };
  useKeys({
    ArrowUp: () => nudge(0, -1),
    ArrowDown: () => nudge(0, 1),
    ArrowLeft: () => nudge(-1, 0),
    ArrowRight: () => nudge(1, 0),
    Enter: () => void bury(),
  });

  const markers = useMemo(
    () => (pick === null ? [] : [{ at: pick, kind: 'preview' as const }]),
    [pick]
  );
  const scene = useMemo(
    () => ({
      island,
      seen,
      sailor: null,
      footprints: [],
      holes: [],
      route: [],
      markers,
      link: false,
      highlight: allowed,
    }),
    [island, seen, markers, allowed]
  );

  if (!loggedIn) {
    return (
      <div className="flex flex-col gap-3 p-4">
        <Card className="flex flex-col gap-3">
          <Title>{copy.bury.title}</Title>
          <p>{copy.bury.login}</p>
          <div className="flex flex-wrap gap-2">
            <Button kind="gold" onClick={askLogin}>
              {copy.bury.loginCta}
            </Button>
            <Button
              onClick={() =>
                app.go({ k: init.user.huntsLeft > 0 ? 'pick' : 'result' })
              }
            >
              {copy.bury.browse}
            </Button>
          </div>
        </Card>
      </div>
    );
  }
  if (err !== null && seen === null) return <ErrorState message={err} />;
  if (seen === null) return <Loading />;
  const depth = pick === null ? null : depthClass(pick, island.landmarks);

  return (
    <div className="mx-auto flex h-full w-full max-w-[720px] flex-col gap-2 p-3">
      <Title className="text-on-night">{copy.bury.title}</Title>
      <Hint k="bury" />
      <div className="relative aspect-square max-h-[56vh] w-full self-center overflow-hidden rounded-[6px]">
        <IslandCanvas
          scene={scene}
          zoom={1}
          focus={pick ?? island.dock}
          onTap={choose}
          label={copy.bury.pickTile}
        />
      </div>
      {err !== null && <Banner>{err}</Banner>}
      <Card className="flex flex-col gap-2">
        {depth === null ? (
          <p className="text-ink-soft">{copy.bury.pickTile}</p>
        ) : (
          <>
            <p
              className="flex items-center gap-2 text-lg font-bold"
              aria-live="polite"
            >
              <DepthDots depth={depth} /> {copy.bury.depth[depth]}
            </p>
            <p className="text-sm text-ink-soft">
              {fmt(copy.bury.depthNote, { m: depthMult(depth) })}
            </p>
          </>
        )}
        <Button
          kind="gold"
          className="w-full"
          disabled={pick === null || busy}
          onClick={() => void bury()}
        >
          {copy.bury.cta}
        </Button>
      </Card>
    </div>
  );
};
