// The website's "today's island" card (SHIP-9.1): today's coastline, its day number and biome, and a
// countdown to the next island. All computed in the browser from the game's shared generator, so the
// site makes no requests. Shape only, no landmarks, so it never helps anyone chart (as on the splash).
import { biomeFor } from '../../src/shared/biome.ts';
import { coastLoops, smoothLoop } from '../../src/shared/coast.ts';
import {
  dayNumber,
  LAUNCH_DAY,
  modifierFor,
  msUntilNextDay,
  utcDay,
} from '../../src/shared/day.ts';
import { islandForDay } from '../../src/shared/island.ts';
import { H, W } from '../../src/shared/types.ts';

const BIOME_WORDS: Record<string, string> = {
  tropical: 'a tropical isle',
  volcanic: 'a volcanic isle',
  autumn: 'an autumn isle',
  mangrove: 'a mangrove isle',
  frost: 'a frost isle',
  coral: 'a coral isle',
};

const pad = (n: number): string => String(n).padStart(2, '0');
const clock = (ms: number): string => {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`;
};

const draw = (root: HTMLElement, now: number): void => {
  const today = utcDay(now);
  const before = dayNumber(today) < 1;
  const day = before ? LAUNCH_DAY : today;
  const island = islandForDay(day, modifierFor(day));
  const k = 10;
  const d = coastLoops(island.terrain)
    .map(
      (l) =>
        smoothLoop(l)
          .map(
            (p, i) =>
              `${i === 0 ? 'M' : 'L'}${(p.x * k).toFixed(1)} ${(p.y * k).toFixed(1)}`
          )
          .join('') + 'Z'
    )
    .join('');
  for (const el of root.querySelectorAll('[data-coast], [data-coast-ring]'))
    el.setAttribute('d', d);
  const dock = root.querySelector('[data-dock]');
  if (dock !== null) {
    dock.setAttribute('cx', String((island.dock.x + 0.5) * k));
    dock.setAttribute('cy', String((island.dock.y + 0.5) * k));
  }
  root.querySelector('svg')?.setAttribute('viewBox', `0 0 ${W * k} ${H * k}`);
  const title = root.querySelector('[data-title]');
  if (title !== null)
    title.textContent = before
      ? `Day 1, ${BIOME_WORDS[biomeFor(island.seed)] ?? 'a new isle'}`
      : `Day ${dayNumber(today)}, ${BIOME_WORDS[biomeFor(island.seed)] ?? 'a new isle'}`;
  const when = root.querySelector('[data-when]');
  const tick = (): void => {
    const t = Date.now();
    if (when === null) return;
    if (dayNumber(utcDay(t)) < 1) {
      const launch = Date.parse(`${LAUNCH_DAY}T00:00:00Z`) - t;
      when.textContent = `Sets sail in ${Math.ceil(launch / 86_400_000)} days`;
    } else when.textContent = `Next island in ${clock(msUntilNextDay(t))}`;
  };
  tick();
  window.setInterval(tick, 1000);
  root.dataset.ready = 'true';
};

const card = document.querySelector<HTMLElement>('[data-today]');
if (card !== null) draw(card, Date.now());
