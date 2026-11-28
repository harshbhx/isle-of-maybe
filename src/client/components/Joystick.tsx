// The floating movement stick for touch screens (ADV-3.1): put a thumb anywhere in the lower-left
// zone and the stick appears right there, follows the thumb and disappears on release. Pushing past
// 75 % runs. A quick tap (no drag) is passed on, so tap-to-travel still works inside the zone.
// It lives over the 3D island in expanded mode only, so capturing the pointer is allowed (UI-1.2).
import { useRef, useState } from 'react';

const R = 56;
const TAP_MS = 220;
const TAP_PX = 10;

type Stick = { ox: number; oy: number; kx: number; ky: number };

export const Joystick = ({
  onMove,
  onTap,
  label,
  showHint,
}: {
  onMove: (x: number, y: number) => void;
  onTap?: (clientX: number, clientY: number) => void;
  label: string;
  /** A faint ring marks the zone until the player first moves. */
  showHint: boolean;
}) => {
  const [stick, setStick] = useState<Stick | null>(null);
  const down = useRef({ x: 0, y: 0, t: 0, moved: false });
  const zone = useRef<HTMLDivElement>(null);

  const local = (cx: number, cy: number): { x: number; y: number } => {
    const r = zone.current?.getBoundingClientRect();
    return { x: cx - (r?.left ?? 0), y: cy - (r?.top ?? 0) };
  };
  const push = (s: Stick, cx: number, cy: number): void => {
    const p = local(cx, cy);
    const dx = p.x - s.ox;
    const dy = p.y - s.oy;
    const d = Math.min(1, Math.hypot(dx, dy) / R);
    const a = Math.atan2(dy, dx);
    // A small dead zone so a resting thumb doesn't drift.
    const m = d < 0.12 ? 0 : d;
    setStick({ ...s, kx: Math.cos(a) * d * R, ky: Math.sin(a) * d * R });
    onMove(Math.cos(a) * m, Math.sin(a) * m);
  };
  const end = (cx: number, cy: number): void => {
    const d = down.current;
    if (!d.moved && performance.now() - d.t < TAP_MS) onTap?.(cx, cy);
    setStick(null);
    onMove(0, 0);
  };

  return (
    <div
      ref={zone}
      role="application"
      aria-label={label}
      className="absolute bottom-0 left-0 z-[5] h-2/3 w-3/5"
      style={{ touchAction: 'none' }}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        const p = local(e.clientX, e.clientY);
        down.current = {
          x: e.clientX,
          y: e.clientY,
          t: performance.now(),
          moved: false,
        };
        setStick({ ox: p.x, oy: p.y, kx: 0, ky: 0 });
      }}
      onPointerMove={(e) => {
        if (stick === null) return;
        const d = down.current;
        if (Math.hypot(e.clientX - d.x, e.clientY - d.y) > TAP_PX)
          d.moved = true;
        if (d.moved) push(stick, e.clientX, e.clientY);
      }}
      onPointerUp={(e) => end(e.clientX, e.clientY)}
      onPointerCancel={(e) => end(e.clientX, e.clientY)}
    >
      {stick === null && showHint && (
        <span
          aria-hidden
          className="anim-fade pointer-events-none absolute bottom-6 left-6 grid h-28 w-28 place-items-center rounded-full border-2 border-dashed border-foam/70 bg-lagoon/25"
        >
          <span className="h-12 w-12 rounded-full bg-paper/75" />
        </span>
      )}
      {stick !== null && (
        <span
          aria-hidden
          className="pointer-events-none absolute grid h-[128px] w-[128px] place-items-center rounded-full border-2 border-foam/60 bg-lagoon/30"
          style={{ left: stick.ox - 64, top: stick.oy - 64 }}
        >
          <span
            className="block h-14 w-14 rounded-full border-2 border-ink/30 bg-paper shadow-[0_3px_0_rgba(43,29,18,0.35)]"
            style={{ transform: `translate(${stick.kx}px, ${stick.ky}px)` }}
          />
        </span>
      )}
    </div>
  );
};
