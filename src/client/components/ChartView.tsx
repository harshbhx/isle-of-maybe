// A chart on parchment (docs/03-DESIGN.md §7): the true coastline and dock pre-printed, then only
// the chart's own stamps, path and X. Used for pick cards, the hunt overlay, the editor and the Hall.
import { useMemo, type ReactNode, type SVGProps } from 'react';
import {
  COMPASS_GLYPH,
  DOCK_GLYPH,
  GLYPH_BOX,
  LANDMARK_GLYPHS,
  X_GLYPH,
  type Glyph,
} from '../../shared/glyphs.ts';
import type { ChartPiece, Depth, Island } from '../../shared/types.ts';
import { CHART_PX, coastPath, px, strokePath } from '../lib/geom.ts';

export const GlyphAt = ({
  glyph,
  x,
  y,
  size,
  color,
  width = 2,
}: {
  glyph: Glyph;
  x: number;
  y: number;
  size: number;
  color: string;
  width?: number;
}) => {
  const k = size / GLYPH_BOX;
  return (
    <g>
      {glyph.strokes.map((s, i) => (
        <path
          key={i}
          d={strokePath(s, x - size / 2, y - size / 2, k)}
          fill="none"
          stroke={color}
          strokeWidth={width}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
    </g>
  );
};

export const Pieces = ({
  pieces,
  faded = false,
}: {
  pieces: readonly ChartPiece[];
  faded?: boolean;
}) => (
  <g opacity={faded ? 0.5 : 1}>
    {pieces.map((p, i) =>
      p.k === 'path' ? (
        <polyline
          key={i}
          points={p.pts.map((t) => `${px(t.x)},${px(t.y)}`).join(' ')}
          fill="none"
          stroke="#2B2118"
          strokeWidth={2.5}
          strokeDasharray="4 4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : null
    )}
    {pieces.map((p, i) =>
      p.k === 'stamp' ? (
        <GlyphAt
          key={i}
          glyph={LANDMARK_GLYPHS[p.t]}
          x={px(p.x)}
          y={px(p.y)}
          size={22}
          color="#2B2118"
          width={1.8}
        />
      ) : null
    )}
    {pieces.map((p, i) =>
      p.k === 'x' ? (
        <GlyphAt
          key={i}
          glyph={X_GLYPH}
          x={px(p.x)}
          y={px(p.y)}
          size={24}
          color="#9E2A22"
          width={4}
        />
      ) : null
    )}
  </g>
);

/** Original wax seal: a red disc with an anchor (Old Captain charts). */
export const Seal = ({ x, y }: { x: number; y: number }) => (
  <g transform={`translate(${x} ${y})`} aria-hidden>
    <circle r="18" fill="#9E2A22" />
    <circle r="14" fill="none" stroke="#7a1f19" strokeWidth="1.5" />
    <path
      d="M0 -8v15M-6 -3h12M-8 3c2 5 6 6 8 6s6-1 8-6"
      fill="none"
      stroke="#F3E6C8"
      strokeWidth="2"
      strokeLinecap="round"
    />
    <circle cy="-10" r="2.5" fill="none" stroke="#F3E6C8" strokeWidth="1.8" />
  </g>
);

type Props = {
  island: Island;
  pieces: readonly ChartPiece[];
  depth?: Depth;
  captain?: boolean;
  label: string;
  className?: string;
  children?: ReactNode;
  svgProps?: SVGProps<SVGSVGElement>;
  /** Hide the player's pieces (an empty parchment for the editor). */
  bare?: boolean;
};

export const ChartView = ({
  island,
  pieces,
  depth,
  captain = false,
  label,
  className = '',
  children,
  svgProps,
  bare = false,
}: Props) => {
  const coast = useMemo(() => coastPath(island), [island]);
  const dots =
    depth === 'deep' ? 3 : depth === 'buried' ? 2 : depth === 'shallow' ? 1 : 0;
  return (
    <svg
      viewBox={`0 0 ${CHART_PX} ${CHART_PX}`}
      role="img"
      aria-label={label}
      className={`block h-auto w-full select-none ${className}`}
      {...svgProps}
    >
      <defs>
        <pattern
          id="sea-hatch"
          width="24"
          height="14"
          patternUnits="userSpaceOnUse"
        >
          <path
            d="M2 7h10"
            stroke="#C9B58C"
            strokeWidth="1.2"
            strokeLinecap="round"
          />
          <path
            d="M14 0h8M14 14h8"
            stroke="#C9B58C"
            strokeWidth="1.2"
            strokeLinecap="round"
          />
        </pattern>
      </defs>
      <rect width={CHART_PX} height={CHART_PX} fill="#F3E6C8" />
      <rect
        x="6"
        y="6"
        width={CHART_PX - 12}
        height={CHART_PX - 12}
        fill="url(#sea-hatch)"
        stroke="#5C4A36"
        strokeWidth="1.5"
      />
      <path
        d={coast}
        fill="#E4D2A8"
        fillRule="evenodd"
        stroke="#2B2118"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <GlyphAt
        glyph={DOCK_GLYPH}
        x={px(island.dock.x)}
        y={px(island.dock.y)}
        size={14}
        color="#2B2118"
        width={1.6}
      />
      <GlyphAt
        glyph={COMPASS_GLYPH}
        x={CHART_PX - 30}
        y={32}
        size={36}
        color="#5C4A36"
        width={1.4}
      />
      {dots > 0 && (
        <g aria-hidden>
          {[0, 1, 2].map((i) => (
            <circle
              key={i}
              cx={20 + i * 13}
              cy={20}
              r={4.5}
              fill={i < dots ? '#2B2118' : 'none'}
              stroke="#2B2118"
              strokeWidth="1.2"
              opacity={i < dots ? 1 : 0.35}
            />
          ))}
        </g>
      )}
      {!bare && <Pieces pieces={pieces} />}
      {captain && <Seal x={CHART_PX - 30} y={CHART_PX - 30} />}
      {children}
    </svg>
  );
};
