import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwind from '@tailwindcss/vite';
import { devvit } from '@devvit/start/vite';

export default defineConfig({
  plugins: [react(), tailwind(), devvit()],
  // three.js is one lazy chunk (~550 KB raw, ~140 KB gzip) loaded only by the game (UI-7.1).
  build: { chunkSizeWarningLimit: 700 },
});
