// The daily crew goal (DAY-8.1): finds so far against today's target. Meeting it makes tomorrow
// Lantern night (DAY-8.2), which the line says once it happens.
import { copy, fmt } from '../copy.ts';

export const CrewGoal = ({
  found,
  target,
  tone = 'parchment',
}: {
  found: number;
  target: number;
  tone?: 'parchment' | 'night';
}) => {
  const met = found >= target;
  const k = Math.min(1, found / Math.max(1, target));
  return (
    <div className="flex flex-col gap-1">
      <div
        className={`h-2 w-full overflow-hidden rounded-full ${tone === 'night' ? 'bg-night-2' : 'bg-parchment-dark'}`}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={target}
        aria-valuenow={Math.min(found, target)}
        aria-label={copy.crew.label}
      >
        <div
          className="h-full origin-left bg-gold transition-transform"
          style={{ transform: `scaleX(${k})` }}
        />
      </div>
      <p
        className={`text-xs tabular ${tone === 'night' ? 'text-muted-night' : 'text-ink-soft'}`}
      >
        {met ? copy.crew.met : fmt(copy.crew.goal, { found, target })}
      </p>
    </div>
  );
};
