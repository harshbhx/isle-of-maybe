// Plays the game clips only while they're on screen, and never under reduced motion (SHIP-9.2).
// Without this script, each clip keeps its poster and its own play button.
(() => {
  const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clips = document.querySelectorAll('video[data-play]');
  if (still || !('IntersectionObserver' in window)) return;
  const seen = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        const v = e.target;
        if (e.isIntersecting) {
          v.preload = 'auto';
          v.play().catch(() => undefined);
        } else v.pause();
      }
    },
    { threshold: 0.35 }
  );
  for (const v of clips) {
    v.removeAttribute('controls');
    seen.observe(v);
  }
})();
