// Community island names (DAY-6.2): the top reply under the day's sticky can name tomorrow's
// island if it is 3–24 letters and spaces, isn't removed and passes the banned-word list.

export type NameReply = {
  author: string;
  body: string;
  score: number;
  removed: boolean;
};

/** Lower-case roots that disqualify a name anywhere inside it. Kept short; Reddit removal and
 *  AutoModerator catch the rest, and removed replies never count. */
const BANNED = [
  'fuck',
  'shit',
  'cunt',
  'bitch',
  'dick',
  'cock',
  'pussy',
  'penis',
  'vagina',
  'tits',
  'boob',
  'anal',
  'anus',
  'porn',
  'sex',
  'cum',
  'rape',
  'nazi',
  'hitler',
  'kkk',
  'nigg',
  'fag',
  'retard',
  'tranny',
  'spic',
  'chink',
  'kike',
  'whore',
  'slut',
  'bastard',
  'piss',
  'wank',
  'twat',
  'reddit',
];

/** The cleaned name, or null if it can't be used. */
export const cleanName = (body: string): string | null => {
  const t = body.trim().replace(/\s+/g, ' ');
  if (!/^[A-Za-z ]{3,24}$/.test(t)) return null;
  const flat = t.toLowerCase().replace(/ /g, '');
  if (BANNED.some((w) => flat.includes(w))) return null;
  return t
    .split(' ')
    .map((w) => (w === '' ? w : w[0]?.toUpperCase() + w.slice(1).toLowerCase()))
    .join(' ');
};

/** Highest-scoring usable reply; ties go to the earlier reply (input order). */
export const pickName = (
  replies: readonly NameReply[]
): { name: string; by: string } | null => {
  let best: { name: string; by: string; score: number } | null = null;
  for (const r of replies) {
    if (r.removed || r.author === '' || r.author === '[deleted]') continue;
    const name = cleanName(r.body);
    if (name === null) continue;
    if (best === null || r.score > best.score)
      best = { name, by: r.author, score: r.score };
  }
  return best === null ? null : { name: best.name, by: best.by };
};
