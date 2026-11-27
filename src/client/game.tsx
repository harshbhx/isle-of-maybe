// Expanded-mode placeholder until the game screens (M3) land.
import './index.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

export const App = () => (
  <main className="flex min-h-screen flex-col items-center justify-center gap-2 bg-[#14202B] p-6 text-center text-[#F3E6C8]">
    <h1 className="text-3xl font-bold">Isle of Maybe</h1>
    <p className="text-base text-[#A9B4BF]">
      The island is still being charted. Come back soon.
    </p>
  </main>
);

const root = document.getElementById('root');
if (root) {
  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>
  );
}
