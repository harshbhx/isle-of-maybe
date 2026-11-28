// Tomorrow's coastline teaser (DAY-7.1): shape only, no landmarks, with a countdown to 00:00 UTC
// shown in the player's local time. The island comes from the same deterministic seed the server
// will freeze tomorrow (sent by init, so a met crew goal is included), so it is the real shape.
import { useEffect, useMemo, useState } from 'react';
import { msUntilNextDay, type Modifier } from '../../shared/day.ts';
import { generateIsland } from '../../shared/island.ts';
import { copy, fmt } from '../copy.ts';
import { coastPath } from '../lib/geom.ts';

const hms = (ms: number): string => {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return `${h}:${String(m).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
};

export const Teaser = ({
  seed,
  modifier,
}: {
  seed: string;
  modifier: Modifier;
}) => {
  const d = useMemo(
    () => coastPath(generateIsland(seed, modifier)),
    [seed, modifier]
  );
  const [left, setLeft] = useState(() => msUntilNextDay(Date.now()));
  useEffect(() => {
    const id = window.setInterval(
      () => setLeft(msUntilNextDay(Date.now())),
      1000
    );
    return () => window.clearInterval(id);
  }, []);
  return (
    <div className="flex items-center gap-3">
      <svg viewBox="0 0 400 400" className="h-16 w-16 shrink-0" aria-hidden>
        <path d={d} fill="#2B1D12" fillRule="evenodd" opacity="0.85" />
      </svg>
      <p className="text-sm">
        <span className="font-display block text-[18px]">
          {copy.result.tomorrow}
        </span>
        <span className="tabular text-ink-soft" role="timer" aria-live="off">
          {fmt(copy.result.countdown, { t: hms(left) })}
        </span>
      </p>
    </div>
  );
};
