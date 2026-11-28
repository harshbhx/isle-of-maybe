// The island canvas (UI-3.1): DPR-aware, redraws every frame only while something moves, and turns
// taps into tile taps. touch-action is off on this canvas only, which lives in expanded mode.
import { useEffect, useLayoutEffect, useRef } from 'react';
import type { Tile } from '../../shared/types.ts';
import {
  cameraFor,
  drawScene,
  tileAt,
  type Camera,
  type Scene,
} from './draw.ts';

type Props = {
  scene: Omit<Scene, 'now'>;
  zoom: number;
  focus: { x: number; y: number } | null;
  onTap?: (t: Tile) => void;
  label: string;
  className?: string;
};

export const IslandCanvas = ({
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
