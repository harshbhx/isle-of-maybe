// W2 · Dispatch (DAY-5): the first screen of a new day when your charts have news, or a sample card
// once for first-timers. Live counters, tier progress, then on to today's island.
import { useMemo } from 'react';
import type { DispatchChart } from '../../shared/api.ts';
import { COMPASS_GLYPH, LANDMARK_GLYPHS } from '../../shared/glyphs.ts';
import { generateIsland } from '../../shared/island.ts';
import { useApp } from '../app-context.ts';
import { ChartView } from '../components/ChartView.tsx';
import { Glyph } from '../components/Glyph.tsx';
import { Button, Card, CoinIcon, Title } from '../components/ui.tsx';
import { copy, fmt } from '../copy.ts';

const Item = ({ c }: { c: DispatchChart }) => {
  const island = useMemo(
    () => generateIsland(c.island.seed, c.island.modifier),
    [c.island.seed, c.island.modifier]
  );
  return (
    <li className="grid grid-cols-[96px_1fr] gap-3 border-t border-parchment-dark pt-3 first:border-t-0 first:pt-0">
      <ChartView
        island={island}
        pieces={c.pieces}
        depth={c.depth}
        label={fmt(copy.splash.day, { n: c.dayNumber, island: c.island.name })}
      />
      <div className="flex flex-col gap-1">
        <p className="font-display text-[18px]">
          {fmt(copy.splash.day, { n: c.dayNumber, island: c.island.name })}
        </p>
        <p className="tabular">
          {fmt(copy.dispatch.line, { tried: c.attempts, found: c.finds })}
        </p>
        <p className="inline-flex items-center gap-3 text-sm">
          <span
            role="img"
            className="inline-flex items-center gap-1"
            aria-label={`${c.trueVotes} ${copy.reveal.true}`}
          >
            <Glyph glyph={COMPASS_GLYPH} size={16} /> {c.trueVotes}
          </span>
          <span
            role="img"
            className="inline-flex items-center gap-1 text-seal"
            aria-label={`${c.cursedVotes} ${copy.reveal.cursed}`}
          >
            <Glyph glyph={LANDMARK_GLYPHS.skullRock} size={16} />{' '}
            {c.cursedVotes}
          </span>
        </p>
        {c.salvage > 0 && (
          <p className="inline-flex items-center gap-1 font-bold tabular">
            <CoinIcon /> {fmt(copy.dispatch.salvage, { gold: c.salvage })}
          </p>
        )}
      </div>
    </li>
  );
};

export const Dispatch = ({
  onDone,
  sample,
}: {
  onDone: () => void;
  sample: boolean;
}) => {
  const { init } = useApp();
  const { charts, tier } = init.dispatch;
  const pct =
    tier.next === null
      ? 100
      : Math.min(100, Math.round((100 * tier.finds) / tier.next.at));
  return (
    <div className="mx-auto flex w-full max-w-[520px] flex-col gap-3 p-3">
      <Card torn className="anim-rise flex flex-col gap-3">
        <Title>{copy.dispatch.title}</Title>
        {sample ? (
          <div className="rounded-[4px] border-2 border-dashed border-parchment-dark p-3 text-ink-soft">
            <p className="mb-1 text-xs uppercase tracking-wider">
              {copy.dispatch.sampleTitle}
            </p>
            <p className="tabular">
              {fmt(copy.dispatch.line, { tried: 14, found: 9 })} ·{' '}
              {fmt(copy.dispatch.salvage, { gold: 270 })}
            </p>
            <p className="mt-2 text-ink">{copy.dispatch.sample}</p>
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {charts.map((c) => (
              <Item key={c.chartId} c={c} />
            ))}
          </ul>
        )}
        <div>
          <div
            className="h-2.5 w-full overflow-hidden rounded-full bg-parchment-dark"
            role="progressbar"
            aria-valuenow={pct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={copy.tier[tier.tier]}
          >
            <div
              className="h-full origin-left bg-compass"
              style={{ transform: `scaleX(${pct / 100})` }}
            />
          </div>
          <p className="mt-1 text-sm tabular">
            {tier.next === null
              ? fmt(copy.dispatch.tierTop, {
                  tier: copy.tier[tier.tier],
                  finds: tier.finds,
                })
              : fmt(copy.dispatch.tier, {
                  tier: copy.tier[tier.tier],
                  finds: tier.finds,
                  next: tier.next.at,
                })}
          </p>
        </div>
        <Button kind="gold" onClick={onDone}>
          {copy.dispatch.cta}
        </Button>
      </Card>
    </div>
  );
};
