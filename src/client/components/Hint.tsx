// A one-line hint on a parchment slip, dismissed by tapping it (UI-4.3).
import type { HintKey } from '../lib/hints.ts';
import { useHint } from '../lib/hints.ts';
import { copy } from '../copy.ts';

export const Hint = ({
  k,
  className = '',
}: {
  k: HintKey;
  className?: string;
}) => {
  const h = useHint(k);
  if (!h.show) return null;
  return (
    <button
      type="button"
      onClick={h.done}
      className={`anim-rise parchment min-h-11 w-full rounded-[6px] px-4 py-2 text-left text-sm text-ink ${className}`}
    >
      <span aria-hidden className="mr-2 font-display text-seal">
        ✦
      </span>
      {copy.hint[k]}
    </button>
  );
};
