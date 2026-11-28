// W3 · Pick a chart (HUNT-1): Trusted, Fresh and Old Captain cards, or a friend's challenge first.
import { useCallback, useEffect, useState, type PointerEvent } from 'react';
import type {
  ChartPublic,
  HuntStartResponse,
  PickResponse,
  PickSlot,
} from '../../shared/api.ts';
import { IMPLEMENTED_MODIFIERS } from '../../shared/day.ts';
import { useApp } from '../app-context.ts';
import { ChartView } from '../components/ChartView.tsx';
import { Hint } from '../components/Hint.tsx';
import {
  Banner,
  Button,
  DepthDots,
  ErrorState,
  Loading,
  Title,
} from '../components/ui.tsx';
import { copy, fmt } from '../copy.ts';
import { ApiFailure, get, post } from '../lib/api.ts';

const SLOT_LABEL: Record<PickSlot, string> = {
  challenge: copy.pick.trusted,
  trusted: copy.pick.trusted,
  fresh: copy.pick.fresh,
  captain: copy.pick.captain,
};

const errorText = (e: unknown): string =>
  e instanceof ApiFailure && e.code === 'quota'
    ? copy.err.quota
    : e instanceof ApiFailure && e.code !== 'network'
      ? copy.err.generic
      : copy.err.network;

const PickCard = ({
  slot,
  chart,
  onFollow,
  busy,
}: {
  slot: PickSlot;
  chart: ChartPublic;
  onFollow: () => void;
  busy: boolean;
}) => {
  const { island, init } = useApp();
  const by = chart.captain
    ? copy.common.captainBy
    : fmt(copy.common.byDay, { name: chart.author, n: init.dayNumber });
  // A soft light follows the mouse over the chart you're about to pick (ADV-9.5).
  const spot = (e: PointerEvent<HTMLElement>): void => {
    if (e.pointerType !== 'mouse') return;
    const r = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty('--sx', `${e.clientX - r.left}px`);
    e.currentTarget.style.setProperty('--sy', `${e.clientY - r.top}px`);
  };
  return (
    <article
      onPointerMove={spot}
      className="spotlight parchment flex w-[86%] shrink-0 snap-center flex-col gap-2 p-3 md:w-auto"
      aria-label={`${SLOT_LABEL[slot]} · ${by}`}
    >
      <header className="flex items-center justify-between">
        <span
          className={`font-display text-[20px] ${slot === 'captain' ? 'text-hibiscus' : ''}`}
        >
          {slot === 'challenge'
            ? fmt(copy.pick.challenged, { name: chart.author })
            : SLOT_LABEL[slot]}
        </span>
        <DepthDots depth={chart.depth} />
      </header>
      <ChartView
        island={island}
        pieces={chart.pieces}
        depth={chart.depth}
        captain={chart.captain}
        label={by}
      />
      <p className="text-sm text-ink-soft">{by}</p>
      {chart.note !== null && (
        <p className="font-chart text-[17px] italic text-ink">
          “{copy.notes[chart.note]}”
        </p>
      )}
      <p className="text-sm text-ink">
        {chart.captain
          ? copy.pick.captainNote
          : chart.attempts === 0
            ? copy.pick.fresh0
            : fmt(copy.pick.attempts, { n: chart.attempts, f: chart.finds })}
      </p>
      <Button
        kind="gold"
        onClick={onFollow}
        disabled={busy}
        className="mt-auto w-full"
      >
        {copy.pick.follow}
      </Button>
    </article>
  );
};

export const Pick = () => {
  const app = useApp();
  const [data, setData] = useState<PickResponse | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [index, setIndex] = useState(0);

  const q =
    app.challenge === null
      ? ''
      : `?challenge=${encodeURIComponent(app.challenge.chartId)}`;
  const load = useCallback(() => {
    setErr(null);
    get<PickResponse>(`/charts/pick${q}`).then(setData, (e: unknown) =>
      setErr(errorText(e))
    );
  }, [q]);
  useEffect(() => {
    let live = true;
    get<PickResponse>(`/charts/pick${q}`).then(
      (d) => live && setData(d),
      (e: unknown) => live && setErr(errorText(e))
    );
    return () => {
      live = false;
    };
  }, [q]);

  const follow = async (slot: PickSlot, chart: ChartPublic): Promise<void> => {
    setBusy(true);
    try {
      const start = await post<HuntStartResponse>('/hunt/start', {
        chartId: chart.id,
      });
      app.go({ k: 'hunt', start, chart, slot });
    } catch (e) {
      setBusy(false);
      if (e instanceof ApiFailure && e.code === 'conflict') {
        await app.refresh();
        app.go({ k: 'result' });
      } else setErr(errorText(e));
    }
  };

  if (err !== null) return <ErrorState message={err} onRetry={load} />;
  if (data === null) return <Loading />;
  if (app.init.user.huntsLeft === 0 || data.charts.length === 0) {
    return (
      <div className="flex flex-col gap-3 p-4">
        <Banner>{copy.pick.none}</Banner>
        <Button kind="gold" onClick={() => app.go({ k: 'result' })}>
          {copy.reveal.results}
        </Button>
      </div>
    );
  }
  // Logged-out players only ever get Old Captain charts, so "be the first" would be untrue for them.
  const onlyCaptain =
    app.init.user.loggedIn && data.charts.every((c) => c.slot === 'captain');
  return (
    <div className="flex flex-col gap-3 py-3">
      <div className="px-4">
        <Title>{copy.pick.title}</Title>
      </div>
      <div className="flex flex-col gap-2 px-4">
        {IMPLEMENTED_MODIFIERS.has(app.init.island.modifier) && (
          <Banner>{copy.mod[app.init.island.modifier]}</Banner>
        )}
        {onlyCaptain && <Banner>{copy.pick.empty}</Banner>}
        <Hint k="pick" />
      </div>
      <div
        className="flex snap-x snap-mandatory gap-3 overflow-x-auto px-[7%] pb-2 md:grid md:grid-cols-3 md:overflow-visible md:px-4"
        onScroll={(e) => {
          const el = e.currentTarget;
          setIndex(
            Math.round(
              el.scrollLeft / Math.max(1, el.scrollWidth / data.charts.length)
            )
          );
        }}
      >
        {data.charts.map(({ slot, chart }) => (
          <PickCard
            key={chart.id}
            slot={slot}
            chart={chart}
            busy={busy}
            onFollow={() => void follow(slot, chart)}
          />
        ))}
      </div>
      <div className="flex justify-center gap-2 md:hidden" aria-hidden>
        {data.charts.map((c, i) => (
          <span
            key={c.chart.id}
            className={`h-2 w-2 rounded-full ${i === index ? 'bg-mango' : 'bg-seafoam/40'}`}
          />
        ))}
      </div>
    </div>
  );
};
