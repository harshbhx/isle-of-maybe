// W8 · Ink check (CHART-3.3, CHART-3.4): your chart over the true island for 3 seconds, then the
// grade stamps down with its line.
import { useEffect, useMemo, useState } from 'react';
import type { ChartSubmitResponse } from '../../shared/api.ts';
import type { ChartPiece, Tile } from '../../shared/types.ts';
import { useApp } from '../app-context.ts';
import { Pieces } from '../components/ChartView.tsx';
import { Button, Card, SrTitle } from '../components/ui.tsx';
import { copy, fmt } from '../copy.ts';
import { IslandCanvas } from '../island/IslandCanvas.tsx';
import { CHART_PX } from '../lib/geom.ts';

export const OVERLAY_MS = 3000;

export const InkCheck = ({
  pieces,
  chest,
  result,
}: {
  pieces: ChartPiece[];
  chest: Tile;
  result: ChartSubmitResponse;
}) => {
  const app = useApp();
  const [graded, setGraded] = useState(false);
  useEffect(() => {
    const id = window.setTimeout(() => setGraded(true), OVERLAY_MS);
    return () => window.clearTimeout(id);
  }, []);
  useEffect(() => {
    if (graded) app.announce(`${copy.ink[result.ink.grade]}.`);
  }, [graded, app, result.ink.grade]);

  const markers = useMemo(
    () => [{ at: chest, kind: 'chest' as const }],
    [chest]
  );
  const scene = useMemo(
    () => ({
      island: app.island,
      seen: null,
      sailor: null,
      footprints: [],
      holes: [],
      route: [],
      markers,
      link: false,
      highlight: null,
    }),
    [app.island, markers]
  );
  const grade = result.ink.grade;
  const d = Math.round(result.ink.xError);
  return (
    <div className="mx-auto flex w-full max-w-[560px] flex-col gap-3 p-3">
      <SrTitle>{copy.chart.title}</SrTitle>
      <div className="relative aspect-square w-full overflow-hidden rounded-[6px]">
        <IslandCanvas
          scene={scene}
          zoom={0}
          focus={null}
          label={copy.chart.title}
        />
        <svg
          viewBox={`0 0 ${CHART_PX} ${CHART_PX}`}
          className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.85]"
          aria-hidden
        >
          <Pieces pieces={pieces} />
        </svg>
        {graded && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div
              className={`anim-thud border-4 px-6 py-2 font-display text-[40px] uppercase tracking-wider ${grade === 'cursed' ? 'border-hibiscus text-hibiscus' : 'border-ink text-ink'} bg-paper/90`}
            >
              {copy.ink[grade]}
            </div>
          </div>
        )}
      </div>
      {graded && (
        <Card className="anim-rise flex flex-col gap-3">
          <p>
            {grade === 'sharp' ? copy.ink.lineSharp : fmt(copy.ink.line, { d })}
          </p>
          <Button
            kind="gold"
            className="w-full"
            onClick={() => app.go({ k: 'result' })}
          >
            {copy.ink.continue}
          </Button>
        </Card>
      )}
    </div>
  );
};
