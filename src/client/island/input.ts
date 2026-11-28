// Tap-to-move with a route preview, and keyboard controls (UI-3.2, UI-6.1). The first tap shows a
// dotted route and a ghost sailor; tapping the same tile again walks it.
import { useCallback, useEffect, useRef, useState } from 'react';
import { aStar, walkable } from '../../shared/path.ts';
import type { Tile } from '../../shared/types.ts';

const same = (a: Tile | undefined, b: Tile): boolean =>
  a !== undefined && a.x === b.x && a.y === b.y;

export const useRoute = (
  terrain: Uint8Array,
  at: Tile,
  busy: boolean,
  go: (route: Tile[]) => void
) => {
  const [route, setRoute] = useState<Tile[]>([]);

  const onTap = useCallback(
    (t: Tile) => {
      if (busy) return;
      if (route.length > 1 && same(route[route.length - 1], t)) {
        setRoute([]);
        go(route.slice(1));
        return;
      }
      if (!walkable(terrain, t.x, t.y) || same(at, t)) {
        setRoute([]);
        return;
      }
      setRoute(aStar(terrain, at, t) ?? []);
    },
    [busy, route, terrain, at, go]
  );

  /** One step by keyboard, if that tile is walkable. */
  const step = useCallback(
    (dx: number, dy: number) => {
      if (busy) return;
      const t = { x: at.x + dx, y: at.y + dy };
      setRoute([]);
      if (walkable(terrain, t.x, t.y)) go([t]);
    },
    [busy, at, terrain, go]
  );

  const confirm = useCallback(() => {
    if (busy || route.length < 2) return false;
    setRoute([]);
    go(route.slice(1));
    return true;
  }, [busy, route, go]);

  return { route, onTap, step, confirm, clear: () => setRoute([]) };
};

/** Global key bindings while a screen is mounted; ignored while typing in a field. */
export const useKeys = (
  bindings: Record<string, () => void>,
  enabled = true
): void => {
  const ref = useRef(bindings);
  useEffect(() => {
    ref.current = bindings;
  });
  useEffect(() => {
    if (!enabled) return;
    const onKey = (e: KeyboardEvent): void => {
      if (
        e.target instanceof HTMLElement &&
        /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)
      )
        return;
      if (
        e.target instanceof HTMLButtonElement &&
        (e.key === ' ' || e.key === 'Enter')
      )
        return;
      const fn = ref.current[e.key];
      if (fn) {
        e.preventDefault();
        fn();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [enabled]);
};
