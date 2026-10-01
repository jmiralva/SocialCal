// Hand-drawn marks for the calendar: tally strokes per person, and (Task 3) the best-day circle.
// Paths are memoized: the calendar re-renders on every drag move and every poll.

export const NUMBER_MODE_AT = 10; // groups this size or larger show a number instead of tallies

export const isNumberMode = (total: number) => total >= NUMBER_MODE_AT;

export function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

// mulberry32: small seeded PRNG so a day's wobble is the same on every render.
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type Tally = { d: string; width: number };

const GROUP_W = 27;
const tallies = new Map<string, Tally>();
const f = (n: number) => n.toFixed(1);

export function tally(count: number, seed: string): Tally | null {
  if (count <= 0) return null;
  const key = `${seed}|${count}`;
  const hit = tallies.get(key);
  if (hit) return hit;
  const r = rng(hash(seed));
  const j = (amount: number) => (r() - 0.5) * amount;
  const groups = Math.ceil(count / 5);
  let d = '';
  for (let g = 0; g < groups; g++) {
    const inGroup = Math.min(5, count - g * 5);
    const gx = 3 + g * GROUP_W;
    for (let i = 0; i < Math.min(inGroup, 4); i++) {
      const x = gx + i * 5;
      d += `M${f(x + j(1.4))} ${f(2 + j(1.2))} Q${f(x + j(1.6))} 8 ${f(x + j(1.4))} ${f(14 + j(1.2))} `;
    }
    if (inGroup === 5) d += `M${f(gx - 2 + j(1))} ${f(12.5 + j(1))} L${f(gx + 19 + j(1))} ${f(3.5 + j(1))} `;
  }
  const result = { d: d.trim(), width: groups * GROUP_W + 2 };
  tallies.set(key, result);
  return result;
}
