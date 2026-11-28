// Thin wrappers over @devvit/web/client. Each fails softly, so the same build also runs in the
// local preview (tools/preview) where there is no Reddit host.
import {
  connectRealtime,
  context,
  getShareData,
  getWebViewMode,
  navigateTo,
  requestExpandedMode,
  showLoginPrompt,
  showShareSheet,
  showToast,
} from '@devvit/web/client';
import type { LiveMessage } from '../../shared/live.ts';

export const openGame = (e: MouseEvent): void => {
  try {
    requestExpandedMode(e, 'game');
  } catch {
    window.open('game.html', '_self');
  }
};

export const toast = (text: string): void => {
  try {
    showToast(text);
  } catch {
    // The preview shows toasts in-page instead.
  }
};

export const go = (url: string): void => {
  try {
    navigateTo(url);
  } catch {
    // No host to navigate in the preview.
  }
};

/** The subreddit this post lives in, or undefined outside Reddit (COM-2.8). */
export const subredditName = (): string | undefined => {
  try {
    const name = context.subredditName;
    return name !== undefined && /^[A-Za-z0-9_]{2,21}$/.test(name)
      ? name
      : undefined;
  } catch {
    return undefined;
  }
};

export const askLogin = (): void => {
  try {
    showLoginPrompt();
  } catch {
    // No host in the preview.
  }
};

export const share = async (
  title: string,
  text: string,
  data: string
): Promise<void> => {
  try {
    await showShareSheet({ title, text, data });
  } catch {
    // Sharing needs the Reddit host.
  }
};

/** Untrusted: whatever a share link carried (COM-2.4). */
export const shareData = (): string | undefined => {
  try {
    return getShareData();
  } catch {
    return undefined;
  }
};

export const isInline = (): boolean => {
  try {
    return getWebViewMode() === 'inline';
  } catch {
    return false;
  }
};

/** Live counts for the day; returns a disconnect function (COM-5.2). */
export const listen = (
  channel: string,
  onMessage: (m: LiveMessage) => void
): (() => void) => {
  try {
    const conn = connectRealtime<LiveMessage>({ channel, onMessage });
    return () => {
      try {
        void conn.disconnect();
      } catch {
        // Already closed.
      }
    };
  } catch {
    return () => undefined;
  }
};
