// Live activity messages (COM-5.1). Counts only: no names, ids or positions travel on the channel.

export type LiveKind = 'found' | 'buried';
export type LiveMessage = {
  kind: LiveKind;
  counts: { buried: number; found: number; hunts: number };
};

/** One channel per island day. Channel names can't contain ':' (Devvit rule). */
export const liveChannel = (day: string): string =>
  `day-${day.replaceAll('-', '')}`;
