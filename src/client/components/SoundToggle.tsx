// The sound switch in the top bar (UI-5.2): off until the player turns it on.
import { useState } from 'react';
import { copy } from '../copy.ts';
import { play, setSound, soundOn } from '../lib/sound.ts';

export const SoundToggle = () => {
  const [on, setOn] = useState(soundOn);
  return (
    <button
      type="button"
      aria-pressed={on}
      aria-label={copy.common.sound}
      onClick={() => {
        setSound(!on);
        setOn(!on);
        if (!on) play('coin');
      }}
      className="inline-flex h-11 w-11 items-center justify-center rounded-[6px] text-seafoam hover:text-foam"
    >
      <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden>
        <path d="M3 8h3l4-3v10l-4-3H3z" fill="currentColor" />
        {on ? (
          <path
            d="M13 7a4 4 0 0 1 0 6M15.5 5a7 7 0 0 1 0 10"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        ) : (
          <path
            d="M13 8l4 4M17 8l-4 4"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        )}
      </svg>
    </button>
  );
};
