// What every screen can reach: the day's init data, its island, navigation and announcements.
import { createContext, useContext } from 'react';
import type {
  ChartPublic,
  HuntStartResponse,
  InitResponse,
  PickSlot,
  Reveal,
} from '../shared/api.ts';
import type { Grade } from '../shared/chart.ts';
import type { Depth, Island, Tile } from '../shared/types.ts';

export type LastHunt = { chart: ChartPublic; reveal: Reveal };
export type MyChest = { depth: Depth; grade: Grade | null };

export type Screen =
  | { k: 'dispatch' }
  | { k: 'pick' }
  | { k: 'hunt'; start: HuntStartResponse; chart: ChartPublic; slot: PickSlot }
  | { k: 'reveal'; chart: ChartPublic; reveal: Reveal; holes: Tile[] }
  | { k: 'bury' }
  | { k: 'chart'; at: Tile; depth: Depth }
  | { k: 'result' }
  | { k: 'boards' };

export type App = {
  init: InitResponse;
  island: Island;
  go: (s: Screen) => void;
  refresh: () => Promise<void>;
  announce: (text: string) => void;
  lastHunt: LastHunt | null;
  setLastHunt: (h: LastHunt) => void;
  myChest: MyChest | null;
  setMyChest: (c: MyChest) => void;
  challenge: { chartId: string } | null;
};

export const AppContext = createContext<App | null>(null);

export const useApp = (): App => {
  const a = useContext(AppContext);
  if (a === null) throw new Error('useApp outside AppContext');
  return a;
};
