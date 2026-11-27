// ISO week keys for the weekly gold board (Mon–Sun, UTC).

export const weekKey = (day: string): string => {
  const t = new Date(`${day}T00:00:00Z`);
  const dow = (t.getUTCDay() + 6) % 7; // Monday = 0
  t.setUTCDate(t.getUTCDate() - dow + 3); // the week's Thursday decides its ISO year
  const year = t.getUTCFullYear();
  const dayOfYear =
    Math.round((t.getTime() - Date.UTC(year, 0, 1)) / 86_400_000) + 1;
  return `w${year}-${String(Math.floor((dayOfYear - 1) / 7) + 1).padStart(2, '0')}`;
};
