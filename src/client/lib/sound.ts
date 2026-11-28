// Generated sound effects (UI-5.2): dig, coin and quill, made with Web Audio at play time (no
// audio files, no network). Off by default; the player's choice is remembered in this browser.
import { flag } from './hints.ts';

export type Sfx = 'dig' | 'coin' | 'quill';

let ctx: AudioContext | null = null;
let on = flag.get('sound') === '1';

export const soundOn = (): boolean => on;
export const setSound = (v: boolean): void => {
  on = v;
  flag.set('sound', v ? '1' : '0');
};

const audio = (): AudioContext | null => {
  if (!on) return null;
  try {
    ctx ??= new AudioContext();
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
};

const noise = (a: AudioContext, seconds: number): AudioBufferSourceNode => {
  const buf = a.createBuffer(
    1,
    Math.ceil(a.sampleRate * seconds),
    a.sampleRate
  );
  const data = buf.getChannelData(0);
  // A fixed pattern is fine for a crunch; it only has to sound like sand.
  let x = 12345;
  for (let i = 0; i < data.length; i++) {
    x = (x * 1103515245 + 12345) & 0x7fffffff;
    data[i] = (x / 0x7fffffff) * 2 - 1;
  }
  const src = a.createBufferSource();
  src.buffer = buf;
  return src;
};

const envelope = (
  a: AudioContext,
  peak: number,
  attack: number,
  release: number
): GainNode => {
  const g = a.createGain();
  const t = a.currentTime;
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(peak, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + attack + release);
  g.connect(a.destination);
  return g;
};

export const play = (s: Sfx): void => {
  const a = audio();
  if (a === null) return;
  if (s === 'dig') {
    const src = noise(a, 0.25);
    const f = a.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 900;
    src.connect(f).connect(envelope(a, 0.5, 0.005, 0.22));
    src.start();
  } else if (s === 'coin') {
    for (const [i, hz] of [988, 1319].entries()) {
      const o = a.createOscillator();
      o.type = 'triangle';
      o.frequency.value = hz;
      const g = a.createGain();
      const t = a.currentTime + i * 0.08;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.25, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
      o.connect(g).connect(a.destination);
      o.start(t);
      o.stop(t + 0.32);
    }
  } else {
    const src = noise(a, 0.12);
    const f = a.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = 3200;
    f.Q.value = 2;
    src.connect(f).connect(envelope(a, 0.18, 0.01, 0.1));
    src.start();
  }
};
