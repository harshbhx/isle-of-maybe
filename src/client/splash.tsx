// W1 · Inline splash (DAY-3, UI-1.2): day, island, modifier, live counts, streak and one Set sail
// button. No canvas, no gesture capture, nothing scrolls; the game opens in expanded mode.
import './index.css';

import { StrictMode, useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import type { InitResponse } from '../shared/api.ts';
import { IMPLEMENTED_MODIFIERS } from '../shared/day.ts';
import { generateIsland } from '../shared/island.ts';
import { liveChannel } from '../shared/live.ts';
import { ChartView } from './components/ChartView.tsx';
import { CrewGoal } from './components/CrewGoal.tsx';
import { CoinIcon, FlameIcon } from './components/ui.tsx';
import { copy, fmt } from './copy.ts';
import { get } from './lib/api.ts';
import { go, listen, openGame } from './lib/platform.ts';

export const Splash = () => {
  const [init, setInit] = useState<InitResponse | null>(null);
  const [counts, setCounts] = useState<InitResponse['counts'] | null>(null);
  useEffect(() => {
    let live = true;
    get<InitResponse>('/init').then(
      (i) => {
        if (!live) return;
        setInit(i);
        setCounts(i.counts);
      },
      () => undefined
    );
    return () => {
      live = false;
    };
  }, []);
  const day = init?.day;
  useEffect(
    () =>
      day === undefined
        ? undefined
        : listen(liveChannel(day), (m) => setCounts({ ...m.counts })),
    [day]
  );

  const mine = init?.dispatch.charts[0];
  // Today's coastline on parchment: a static SVG, no canvas and no input (UI-1.2). Shape only.
  const seed = init?.island.seed;
  const modifier = init?.island.modifier;
  const island = useMemo(
    () =>
      seed === undefined || modifier === undefined
        ? null
        : generateIsland(seed, modifier),
    [seed, modifier]
  );
  return (
    <main className="flex h-full flex-col justify-between gap-2 overflow-hidden bg-night px-4 py-3 text-on-night">
      <header className="flex items-start gap-2">
        <div className="min-w-0">
          <h1 className="font-display text-[26px] leading-none">
            {copy.splash.title}
          </h1>
          {init !== null && (
            <p className="font-display mt-1 truncate text-[20px] text-gold">
              {fmt(copy.splash.day, {
                n: init.dayNumber,
                island: init.island.name,
              })}
              {init.island.namedBy !== null && (
                <span className="block font-body text-xs text-muted-night">
                  {fmt(copy.splash.namedBy, { name: init.island.namedBy })}
                </span>
              )}
            </p>
          )}
        </div>
        {init?.user.loggedIn === true && (
          <p className="ml-auto flex shrink-0 gap-3 text-sm tabular">
            <span
              role="img"
              className="inline-flex items-center gap-1"
              aria-label={fmt(copy.splash.streak, { n: init.user.streak })}
            >
              <FlameIcon /> {init.user.streak}
            </span>
            <span
              role="img"
              className="inline-flex items-center gap-1 text-gold"
              aria-label={fmt(copy.splash.gold, { n: init.user.gold })}
            >
              <CoinIcon /> {init.user.gold.toLocaleString()}
            </span>
          </p>
        )}
      </header>
      <div className="flex min-h-0 items-center gap-3">
        <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-1 text-sm">
          {init === null ? (
            <p className="text-muted-night">{copy.splash.tagline}</p>
          ) : (
            <>
              {IMPLEMENTED_MODIFIERS.has(init.island.modifier) && (
                <p className="text-muted-night">
                  {copy.mod[init.island.modifier]}
                </p>
              )}
              {counts !== null &&
                (counts.buried > 0 ? (
                  <p className="tabular" aria-live="polite">
                    {fmt(copy.splash.counts, counts)}
                  </p>
                ) : (
                  <p>{copy.splash.first}</p>
                ))}
              {counts !== null && (
                <CrewGoal
                  found={counts.found}
                  target={init.goal}
                  tone="night"
                />
              )}
              {mine !== undefined && (
                <p className="tabular">
                  {fmt(copy.splash.yourChart, {
                    n: mine.dayNumber,
                    finds: mine.finds,
                  })}
                </p>
              )}
              {init.todayPost !== null && (
                <button
                  type="button"
                  className="min-h-11 text-left text-gold underline underline-offset-4"
                  onClick={() =>
                    init.todayPost &&
                    go(
                      `https://www.reddit.com/comments/${init.todayPost.postId.replace(/^t3_/, '')}`
                    )
                  }
                >
                  {fmt(copy.splash.oldDay, {
                    n: init.dayNumber,
                    today: init.todayPost.dayNumber,
                  })}
                </button>
              )}
            </>
          )}
        </div>
        {island !== null && (
          <div
            className="parchment w-24 shrink-0 rotate-[-3deg] p-1 sm:w-32"
            aria-hidden
          >
            <ChartView island={island} pieces={[]} label="" />
          </div>
        )}
      </div>
      <button
        type="button"
        className="min-h-12 w-full rounded-[6px] bg-gold font-bold text-night shadow-[0_3px_0_#a37a22] active:translate-y-[2px]"
        onClick={(e) => openGame(e.nativeEvent)}
      >
        {copy.splash.cta}
      </button>
    </main>
  );
};

const root = document.getElementById('root');
if (root) {
  createRoot(root).render(
    <StrictMode>
      <Splash />
    </StrictMode>
  );
}
