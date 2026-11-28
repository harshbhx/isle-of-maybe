// The game shell: loads the day, keeps the current screen, and gives screens the shared context.
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { InitResponse } from '../shared/api.ts';
import { generateIsland } from '../shared/island.ts';
import {
  AppContext,
  type App as AppValue,
  type LastHunt,
  type MyChest,
  type Screen,
} from './app-context.ts';
import { Banner, ErrorState, Loading, TopBar } from './components/ui.tsx';
import { copy, fmt } from './copy.ts';
import { ApiFailure, get } from './lib/api.ts';
import { flag } from './lib/hints.ts';
import { go as navigate, shareData } from './lib/platform.ts';

import { Boards } from './screens/Boards.tsx';
import { Bury } from './screens/Bury.tsx';
import { ChartEditor } from './screens/ChartEditor.tsx';
import { Dispatch } from './screens/Dispatch.tsx';
import { Hunt } from './screens/Hunt.tsx';
import { Pick } from './screens/Pick.tsx';
import { Result } from './screens/Result.tsx';
import { Reveal } from './screens/Reveal.tsx';

/** Today's post, from an older day's post (DAY-3.3, W12). */
const openPost = (postId: string): void =>
  navigate(`https://www.reddit.com/comments/${postId.replace(/^t3_/, '')}`);

/** A share link's payload is untrusted; only a well-formed challenge is kept (COM-2.4, HUNT-1.4). */
const readChallenge = (): { chartId: string } | null => {
  const raw = shareData();
  if (raw === undefined) return null;
  try {
    const v: unknown = JSON.parse(raw);
    if (
      typeof v === 'object' &&
      v !== null &&
      'type' in v &&
      v.type === 'challenge' &&
      'chartId' in v &&
      typeof v.chartId === 'string' &&
      /^[\w-]{1,80}$/.test(v.chartId)
    ) {
      return { chartId: v.chartId };
    }
  } catch {
    return null;
  }
  return null;
};

export const App = () => {
  const [init, setInit] = useState<InitResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [screen, setScreen] = useState<Screen>({ k: 'pick' });
  const [lastHunt, setLastHunt] = useState<LastHunt | null>(null);
  const [myChest, setMyChest] = useState<MyChest | null>(null);
  const [said, setSaid] = useState('');
  const challenge = useMemo(() => readChallenge(), []);
  const first = useRef(true);

  const apply = useCallback(
    (next: InitResponse) => {
      setInit(next);
      setError(null);
      if (first.current) {
        first.current = false;
        // Dispatch first on a new day with news, or once as a sample for first-timers (DAY-5.1, DAY-5.2).
        const news =
          next.dispatch.charts.length > 0 &&
          flag.get(`dispatch:${next.today}`) === null;
        const sample =
          next.user.loggedIn &&
          next.user.chest === null &&
          next.dispatch.charts.length === 0 &&
          flag.get('sampleSeen') === null;
        if (challenge === null && (news || sample))
          setScreen({ k: 'dispatch' });
        else if (next.user.huntsLeft === 0 && challenge === null)
          setScreen({ k: 'result' });
      }
    },
    [challenge]
  );
  const fail = useCallback((e: unknown) => {
    setError(
      e instanceof ApiFailure && e.code === 'not_found'
        ? copy.err.generic
        : copy.err.network
    );
  }, []);
  const refresh = useCallback(
    () => get<InitResponse>('/init').then(apply, fail),
    [apply, fail]
  );
  useEffect(() => {
    let live = true;
    get<InitResponse>('/init').then(
      (n) => live && apply(n),
      (e: unknown) => live && fail(e)
    );
    return () => {
      live = false;
    };
  }, [apply, fail]);

  const seed = init?.island.seed;
  const modifier = init?.island.modifier;
  const island = useMemo(
    () =>
      seed === undefined || modifier === undefined
        ? null
        : generateIsland(seed, modifier),
    [seed, modifier]
  );
  const go = useCallback((s: Screen) => {
    setScreen(s);
    window.scrollTo(0, 0);
  }, []);

  if (error !== null && init === null)
    return <ErrorState message={error} onRetry={() => void refresh()} />;
  if (init === null || island === null) return <Loading />;

  const value: AppValue = {
    init,
    island,
    go,
    refresh,
    announce: setSaid,
    lastHunt,
    setLastHunt,
    myChest,
    setMyChest,
    challenge,
  };
  let body: ReactNode;
  switch (screen.k) {
    case 'pick':
      body = <Pick />;
      break;
    case 'hunt':
      body = (
        <Hunt
          key={screen.start.huntId}
          start={screen.start}
          chart={screen.chart}
          slot={screen.slot}
        />
      );
      break;
    case 'reveal':
      body = (
        <Reveal
          chart={screen.chart}
          reveal={screen.reveal}
          holes={screen.holes}
        />
      );
      break;
    case 'dispatch':
      body = (
        <Dispatch
          sample={init.dispatch.charts.length === 0}
          onDone={() => {
            flag.set(`dispatch:${init.today}`, '1');
            flag.set('sampleSeen', '1');
            go({ k: init.user.huntsLeft > 0 ? 'pick' : 'result' });
          }}
        />
      );
      break;
    case 'result':
      body = <Result />;
      break;
    case 'boards':
      body = <Boards />;
      break;
    case 'bury':
      body = <Bury />;
      break;
    case 'chart':
      body = <ChartEditor at={screen.at} depth={screen.depth} />;
      break;
  }

  return (
    <AppContext.Provider value={value}>
      <div className="mx-auto flex h-full max-w-[720px] flex-col">
        <TopBar
          dayLabel={fmt(copy.splash.day, {
            n: init.dayNumber,
            island: init.island.name,
          })}
          streak={init.user.streak}
          gold={init.user.gold}
        />
        {!init.isToday && init.todayPost !== null && (
          <div className="px-3 pb-2">
            <Banner
              onClick={() => init.todayPost && openPost(init.todayPost.postId)}
            >
              {fmt(copy.splash.oldDay, {
                n: init.dayNumber,
                today: init.todayPost.dayNumber,
              })}
            </Banner>
          </div>
        )}
        <main className="min-h-0 flex-1 overflow-y-auto">{body}</main>
      </div>
      <div className="sr-only" aria-live="assertive" role="status">
        {said}
      </div>
    </AppContext.Provider>
  );
};
