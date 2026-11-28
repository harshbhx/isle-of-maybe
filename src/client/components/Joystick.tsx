// The movement stick for touch screens (ADV-3.1): drag from the ring; pushing past 75 % runs.
// It lives over the 3D island in expanded mode only, so capturing the pointer is allowed (UI-1.2).
import { useRef, useState } from 'react';

const R = 52;

export const Joystick = ({
  onMove,
  label,
}: {
  onMove: (x: number, y: number) => void;
  label: string;
}) => {
  const [knob, setKnob] = useState({ x: 0, y: 0, active: false });
  const origin = useRef({ x: 0, y: 0 });
  const end = (): void => {
    setKnob({ x: 0, y: 0, active: false });
    onMove(0, 0);
  };
  return (
    <div
      role="application"
      aria-label={label}
      className="absolute bottom-3 left-3 z-[5] grid h-[132px] w-[132px] place-items-center rounded-full border-2 border-foam/50 bg-lagoon/35"
      style={{ touchAction: 'none' }}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        const r = e.currentTarget.getBoundingClientRect();
        origin.current = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
        const dx = e.clientX - origin.current.x;
        const dy = e.clientY - origin.current.y;
        const d = Math.min(1, Math.hypot(dx, dy) / R);
        const a = Math.atan2(dy, dx);
        setKnob({
          x: Math.cos(a) * d * R,
          y: Math.sin(a) * d * R,
          active: true,
        });
        onMove(Math.cos(a) * d, Math.sin(a) * d);
      }}
      onPointerMove={(e) => {
        if (!knob.active) return;
        const dx = e.clientX - origin.current.x;
        const dy = e.clientY - origin.current.y;
        const d = Math.min(1, Math.hypot(dx, dy) / R);
        const a = Math.atan2(dy, dx);
        setKnob({
          x: Math.cos(a) * d * R,
          y: Math.sin(a) * d * R,
          active: true,
        });
        onMove(Math.cos(a) * d, Math.sin(a) * d);
      }}
      onPointerUp={end}
      onPointerCancel={end}
    >
      <span
        aria-hidden
        className="block h-14 w-14 rounded-full border-2 border-ink/30 bg-paper shadow-[0_3px_0_rgba(43,29,18,0.35)]"
        style={{ transform: `translate(${knob.x}px, ${knob.y}px)` }}
      />
    </div>
  );
};
