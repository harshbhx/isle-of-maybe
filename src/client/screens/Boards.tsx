// W11 · Leaderboards and Hall of Charts (COM-3, COM-4): tabs, top 10, your own row pinned below if
// you're further down, and past days' best charts as read-only parchments.
import { useEffect, useMemo, useState } from 'react';
import type {
  BoardKind,
  BoardResponse,
  BoardRow,
  HallDay,
  HallResponse,
} from '../../shared/api.ts';
import { generateIsland } from '../../shared/island.ts';
import { useApp } from '../app-context.ts';
import { ChartView } from '../components/ChartView.tsx';
import {
  Button,
  ErrorState,
  Loading,
  SrTitle,
  Tabs,
} from '../components/ui.tsx';
import { copy, fmt } from '../copy.ts';
import { get } from '../lib/api.ts';

type Tab = 'goldDay' | 'goldWeek' | 'cartographers' | 'trusted' | 'hall';
const TABS: readonly { key: Tab; label: string }[] = [
  { key: 'goldDay', label: copy.boards.today },
  { key: 'goldWeek', label: copy.boards.week },
  { key: 'cartographers', label: copy.boards.carto },
  { key: 'trusted', label: copy.boards.trusted },
  { key: 'hall', label: copy.boards.hall },
];

const Row = ({ r, me, unit }: { r: BoardRow; me: boolean; unit: string }) => (
  <li
    className={`grid grid-cols-[2.5rem_1fr_auto] items-center gap-2 px-3 py-2 ${me ? 'bg-mango/25 font-bold' : ''}`}
  >
    <span className="tabular text-ink-soft">{r.rank}</span>
    <span className="truncate">
      u/{r.name}
      {me && ` · ${copy.boards.you}`}
    </span>
    <span className="tabular">
      {r.value.toLocaleString()}
      {unit}
    </span>
  </li>
);

const Board = ({ kind }: { kind: BoardKind }) => {
  const { init } = useApp();
  const [data, setData] = useState<BoardResponse | null>(null);
  const [err, setErr] = useState(false);
  useEffect(() => {
    let live = true;
    get<BoardResponse>(`/boards/${kind}`).then(
      (d) => live && setData(d),
      () => live && setErr(true)
    );
    return () => {
      live = false;
    };
  }, [kind]);
  if (err) return <ErrorState message={copy.err.network} />;
  if (data === null) return <Loading />;
  if (data.rows.length === 0)
    return <p className="p-6 text-center text-seafoam">{copy.boards.empty}</p>;
  const unit = kind === 'trusted' ? '%' : '';
  const meName = init.user.name;
  const inTop =
    data.me !== null && data.rows.some((r) => r.rank === data.me?.rank);
  return (
    <ol className="parchment divide-y divide-paper-2 overflow-hidden p-0">
      {data.rows.map((r) => (
        <Row
          key={`${r.rank}-${r.name}`}
          r={r}
          unit={unit}
          me={data.me !== null && r.rank === data.me.rank && r.name === meName}
        />
      ))}
      {data.me !== null && !inTop && <Row r={data.me} unit={unit} me />}
    </ol>
  );
};

const HallDayCard = ({ day }: { day: HallDay }) => {
  const island = useMemo(
    () => generateIsland(day.seed, day.modifier),
    [day.seed, day.modifier]
  );
  return (
    <section className="parchment p-3">
      <h2 className="font-display mb-2 text-[20px]">
        {fmt(copy.splash.day, { n: day.dayNumber, island: day.island })}
      </h2>
      <div className="grid grid-cols-3 gap-2">
        {day.top.map((c) => (
          <figure key={c.id} className="flex flex-col gap-1">
            <ChartView
              island={island}
              pieces={c.pieces}
              depth={c.depth}
              label={fmt(copy.common.by, { name: c.author })}
            />
            <figcaption className="text-xs text-ink-soft">
              u/{c.author} ·{' '}
              {fmt(copy.pick.attempts, { n: c.attempts, f: c.finds })}
            </figcaption>
          </figure>
        ))}
      </div>
      {day.cursed !== null && (
        <p className="mt-2 text-sm text-hibiscus">
          {copy.boards.cursed}: u/{day.cursed.author} ·{' '}
          {fmt(copy.pick.attempts, {
            n: day.cursed.attempts,
            f: day.cursed.finds,
          })}
        </p>
      )}
    </section>
  );
};

const Hall = () => {
  const [data, setData] = useState<HallResponse | null>(null);
  const [err, setErr] = useState(false);
  useEffect(() => {
    let live = true;
    get<HallResponse>('/hall').then(
      (d) => live && setData(d),
      () => live && setErr(true)
    );
    return () => {
      live = false;
    };
  }, []);
  if (err) return <ErrorState message={copy.err.network} />;
  if (data === null) return <Loading />;
  if (data.days.length === 0)
    return <p className="p-6 text-center text-seafoam">{copy.boards.empty}</p>;
  return (
    <div className="flex flex-col gap-3">
      {data.days.map((d) => (
        <HallDayCard key={d.day} day={d} />
      ))}
    </div>
  );
};

export const Boards = () => {
  const app = useApp();
  const [tab, setTab] = useState<Tab>('goldDay');
  return (
    <div className="mx-auto flex w-full max-w-[520px] flex-col gap-3 p-3">
      <SrTitle>{copy.result.boards}</SrTitle>
      <Tabs tabs={TABS} value={tab} onChange={setTab} />
      {tab === 'hall' ? <Hall /> : <Board key={tab} kind={tab} />}
      <Button
        kind="quiet"
        className="text-foam"
        onClick={() => app.go({ k: 'result' })}
      >
        {copy.boards.back}
      </Button>
    </div>
  );
};
