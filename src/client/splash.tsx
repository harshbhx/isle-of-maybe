// Inline splash placeholder until the real splash (T42) lands. Buttons only: no scroll capture.
import './index.css';

import { requestExpandedMode } from '@devvit/web/client';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

export const Splash = () => (
  <main className="flex min-h-screen flex-col items-center justify-center gap-3 bg-[#14202B] p-6 text-center text-[#F3E6C8]">
    <h1 className="text-3xl font-bold">Isle of Maybe</h1>
    <p className="text-base text-[#A9B4BF]">
      Bury it. Chart it. Trust a stranger&apos;s map.
    </p>
    <button
      className="mt-2 h-12 rounded-md bg-[#E8B341] px-6 font-semibold text-[#14202B]"
      onClick={(e) => requestExpandedMode(e.nativeEvent, 'game')}
    >
      Set sail
    </button>
  </main>
);

const root = document.getElementById('root');
if (root) {
  createRoot(root).render(
    <StrictMode>
      <Splash />
    </StrictMode>
  );
}
