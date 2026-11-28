// The logo (UI-2.5, D25) as plain path data in a 64-unit box, shared by the client mark and the
// catalog art: an island from above, a dotted path curled into a question mark, and the X as its dot.

export const LOGO_BOX = 64;

/** Island outline (sand), with a ring of shallows drawn around it by the caller when it wants one. */
export const LOGO_ISLAND =
  'M9 33C9.2 28.9 10 25.2 12 22C14 18.8 17.7 14.7 21 13.5C24.3 12.3 28.7 15.7 32 15C35.3 14.3 37.8 9.7 41 9.5C44.2 9.3 48.7 11.4 51 14C53.3 16.6 55.4 22 55 25C54.6 28 48.8 29.3 48.5 32C48.2 34.7 53.8 37.8 53.5 41C53.2 44.2 49.9 49.2 47 51.5C44.1 53.8 39.2 55.2 36 55C32.8 54.8 30.5 50.5 27.5 50.5C24.5 50.5 20.8 55.7 18 55C15.2 54.3 12 50.2 10.5 46.5C9 42.8 8.8 37.1 9 33Z';

/** The dotted path: the question mark's hook and stem. */
export const LOGO_PATH = 'M24.5 26C24.5 18.5 39.5 18 39.5 26C39.5 31.5 32 32 32 38';

/** The X, the question mark's dot: two strokes. */
export const LOGO_X: readonly (readonly [number, number, number, number])[] = [
  [28.8, 42.3, 35.2, 48.7],
  [35.2, 42.3, 28.8, 48.7],
];
