// Streak days as one bit per day of the UTC year (DAY-4). Pure: callers pass days in.
import { addDays } from './day.ts';

/** 366 bits, enough for a leap year. */
export const STREAK_BYTES = 46;

export const yearOf = (day: string): number => Number(day.slice(0, 4));

/** 0 for 1 January. */
export const dayOfYear = (day: string): number =>
  Math.round(
    (Date.parse(`${day}T00:00:00Z`) - Date.UTC(yearOf(day), 0, 1)) / 86_400_000
  );

/**
 * Consecutive set days ending today, or yesterday if today isn't set yet (DAY-4.2).
 * `isSet` may span year boundaries; `max` caps the walk.
 */
export const streakLength = (
  isSet: (day: string) => boolean,
  today: string,
  max = 366
): number => {
  let day = isSet(today) ? today : addDays(today, -1);
  let n = 0;
  while (n < max && isSet(day)) {
    n++;
    day = addDays(day, -1);
  }
  return n;
};
