// Smooth walking along a route at 12 tiles a second (docs/03-DESIGN.md §8); instant steps under
// reduced motion (UI-5.1). Calls onStep for every tile entered so callers can reveal and record it.
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Tile } from '../../shared/types.ts';

export const TILES_PER_SECOND = 12;

export const reducedMotion = (): boolean =>
  typeof window !== 'undefined' &&
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;

export const useWalker = (start: Tile) => {
  const [pos, setPos] = useState<{ x: number; y: number }>(start);
  const [busy, setBusy] = useState(false);
  const raf = useRef(0);
  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  const reset = useCallback((t: Tile) => {
    cancelAnimationFrame(raf.current);
    setPos(t);
    setBusy(false);
  }, []);

  /** Walk `route` (excluding the current tile). Resolves when done. */
  const walk = useCallback(
    (
      route: readonly Tile[],
      from: Tile,
      onStep: (t: Tile) => void
    ): Promise<void> =>
      new Promise((resolve) => {
        if (route.length === 0) return resolve();
        setBusy(true);
        if (reducedMotion()) {
          for (const t of route) onStep(t);
          const last = route[route.length - 1] ?? from;
          setPos(last);
          setBusy(false);
          return resolve();
        }
        const t0 = performance.now();
        let done = 0;
        const tick = (now: number): void => {
          const k = ((now - t0) / 1000) * TILES_PER_SECOND;
          while (done < route.length && done + 1 <= k) {
            const t = route[done];
            if (t !== undefined) onStep(t);
            done++;
          }
          if (done >= route.length) {
            const last = route[route.length - 1] ?? from;
            setPos(last);
            setBusy(false);
            return resolve();
          }
          const a = done === 0 ? from : (route[done - 1] ?? from);
          const b = route[done] ?? a;
          const f = k - done;
          setPos({ x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f });
          raf.current = requestAnimationFrame(tick);
        };
        raf.current = requestAnimationFrame(tick);
      }),
    []
  );

  return { pos, busy, walk, reset };
};
