// One-time hints (UI-4.3): each shows once per browser, at the moment it applies.
import { useCallback, useState } from 'react';

export type HintKey = 'pick' | 'hunt' | 'dig' | 'bury' | 'chart';
const KEY = 'iom:hints';

const read = (): Set<string> => {
  try {
    const v: unknown = JSON.parse(window.localStorage.getItem(KEY) ?? '[]');
    return new Set(
      Array.isArray(v) ? v.filter((x) => typeof x === 'string') : []
    );
  } catch {
    return new Set();
  }
};

/** Count a hint as seen without showing it, when the player has already done what it says. */
export const markHintSeen = (key: HintKey): void => {
  try {
    const s = read();
    if (s.has(key)) return;
    s.add(key);
    window.localStorage.setItem(KEY, JSON.stringify([...s]));
  } catch {
    // Storage can be unavailable in some webviews; the hint may show once more.
  }
};

export const useHint = (key: HintKey): { show: boolean; done: () => void } => {
  const [show, setShow] = useState(() => !read().has(key));
  const done = useCallback(() => {
    setShow(false);
    try {
      const s = read();
      s.add(key);
      window.localStorage.setItem(KEY, JSON.stringify([...s]));
    } catch {
      // Storage can be unavailable in some webviews; the hint just shows again next time.
    }
  }, [key]);
  return { show, done };
};

/** Light per-browser flags (Dispatch seen today, sound on). */
export const flag = {
  get: (k: string): string | null => {
    try {
      return window.localStorage.getItem(`iom:${k}`);
    } catch {
      return null;
    }
  },
  set: (k: string, v: string): void => {
    try {
      window.localStorage.setItem(`iom:${k}`, v);
    } catch {
      // Not critical.
    }
  },
};
