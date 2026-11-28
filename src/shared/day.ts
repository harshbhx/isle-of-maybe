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
  'lanterns',
  'jungle',
  'fog',
]);

export const modifierFor = (day: string): Modifier => {
  const m = scheduledModifier(day);
  return IMPLEMENTED_MODIFIERS.has(m) ? m : 'clear';
};

/** Lantern night: landmarks this close to the sailor glow through the fog (PRD §modifiers). */
export const LANTERN_RANGE = 6;

/** Fog reveal radius in tiles (ENG-3.3). */
export const revealRadius = (m: Modifier): number =>
  m === 'clear' ? 4 : m === 'fog' ? 2 : 3;

/** Daily community target of finds (DAY-8.1); moderators can change it in the app settings. */
export const CREW_GOAL_DEFAULT = 50;
export const clampGoal = (v: unknown): number =>
  typeof v === 'number' && Number.isFinite(v)
    ? Math.min(10_000, Math.max(5, Math.round(v)))
    : CREW_GOAL_DEFAULT;

/** Tomorrow's modifier: Lantern night if today's crew goal was met (DAY-8.2), else the weekday's. */
export const nextModifier = (
  tomorrow: string,
  foundToday: number,
  goalToday: number
): Modifier => (foundToday >= goalToday ? 'lanterns' : modifierFor(tomorrow));

// The rules require English, so the calendar label has one fixed format (DAY-3.4).
const DAY_LABEL = new Intl.DateTimeFormat('en-GB', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  timeZone: 'UTC',
});

/** "Wed 9 Dec" for a `YYYY-MM-DD` UTC day; empty for anything else. */
export const dayLabel = (day: string): string => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return '';
  const ms = Date.parse(`${day}T00:00:00Z`);
  return Number.isNaN(ms) ? '' : DAY_LABEL.format(ms).replace(',', '');
};
