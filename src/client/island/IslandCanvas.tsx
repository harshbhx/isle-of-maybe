// The island view (UI-3.1, UI-3.5): the 3D island when WebGL works, the Canvas 2D island otherwise.
// three.js loads lazily in the game entry only; until it's ready (or if it fails) the 2D view shows.
// touch-action is off on these canvases only, which live in expanded mode (UI-1.2).
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { Tile } from '../../shared/types.ts';
import {
  cameraFor,
  drawScene,
  tileAt,
  type Camera,
  type Scene,
} from './draw.ts';
import type { Island3D } from './three/island3d.ts';
import { reducedMotion } from './walker.ts';

type Props = {
  scene: Omit<Scene, 'now'>;
  zoom: number;
  focus: { x: number; y: number } | null;
  onTap?: (t: Tile) => void;
  label: string;
  className?: string;
  /** Straight-down 2D view, for overlays that must line up with the grid (the Ink check). */
  flat?: boolean;
  /** The 3D renderer once it's running (null again if it goes away or falls back to 2D). */
  onHandle?: (h: Island3D | null) => void;
};

// Once WebGL fails in this page, stay on 2D (UI-3.5): no flicker between renderers.
let webglBroken = false;

let webglChecked: boolean | null = null;
const webglAvailable = (): boolean => {
  if (webglBroken) return false;
  if (webglChecked !== null) return webglChecked;
  try {
    const c = document.createElement('canvas');
    webglChecked =
      c.getContext('webgl2') !== null || c.getContext('webgl') !== null;
  } catch {
    webglChecked = false;
  }
  return webglChecked;
};

export const IslandCanvas = (props: Props) => {
  const [mode, setMode] = useState<'2d' | '3d'>(() =>
    props.flat !== true && webglAvailable() ? '3d' : '2d'
  );
  return mode === '3d' ? (
    <Canvas3D
      {...props}
      onFail={() => {
        webglBroken = true;
        setMode('2d');
      }}
    />
  ) : (
    <Canvas2D {...props} />
  );
};

const Canvas3D = ({
  scene,
  zoom,
  focus,
  onTap,
  label,
  className = '',
  onFail,
  onHandle,
}: Props & { onFail: () => void }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const handle = useRef<Island3D | null>(null);
  const latest = useRef({ scene, zoom, focus });
  useLayoutEffect(() => {
    latest.current = { scene, zoom, focus };
    handle.current?.update(scene, zoom, focus);
  });
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let live = true;
    import('./three/island3d.ts').then(
      (m) => {
        if (!live) return;
        try {
          const h = m.createIsland3D(canvas, {
            reducedMotion: reducedMotion(),
            onFail,
          });
          handle.current = h;
          const l = latest.current;
          h.update(l.scene, l.zoom, l.focus);
          onHandle?.(h);
        } catch {
          onFail();
        }
      },
      () => live && onFail()
    );
    return () => {
      live = false;
      handle.current?.dispose();
      handle.current = null;
      onHandle?.(null);
    };
    // The renderer lives as long as the canvas; scene changes go through update() above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <canvas
      ref={canvasRef}
      role="img"
      aria-label={label}
      className={`block h-full w-full ${className}`}
      style={{ touchAction: 'none' }}
      onPointerUp={(e) => {
        const h = handle.current;
        if (!h || !onTap) return;
        const r = e.currentTarget.getBoundingClientRect();
        const t = h.tileAt(e.clientX - r.left, e.clientY - r.top);
        if (t !== null) onTap(t);
      }}
    />
  );
};

const Canvas2D = ({
  scene,
  zoom,
  focus,
  onTap,
  label,
  className = '',
}: Props) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const state = useRef({ scene, zoom, focus });
  const camRef = useRef<Camera | null>(null);
  useLayoutEffect(() => {
    state.current = { scene, zoom, focus };
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    let frame = 0;
    const draw = (): void => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const cw = canvas.clientWidth;
      const ch = canvas.clientHeight;
      if (
        canvas.width !== Math.round(cw * dpr) ||
        canvas.height !== Math.round(ch * dpr)
      ) {
        canvas.width = Math.round(cw * dpr);
        canvas.height = Math.round(ch * dpr);
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const s = state.current;
      const cam = cameraFor(cw, ch, s.zoom, s.zoom > 0 ? s.focus : null);
      camRef.current = cam;
      drawScene(ctx, { ...s.scene, now: performance.now() }, cam, cw, ch);
      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      role="img"
      aria-label={label}
      className={`block h-full w-full ${className}`}
      style={{ touchAction: 'none' }}
      onPointerUp={(e) => {
        const cam = camRef.current;
        if (!cam || !onTap) return;
        const r = e.currentTarget.getBoundingClientRect();
        const t = tileAt(cam, e.clientX - r.left, e.clientY - r.top);
        if (t !== null) onTap(t);
      }}
    />
  );
};
