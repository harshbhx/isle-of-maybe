// UTC day helpers and the weekday modifier cycle (ENG-1.3, DAY-2).
// Callers pass timestamps in; nothing here reads the clock.

export type Modifier =
  'clear' | 'twins' | 'lowtide' | 'jungle' | 'fog' | 'lanterns' | 'storm';

/** Day 1 of Isle of Maybe (first island in the demo subreddit). */
export const LAUNCH_DAY = '2026-12-05';

const DAY_MS = 86_400_000;
const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

const parseDay = (day: string): number => {
  if (!DAY_RE.test(day)) throw new Error(`bad day string: ${day}`);
  const ms = Date.parse(`${day}T00:00:00Z`);
  if (Number.isNaN(ms)) throw new Error(`bad day string: ${day}`);
  return ms;
};

/** `YYYY-MM-DD` in UTC for a timestamp in ms. */
export const utcDay = (ms: number): string =>
  new Date(ms).toISOString().slice(0, 10);

export const addDays = (day: string, n: number): string =>
  utcDay(parseDay(day) + n * DAY_MS);

/** Day number, with LAUNCH_DAY = 1. Days before launch are ≤ 0. */
export const dayNumber = (day: string): number =>
  Math.round((parseDay(day) - parseDay(LAUNCH_DAY)) / DAY_MS) + 1;

/** Milliseconds from `ms` until the next 00:00 UTC. */
export const msUntilNextDay = (ms: number): number => DAY_MS - (ms % DAY_MS);

const BY_WEEKDAY: readonly Modifier[] = [
  'storm',
  'clear',
  'twins',
  'lowtide',
  'jungle',
  'fog',
  'lanterns',
];

/** The modifier the calendar asks for (Sun storm, Mon clear, Tue twins, …). */
export const scheduledModifier = (day: string): Modifier => {
  const m = BY_WEEKDAY[new Date(parseDay(day)).getUTCDay()];
  if (m === undefined) throw new Error('weekday out of range');
  return m;
};

/** Modifiers whose gameplay is implemented. Others fall back to clear (DAY-2.2). */
export const IMPLEMENTED_MODIFIERS: ReadonlySet<Modifier> = new Set<Modifier>([
  'clear',
  'twins',
  'lowtide',
  'jungle',
  'fog',
]);

export const modifierFor = (day: string): Modifier => {
  const m = scheduledModifier(day);
  return IMPLEMENTED_MODIFIERS.has(m) ? m : 'clear';
};

/** Fog reveal radius in tiles (ENG-3.3). */
export const revealRadius = (m: Modifier): number =>
  m === 'clear' ? 4 : m === 'fog' ? 2 : 3;
