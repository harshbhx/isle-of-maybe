// Small motion pieces (ADV-9.5), written here instead of pulling in an animation library (AGENTS
// §2): a shimmer across a big line and sparks from a tap. Gold already counts up on the reveal;
// the pick card's pointer spotlight is CSS in index.css. All move only transform/opacity and hold still under reduced motion.
import { useRef, useState, type ReactNode } from 'react';

const still = (): boolean =>
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

/** A soft band of light that sweeps across its text once in a while. */
export const Shimmer = ({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) => (
  <span
    className={`shimmer relative inline-block overflow-hidden ${className}`}
  >
    {children}
    <span aria-hidden className="shimmer-band" />
  </span>
);

/** Sparks that fly out from where a button was pressed. Wrap a button with it. */
export const Sparks = ({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) => {
  const [bursts, setBursts] = useState<{ id: number; x: number; y: number }[]>(
    []
  );
  const n = useRef(0);
  return (
    <span
      className={`relative inline-flex ${className}`}
      onPointerDown={(e) => {
        if (still()) return;
        const r = e.currentTarget.getBoundingClientRect();
        const id = ++n.current;
        setBursts((b) => [
          ...b.slice(-2),
          { id, x: e.clientX - r.left, y: e.clientY - r.top },
        ]);
        window.setTimeout(
          () => setBursts((b) => b.filter((x) => x.id !== id)),
          520
        );
      }}
    >
      {children}
      {bursts.map((b) => (
        <span
          key={b.id}
          aria-hidden
          className="pointer-events-none absolute"
          style={{ left: b.x, top: b.y }}
        >
          {Array.from({ length: 8 }, (_, i) => (
            <span
              key={i}
              className="spark"
              style={{ transform: `rotate(${i * 45}deg)` }}
            />
          ))}
        </span>
      ))}
    </span>
  );
};
