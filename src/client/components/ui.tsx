// The small UI kit (docs/15-COMPONENTS.md): buttons, cards, banners, sheets, tabs and the top bar.
// Gold for the one primary action per screen, quiet ink for everything else (docs/03-DESIGN.md §2).
import { useEffect, useRef, type MouseEvent, type ReactNode } from 'react';
import type { Depth } from '../../shared/types.ts';
import { copy, fmt } from '../copy.ts';

type ButtonProps = {
  children: ReactNode;
  onClick?: (e: MouseEvent<HTMLButtonElement>) => void;
  kind?: 'gold' | 'ink' | 'quiet' | 'danger';
  disabled?: boolean;
  className?: string;
  label?: string;
  type?: 'button' | 'submit';
  pressed?: boolean;
};

const KIND: Record<NonNullable<ButtonProps['kind']>, string> = {
  gold: 'bg-gold text-night font-bold shadow-[0_3px_0_#a37a22] active:translate-y-[2px] active:shadow-[0_1px_0_#a37a22]',
  ink: 'bg-transparent text-ink border-2 border-ink/70 hover:bg-ink/5',
  quiet: 'bg-transparent text-current underline-offset-4 hover:underline',
  danger: 'bg-transparent text-seal border-2 border-seal/70 hover:bg-seal/5',
};

export const Button = ({
  children,
  onClick,
  kind = 'ink',
  disabled,
  className = '',
  label,
  type = 'button',
  pressed,
}: ButtonProps) => (
  <button
    type={type}
    onClick={onClick}
    disabled={disabled}
    aria-label={label}
    aria-pressed={pressed}
    className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-[6px] px-5 text-base transition-transform disabled:opacity-45 ${KIND[kind]} ${className}`}
  >
    {children}
  </button>
);

export const Card = ({
  children,
  className = '',
  torn = false,
}: {
  children: ReactNode;
  className?: string;
  torn?: boolean;
}) => (
  <section className={`parchment ${torn ? 'torn' : ''} p-4 ${className}`}>
    {children}
  </section>
);

/** Visually hidden, for screens whose heading is a picture (canvas, tabs). */
export const SrTitle = ({ children }: { children: ReactNode }) => (
  <h1 className="sr-only">{children}</h1>
);

export const Title = ({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) => (
  <h1 className={`font-display text-[26px] leading-tight ${className}`}>
    {children}
  </h1>
);

export const Banner = ({
  children,
  tone = 'night',
  onClick,
}: {
  children: ReactNode;
  tone?: 'night' | 'parchment';
  onClick?: () => void;
}) => {
  const cls = `w-full rounded-[6px] px-4 py-3 text-left text-sm ${tone === 'night' ? 'bg-night-2 text-on-night border border-muted-night/30' : 'parchment'}`;
  return onClick === undefined ? (
    <div className={cls} role="status">
      {children}
    </div>
  ) : (
    <button type="button" className={`${cls} min-h-12`} onClick={onClick}>
      {children}
    </button>
  );
};

/** Depth by dots and word, never colour alone (UI-6.3). */
export const DepthDots = ({
  depth,
  withLabel = false,
}: {
  depth: Depth;
  withLabel?: boolean;
}) => {
  const n = depth === 'deep' ? 3 : depth === 'buried' ? 2 : 1;
  return (
    <span
      className="inline-flex items-center gap-1"
      role="img"
      aria-label={copy.common.depth[depth]}
    >
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          aria-hidden
          className={`inline-block h-2.5 w-2.5 rounded-full border border-current ${i < n ? 'bg-current' : 'opacity-35'}`}
        />
      ))}
      {withLabel && (
        <span className="ml-1 text-sm uppercase tracking-wide">
          {copy.common.depth[depth]}
        </span>
      )}
    </span>
  );
};

export const Loading = () => (
  <div
    className="flex h-full min-h-48 items-center justify-center text-muted-night"
    role="status"
  >
    <span className="anim-fade">{copy.common.loading}</span>
  </div>
);

export const ErrorState = ({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) => (
  <div
    className="flex flex-col items-center gap-3 p-6 text-center"
    role="alert"
  >
    <p className="text-on-night">{message}</p>
    {onRetry && (
      <Button kind="gold" onClick={onRetry}>
        {copy.err.retry}
      </Button>
    )}
  </div>
);

/** Bottom sheet with a scrim; Escape and the scrim close it; focus moves inside (UI-6.1). */
export const Sheet = ({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) => {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    ref.current
      ?.querySelector<HTMLElement>('button, [href], [tabindex]')
      ?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center">
      <button
        type="button"
        aria-label={copy.common.close}
        className="absolute inset-0 bg-night/70 anim-fade"
        onClick={onClose}
      />
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="parchment torn anim-rise relative z-10 w-full max-w-[520px] rounded-b-none p-5 pb-6"
      >
        <h2 className="font-display mb-3 text-[22px]">{title}</h2>
        {children}
      </div>
    </div>
  );
};

export const Tabs = <K extends string>({
  tabs,
  value,
  onChange,
}: {
  tabs: readonly { key: K; label: string }[];
  value: K;
  onChange: (k: K) => void;
}) => (
  <div
    role="tablist"
    className="flex gap-1 overflow-x-auto rounded-[6px] bg-night-2 p-1"
  >
    {tabs.map((t) => (
      <button
        key={t.key}
        role="tab"
        type="button"
        aria-selected={t.key === value}
        onClick={() => onChange(t.key)}
        className={`min-h-11 flex-1 whitespace-nowrap rounded-[4px] px-3 text-sm ${t.key === value ? 'bg-parchment text-ink font-bold' : 'text-muted-night'}`}
      >
        {t.label}
      </button>
    ))}
  </div>
);

/** Day, streak and gold, always visible in the game (W4, docs/03-DESIGN.md §5). */
export const TopBar = ({
  dayLabel,
  streak,
  gold,
  right,
}: {
  dayLabel: string;
  streak: number;
  gold: number;
  right?: ReactNode;
}) => (
  <header className="flex min-h-12 items-center gap-3 px-3 text-sm">
    <span className="font-display truncate text-[18px]">{dayLabel}</span>
    <span
      role="img"
      className="ml-auto inline-flex items-center gap-1 tabular"
      aria-label={fmt(copy.splash.streak, { n: streak })}
    >
      <FlameIcon /> {streak}
    </span>
    <span
      role="img"
      className="inline-flex items-center gap-1 text-gold tabular"
      aria-label={fmt(copy.splash.gold, { n: gold.toLocaleString() })}
    >
      <CoinIcon /> {gold.toLocaleString()}
    </span>
    {right}
  </header>
);

export const CoinIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden>
    <circle
      cx="8"
      cy="8"
      r="6.5"
      fill="#E8B341"
      stroke="#a37a22"
      strokeWidth="1.5"
    />
    <path
      d="M8 4.5v7M5.8 6.2h3.4a1.4 1.4 0 0 1 0 2.8H6.8a1.4 1.4 0 0 0 0 2.8h3.4"
      fill="none"
      stroke="#7a5a14"
      strokeWidth="1.2"
      strokeLinecap="round"
    />
  </svg>
);

export const FlameIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden>
    <path
      d="M8 1.5c1 2.5 4 4 4 7.5a4 4 0 0 1-8 0c0-1.8 1-3 2-4 0 1.5.6 2.5 1.5 2.8C7 5.5 7.4 3.4 8 1.5Z"
      fill="#E8B341"
      stroke="#a37a22"
      strokeWidth="1"
      strokeLinejoin="round"
    />
  </svg>
);

export const ShovelIcon = ({ used = false }: { used?: boolean }) => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 16 16"
    aria-hidden
    className={used ? 'opacity-30' : ''}
  >
    <path
      d="M10.5 2.5l3 3M12 4l-6 6M4.5 8.5l3 3-2 2.5c-1 1-3 1-3.5.5s-.5-2.5.5-3.5Z"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);
