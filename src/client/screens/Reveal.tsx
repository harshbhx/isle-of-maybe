// W5 · Reveal (HUNT-4.2, HUNT-5): where the chest really was against the chart's X, the gold, and
// an optional True / Cursed rating that never blocks moving on (HUNT-5.2).
import { Shimmer } from '../components/motion.tsx';
import { useEffect, useMemo, useState } from 'react';
import type {
  ChartPublic,
  Reveal as RevealData,
  Vote,
} from '../../shared/api.ts';
import { COMPASS_GLYPH, LANDMARK_GLYPHS } from '../../shared/glyphs.ts';
import type { Tile } from '../../shared/types.ts';
import { useApp } from '../app-context.ts';
import { Glyph } from '../components/Glyph.tsx';
import { Button, Card, CoinIcon, DepthDots, Title } from '../components/ui.tsx';
import { copy, fmt } from '../copy.ts';
import type { Marker } from '../island/draw.ts';
import { IslandCanvas } from '../island/IslandCanvas.tsx';
import { post } from '../lib/api.ts';
import { play } from '../lib/sound.ts';
import { reducedMotion } from '../island/walker.ts';

const missLine = (d: number): string =>
  fmt(
    d <= 3
      ? copy.reveal.missedClose
      : d >= 10
        ? copy.reveal.missedFar
        : copy.reveal.missed,
    { d }
  );

export const Reveal = ({
  chart,
  reveal,
  holes,
}: {
  chart: ChartPublic;
  reveal: RevealData;
  holes: Tile[];
}) => {
  const app = useApp();
  const { init, island } = app;
  const [rated, setRated] = useState<Vote | 'skip' | null>(null);
  const [linkFrom] = useState(() =>
    reducedMotion() ? undefined : performance.now() + 300
  );
  const [shown, setShown] = useState(
    reveal.found && !reducedMotion() ? 0 : reveal.gold
  );
  // Found: coins fly and the gold rolls up over 600 ms.
  useEffect(() => {
    if (!reveal.found) return;
    play('coin');
    if (reducedMotion()) return;
    const t0 = performance.now();
    let raf = 0;
    const tick = (now: number): void => {
      const k = Math.min(1, (now - t0) / 600);
      setShown(Math.round(reveal.gold * k));
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [reveal.found, reveal.gold]);

  const markers = useMemo(() => {
    const m: Marker[] = [];
    if (reveal.chartX !== null) m.push({ at: reveal.chartX, kind: 'x' });
    m.push({ at: reveal.chest, kind: reveal.found ? 'chestOpen' : 'chest' });
    return m;
  }, [reveal]);
  const scene = useMemo(
    () => ({
      island,
      seen: null,
      sailor: null,
      footprints: [],
      holes,
      route: [],
      markers,
      link: !reveal.found,
      highlight: null,
      ...(linkFrom === undefined ? {} : { linkFrom }),
    }),
    [island, holes, markers, reveal.found, linkFrom]
  );

  const rate = async (vote: Vote): Promise<void> => {
    setRated(vote);
    try {
      await post('/hunt/rate', { chartId: chart.id, vote });
    } catch {
      // A failed rating is not worth interrupting the player for.
    }
  };

  const headline = reveal.found
    ? fmt(chart.captain ? copy.reveal.foundCaptain : copy.reveal.found, {
        name: chart.author,
      })
    : missLine(reveal.distance ?? 0);
  const u = init.user;
  const next =
    u.loggedIn && !u.buried
      ? { label: copy.reveal.buryCta, go: () => app.go({ k: 'bury' }) }
      : !u.loggedIn && !u.buried
        ? { label: copy.reveal.buryCta, go: () => app.go({ k: 'bury' }) }
        : u.huntsLeft > 0
          ? { label: copy.reveal.again, go: () => app.go({ k: 'pick' }) }
          : { label: copy.reveal.results, go: () => app.go({ k: 'result' }) };

  return (
    <div className="mx-auto flex h-full w-full max-w-[720px] flex-col gap-3 p-3">
      <div className="relative aspect-square max-h-[52vh] w-full overflow-hidden rounded-[6px]">
        <IslandCanvas scene={scene} zoom={0} focus={null} label={headline} />
        <div className="absolute bottom-2 left-2 flex gap-3 rounded-[4px] bg-lagoon/80 px-2 py-1 text-xs">
          {reveal.chartX !== null && (
            <span className="text-[#FF9DB0]">✕ {copy.reveal.chartX}</span>
          )}
          <span className="text-sun">■ {copy.reveal.chest}</span>
        </div>
      </div>
      <Card className="anim-rise flex flex-col gap-3">
        <Title className={reveal.found ? '' : 'text-hibiscus'}>
          {reveal.found ? <Shimmer>{headline}</Shimmer> : headline}
        </Title>
        {reveal.found &&
          Array.from({ length: 8 }, (_, i) => (
            <span
              key={i}
              aria-hidden
              className={`coin-fly coin-${i % 4}`}
              style={{ left: '50%', top: '45%', animationDelay: `${i * 45}ms` }}
            >
              <CoinIcon size={18} />
            </span>
          ))}
        {reveal.found && (
          <p className="inline-flex items-center gap-2 text-lg text-ink">
            <CoinIcon size={20} />{' '}
            <strong className="tabular">
              {fmt(copy.reveal.gold, { gold: shown })}
            </strong>
            <span className="text-sm text-ink-soft">
              <DepthDots depth={chart.depth} withLabel /> ·{' '}
              {fmt(copy.hunt.shovels, { n: reveal.shovelsLeft })}
            </span>
          </p>
        )}
        {u.loggedIn && (
          <div>
            <p className="mb-2 text-sm text-ink-soft">
              {rated === null ? copy.reveal.rate : copy.reveal.rated}
            </p>
            {rated === null && (
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => void rate('true')}>
                  <Glyph glyph={COMPASS_GLYPH} size={20} /> {copy.reveal.true}
                </Button>
                <Button kind="danger" onClick={() => void rate('cursed')}>
                  <Glyph glyph={LANDMARK_GLYPHS.skullRock} size={20} />{' '}
                  {copy.reveal.cursed}
                </Button>
                <Button kind="quiet" onClick={() => setRated('skip')}>
                  {copy.reveal.skip}
                </Button>
              </div>
            )}
          </div>
        )}
        <Button kind="gold" className="w-full" onClick={next.go}>
          {next.label}
        </Button>
      </Card>
    </div>
  );
};
