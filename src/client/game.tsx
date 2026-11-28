// Expanded mode. Until the game screens land (T45+), this shows the UI kit and the ten glyphs so
// they can be reviewed on a real phone (T40, T41).
import './index.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { LANDMARK_GLYPHS } from '../shared/glyphs.ts';
import { generateIsland } from '../shared/island.ts';
import { LANDMARK_TYPES, type ChartPiece } from '../shared/types.ts';
import { ChartView } from './components/ChartView.tsx';
import { Glyph } from './components/Glyph.tsx';
import {
  Banner,
  Button,
  Card,
  DepthDots,
  ShovelIcon,
  Title,
  TopBar,
} from './components/ui.tsx';
import { copy, fmt } from './copy.ts';

const island = generateIsland('kit-preview', 'clear');
const sample: ChartPiece[] = [
  ...island.landmarks
    .slice(0, 4)
    .map((l): ChartPiece => ({ k: 'stamp', t: l.type, x: l.at.x, y: l.at.y })),
  {
    k: 'path',
    pts: [
      island.dock,
      { x: island.dock.x, y: island.dock.y - 6 },
      { x: island.dock.x + 4, y: island.dock.y - 6 },
    ],
  },
  { k: 'x', x: island.dock.x + 4, y: island.dock.y - 6 },
];

export const Kit = () => (
  <div className="mx-auto flex min-h-full max-w-[520px] flex-col gap-4 p-3 pb-10">
    <TopBar
      dayLabel={fmt(copy.splash.day, { n: 12, island: island.name })}
      streak={4}
      gold={1240}
    />
    <Banner>{copy.mod.fog}</Banner>
    <Card torn>
      <Title>{copy.pick.title}</Title>
      <p className="mt-1 text-ink-soft">{copy.hint.pick}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button kind="gold">{copy.pick.follow}</Button>
        <Button>{copy.hunt.chartOpen}</Button>
        <Button kind="danger">{copy.hunt.report}</Button>
      </div>
      <div className="mt-3 flex items-center gap-4">
        <DepthDots depth="deep" withLabel />
        <span className="inline-flex gap-1 text-ink">
          <ShovelIcon /> <ShovelIcon /> <ShovelIcon used />
        </span>
      </div>
    </Card>
    <Card>
      <h2 className="font-display mb-2 text-[20px]">
        Glyphs at 24 px and 48 px
      </h2>
      <ul className="grid grid-cols-5 gap-3">
        {LANDMARK_TYPES.map((t) => (
          <li
            key={t}
            className="flex flex-col items-center gap-1 text-center text-xs text-ink-soft"
          >
            <Glyph
              glyph={LANDMARK_GLYPHS[t]}
              size={24}
              color="#2B2118"
              label={copy.landmark[t]}
            />
            <Glyph
              glyph={LANDMARK_GLYPHS[t]}
              size={48}
              color="#2B2118"
              fill="#E9D29A"
            />
            {copy.landmark[t]}
          </li>
        ))}
      </ul>
    </Card>
    <Card className="p-2">
      <ChartView
        island={island}
        pieces={sample}
        depth="buried"
        label={fmt(copy.common.by, { name: 'marlin' })}
      />
      <p className="mt-1 text-center text-sm text-ink-soft">
        {fmt(copy.common.byDay, { name: 'marlin', n: 12 })}
      </p>
    </Card>
    <Card className="p-2">
      <ChartView
        island={island}
        pieces={[]}
        depth="shallow"
        captain
        label={copy.common.captainBy}
      />
    </Card>
  </div>
);

const root = document.getElementById('root');
if (root) {
  createRoot(root).render(
    <StrictMode>
      <Kit />
    </StrictMode>
  );
}
