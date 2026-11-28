// Margin notes (CHART-2.7): the only words a player can add to a chart, picked from this fixed
// list. Ids are stored; the server rejects anything else. No free text anywhere.

export const NOTES = {
  steps: 'Count your steps.',
  trust: 'Trust the palm.',
  closer: 'Closer than it looks.',
  coast: 'Follow the coast.',
  rocks: 'Mind the rocks.',
  wreck: 'Start at the wreck.',
  north: 'Keep north of the hut.',
  dig: 'Dig twice, swear once.',
  honest: 'Honest map. Mostly.',
  sorry: 'Sorry about the X.',
  luck: 'Good luck, sailor.',
  cursed: 'This map is cursed.',
} as const;

export type NoteId = keyof typeof NOTES;
export const NOTE_IDS: readonly NoteId[] = [
  'steps',
  'trust',
  'closer',
  'coast',
  'rocks',
  'wreck',
  'north',
  'dig',
  'honest',
  'sorry',
  'luck',
  'cursed',
];

export const asNoteId = (v: unknown): NoteId | null =>
  NOTE_IDS.find((n) => n === v) ?? null;
