// The Isle of Maybe mark (UI-2.5): island, question-mark path, X. Decorative unless labelled.
import { LOGO_BOX, LOGO_ISLAND, LOGO_PATH, LOGO_X } from '../../shared/logo.ts';

export const Logo = ({
  size = 40,
  label,
  className,
}: {
  size?: number;
  label?: string;
  className?: string;
}) => (
  <svg
    width={size}
    height={size}
    viewBox={`0 0 ${LOGO_BOX} ${LOGO_BOX}`}
    className={className}
    role={label === undefined ? undefined : 'img'}
    aria-label={label}
    aria-hidden={label === undefined ? true : undefined}
  >
    {/* Shallows first, then sand, so the island sits in a ring of lighter water. */}
    <path
      d={LOGO_ISLAND}
      fill="#4CC3B9"
      stroke="#4CC3B9"
      strokeWidth="7"
      strokeLinejoin="round"
    />
    <path
      d={LOGO_ISLAND}
      fill="#F2D99B"
      stroke="#2B1D12"
      strokeWidth="2.5"
      strokeLinejoin="round"
    />
    <path
      d={LOGO_PATH}
      fill="none"
      stroke="#2B1D12"
      strokeWidth="2.8"
      strokeLinecap="round"
      strokeDasharray="0.1 5"
    />
    {LOGO_X.map(([x1, y1, x2, y2], i) => (
      <line
        key={i}
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke="#B8233F"
        strokeWidth="4.5"
        strokeLinecap="round"
      />
    ))}
  </svg>
);
