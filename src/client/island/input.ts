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

/** Held keys drive the 3D explorer (ADV-3.1): WASD or arrows to walk, Shift to run. */
export const useDriveKeys = (
  drive: { input: (x: number, y: number, run: boolean) => void } | null
): void => {
  useEffect(() => {
    if (drive === null) return;
    const down = new Set<string>();
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
    const push = (): void => {
      const x =
        (down.has('arrowright') || down.has('d') ? 1 : 0) -
        (down.has('arrowleft') || down.has('a') ? 1 : 0);
      const y =
        (down.has('arrowdown') || down.has('s') ? 1 : 0) -
        (down.has('arrowup') || down.has('w') ? 1 : 0);
      const len = Math.hypot(x, y) || 1;
      drive.input(x / len, y / len, down.has('shift'));
    };
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
    const blur = (): void => {
      down.clear();
      push();
    };
    window.addEventListener('keydown', on);
    window.addEventListener('keyup', on);
    window.addEventListener('blur', blur);
    return () => {
      window.removeEventListener('keydown', on);
      window.removeEventListener('keyup', on);
      window.removeEventListener('blur', blur);
    };
  }, [drive]);
};
