// The daily crew goal (DAY-8.1): finds so far against today's target. Meeting it makes tomorrow
// Lantern night (DAY-8.2), which the line says once it happens. In a short inline post only the bar
// shows; it carries the same numbers for screen readers.
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
  const line = met ? copy.crew.met : fmt(copy.crew.goal, { found, target });
  return (
    <div className="flex flex-col gap-1">
      <div
        className={`h-2 w-full overflow-hidden rounded-full ${tone === 'night' ? 'bg-lagoon-2' : 'bg-paper-2'}`}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={target}
        aria-valuenow={Math.min(found, target)}
        aria-valuetext={line}
        aria-label={copy.crew.label}
      >
        <div
          className="h-full origin-left bg-mango transition-transform"
          style={{ transform: `scaleX(${k})` }}
        />
      </div>
      <p
        className={`text-xs tabular [@media(max-height:360px)]:hidden ${tone === 'night' ? 'text-seafoam' : 'text-ink-soft'}`}
      >
        {line}
      </p>
    </div>
  );
};
