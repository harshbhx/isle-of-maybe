// The coach (ADV-9.1, ADV-9.2): one short line per step, the step number and progress dots, an
// optional "Got it" for steps that only explain, and a way out at every step.
import { copy, fmt } from '../copy.ts';

export const Coach = ({
  step,
  total,
  text,
  onNext,
  onSkip,
}: {
  step: number;
  total: number;
  text: string;
  onNext?: () => void;
  onSkip: () => void;
}) => (
  <div
    className="parchment anim-rise flex flex-col gap-2 rounded-[8px] px-3 py-2 text-ink"
    role="status"
    aria-live="polite"
  >
    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-ink-soft">
      <span>{fmt(copy.coach.step, { n: step, t: total })}</span>
      <span className="flex gap-1" aria-hidden>
        {Array.from({ length: total }, (_, i) => (
          <span
            key={i}
            className={`h-1.5 w-4 rounded-full ${i < step ? 'bg-mango' : 'bg-ink/15'}`}
          />
        ))}
      </span>
      <button
        type="button"
        onClick={onSkip}
        className="ml-auto min-h-8 px-1 normal-case tracking-normal text-ink-soft underline"
      >
        {copy.coach.skip}
      </button>
    </div>
    <p className="text-[15px] leading-snug">{text}</p>
    {onNext !== undefined && (
      <button
        type="button"
        onClick={onNext}
        className="self-start rounded-[6px] bg-mango px-4 py-2 text-sm font-semibold text-ink shadow-[0_2px_0_rgba(43,29,18,0.35)]"
      >
        {copy.coach.next}
      </button>
    )}
  </div>
);
