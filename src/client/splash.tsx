// W1 · Inline splash (DAY-3, UI-1.2): what the game is, today's coastline, live counts, streak and one
// Set sail button. No canvas, no gesture capture, nothing scrolls; the game opens in expanded mode.
import './index.css';

import { StrictMode, useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import type { InitResponse } from '../shared/api.ts';
import { dayLabel, IMPLEMENTED_MODIFIERS } from '../shared/day.ts';
import { LANDMARK_GLYPHS, X_GLYPH } from '../shared/glyphs.ts';
import { generateIsland } from '../shared/island.ts';
import { liveChannel } from '../shared/live.ts';
import { ChartView } from './components/ChartView.tsx';
import { CrewGoal } from './components/CrewGoal.tsx';
import { Glyph } from './components/Glyph.tsx';
import { Logo } from './components/Logo.tsx';
import { CoinIcon, FlameIcon, ShovelIcon } from './components/ui.tsx';
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
  const date = day === undefined ? '' : dayLabel(day);
  return (
    <main className="flex h-full flex-col gap-2 overflow-hidden bg-lagoon px-4 py-3 text-foam">
      <header className="flex items-start gap-2">
        <div className="min-w-0">
          <h1 className="font-title flex items-center gap-2 text-[28px] leading-none">
            <Logo size={30} />
            {copy.splash.title}
          </h1>
          {init !== null && (
            <p className="font-display mt-1 truncate text-[20px] leading-tight text-sun">
              {fmt(copy.splash.day, {
                n: init.dayNumber,
                island: init.island.name,
              })}
            </p>
          )}
          {init !== null && (
            <p className="truncate text-xs text-seafoam">
              {date}
              {init.island.namedBy !== null &&
                ` · ${fmt(copy.splash.namedBy, { name: init.island.namedBy })}`}
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
              className="inline-flex items-center gap-1 text-sun"
              aria-label={fmt(copy.splash.gold, { n: init.user.gold })}
            >
              <CoinIcon /> {init.user.gold.toLocaleString()}
            </span>
          </p>
        )}
      </header>
      {/* What the game is, always (DAY-3.4): judges and new players read this before anything else. */}
      <p className="text-[15px] leading-snug">{copy.splash.pitch}</p>
      {/* A size container, so the hero can be square and as big as the space allows. */}
      <div className="flex min-h-0 flex-1 items-stretch gap-3 [container-type:size]">
        {island !== null && (
          // Today's coastline as the hero: shape only, no landmarks, so it never helps a chart.
          <div
            className="parchment aspect-square w-[min(100cqh,48cqw,14rem)] shrink-0 self-center rotate-[-2deg] p-1"
            aria-hidden
          >
            <ChartView island={island} pieces={[]} label="" />
          </div>
        )}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col justify-center-safe gap-1 overflow-hidden text-sm">
          {init !== null && (
            <>
              {IMPLEMENTED_MODIFIERS.has(init.island.modifier) && (
                <p className="text-seafoam">{copy.mod[init.island.modifier]}</p>
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
                // Below the smallest post height, drop this line rather than clip it.
                <p className="tabular [@media(max-height:319px)]:hidden">
                  {fmt(copy.splash.yourChart, {
                    n: mine.dayNumber,
                    finds: mine.finds,
                  })}
                </p>
              )}
              {init.todayPost !== null && (
                <button
                  type="button"
                  className="min-h-11 text-left text-sun underline underline-offset-4"
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
      </div>
      {/* The loop in three steps, only when the post is tall enough to keep it calm (DAY-3.5). */}
      <ol className="hidden items-center justify-between gap-1 text-xs text-seafoam [@media(min-height:440px)]:flex">
        {copy.splash.how.map((step, i) => (
          <li key={step} className="flex min-w-0 items-center gap-1.5">
            {i > 0 && (
              <span aria-hidden className="text-sun">
                ›
              </span>
            )}
            <span aria-hidden className="shrink-0 text-sun">
              {i === 0 ? (
                <Glyph glyph={LANDMARK_GLYPHS.palm} size={18} />
              ) : i === 1 ? (
                <ShovelIcon />
              ) : (
                <Glyph glyph={X_GLYPH} size={18} />
              )}
            </span>
            <span className="min-w-0">{step}</span>
          </li>
        ))}
      </ol>
      <button
        type="button"
        className="min-h-12 w-full shrink-0 rounded-[6px] bg-mango font-bold text-ink shadow-[0_3px_0_#C98400] active:translate-y-[2px]"
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
