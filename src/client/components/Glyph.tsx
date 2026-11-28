// One ink glyph from the shared stroke data (src/shared/glyphs.ts), so stamps, the island legend
// and the server's share image all draw the same marks (UI-2.3).
import type { Glyph as GlyphData } from '../../shared/glyphs.ts';
import { GLYPH_BOX } from '../../shared/glyphs.ts';
import { strokePath } from '../lib/geom.ts';

type Props = {
  glyph: GlyphData;
  size?: number;
  color?: string;
  /** Fill the glyph's closed shapes (island version). */
  fill?: string;
  label?: string;
  className?: string;
};

export const Glyph = ({
  glyph,
  size = 24,
  color = 'currentColor',
  fill,
  label,
  className,
}: Props) => (
  <svg
    width={size}
    height={size}
    viewBox={`0 0 ${GLYPH_BOX} ${GLYPH_BOX}`}
    className={className}
    role={label === undefined ? undefined : 'img'}
    aria-label={label}
    aria-hidden={label === undefined ? true : undefined}
  >
    {fill !== undefined &&
      (glyph.fills ?? []).map((f, i) => (
        <path key={`f${i}`} d={`${strokePath(f)}Z`} fill={fill} />
      ))}
    {glyph.strokes.map((s, i) => (
      <path
        key={i}
        d={strokePath(s)}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    ))}
  </svg>
);
