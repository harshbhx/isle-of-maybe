// W9 · Result card (DAY-3, COM-2, COM-5.2): today's hunt, your chest and grade, streak and gold,
// how your chart is doing, live counts, and separate buttons to hunt again, share, challenge or
// see the boards. Nothing here is required to continue (COM-2.3).
import { useEffect, useState } from 'react';
import { msUntilNextDay } from '../../shared/day.ts';
import { liveChannel } from '../../shared/live.ts';
import { resultLine } from '../../shared/result-line.ts';
import { useApp } from '../app-context.ts';
import {
  Button,
  Card,
  CoinIcon,
  DepthDots,
  FlameIcon,
  Title,
} from '../components/ui.tsx';
import { copy, fmt } from '../copy.ts';
import { listen, share } from '../lib/platform.ts';
import { ShareSheet } from './ShareSheet.tsx';

const newIslandTime = (): string => {
  const at = new Date(Date.now() + msUntilNextDay(Date.now()));
  return at.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
};

export const Result = () => {
  const app = useApp();
  const { init, lastHunt } = app;
  const u = init.user;
  const [counts, setCounts] = useState(init.counts);
  const [sharing, setSharing] = useState(false);
  useEffect(
    () => listen(liveChannel(init.day), (m) => setCounts({ ...m.counts })),
    [init.day]
  );

  const chest = u.chest;
  const grade = chest?.grade ?? app.myChest?.grade ?? null;
  const line = resultLine(
    {
      dayNumber: init.dayNumber,
      hunt:
        lastHunt === null
          ? null
          : {
              found: lastHunt.reveal.found,
              shovelsUsed: 3 - lastHunt.reveal.shovelsLeft,
            },
      chest: chest === null ? null : { depth: chest.depth, grade },
    },
    { ...copy.resultLine, depth: copy.common.depth, ink: copy.ink }
  );
  const challenge = (): void => {
    if (u.chartId === null) return;
    void share(
      copy.challenge.title,
      `${fmt(copy.challenge.text, { island: init.island.name })}\n${line}`,
      JSON.stringify({ type: 'challenge', chartId: u.chartId })
    );
  };

  return (
    <div className="mx-auto flex w-full max-w-[520px] flex-col gap-3 p-3">
      <Card torn className="anim-rise flex flex-col gap-2">
        <Title>
          {fmt(copy.splash.day, {
            n: init.dayNumber,
            island: init.island.name,
          })}
        </Title>
        {lastHunt !== null && (
          <p>
            {fmt(
              lastHunt.reveal.found ? copy.result.found : copy.result.missed,
              {
                name: lastHunt.chart.captain
                  ? copy.pick.captain
                  : lastHunt.chart.author,
                steps: lastHunt.reveal.steps,
              }
            )}
          </p>
        )}
        {chest !== null ? (
          <p className="flex flex-wrap items-center gap-2">
            <DepthDots depth={chest.depth} />
            {fmt(copy.result.yourChest, {
              depth: copy.common.depth[chest.depth],
              grade: grade === null ? '—' : copy.ink[grade],
            })}
          </p>
        ) : (
          u.loggedIn && <p className="text-ink-soft">{copy.result.noChest}</p>
        )}
        <p className="flex flex-wrap gap-4">
          <span className="inline-flex items-center gap-1">
            <FlameIcon /> {fmt(copy.result.streak, { n: u.streak })}
          </span>
          <span className="inline-flex items-center gap-1 tabular">
            <CoinIcon />{' '}
            {fmt(copy.result.total, { n: u.gold.toLocaleString() })}
          </span>
        </p>
        {chest !== null && chest.attempts > 0 && (
          <p className="font-bold">
            {fmt(copy.result.live, { n: chest.attempts })}
          </p>
        )}
        <p className="tabular text-sm text-ink-soft" aria-live="polite">
          {fmt(copy.splash.counts, counts)}
        </p>
      </Card>
      <div className="flex flex-col gap-2">
        {u.buried && u.chartId === null && chest !== null && (
          <Button
            kind="gold"
            onClick={() =>
              app.go({ k: 'chart', at: chest.at, depth: chest.depth })
            }
          >
            {copy.chart.title}
          </Button>
        )}
        {u.loggedIn && !u.buried && u.huntsToday > 0 && init.isToday && (
          <Button kind="gold" onClick={() => app.go({ k: 'bury' })}>
            {copy.reveal.buryCta}
          </Button>
        )}
        {u.huntsLeft > 0 ? (
          <Button
            kind={u.buried || !u.loggedIn ? 'gold' : 'ink'}
            className={
              u.buried || !u.loggedIn
                ? ''
                : 'border-muted-night/50 text-on-night'
            }
            onClick={() => app.go({ k: 'pick' })}
          >
            {fmt(copy.result.again, { n: u.huntsLeft })}
          </Button>
        ) : (
          <p className="text-center text-muted-night">
            {fmt(copy.result.done, { time: newIslandTime() })}
          </p>
        )}
        <div className="grid grid-cols-2 gap-2">
          {u.chartId !== null && (
            <>
              <Button
                kind="ink"
                className="border-muted-night/50 text-on-night"
                onClick={() => setSharing(true)}
              >
                {copy.result.share}
              </Button>
              <Button
                kind="ink"
                className="border-muted-night/50 text-on-night"
                onClick={challenge}
              >
                {copy.result.challenge}
              </Button>
            </>
          )}
          <Button
            kind="ink"
            className="col-span-2 border-muted-night/50 text-on-night"
            onClick={() => app.go({ k: 'boards' })}
          >
            {copy.result.boards}
          </Button>
        </div>
      </div>
      <ShareSheet open={sharing} onClose={() => setSharing(false)} />
    </div>
  );
};
