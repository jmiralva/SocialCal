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

const circles = new Map<string, string>();

// A loose loop that overshoots its start, like a quick pen circle. aspect = box width / height.
export function circlePath(seed: string, aspect = 1): string {
  const key = `${seed}|${aspect}`;
  const hit = circles.get(key);
  if (hit) return hit;
  const r = rng(hash(`ring${seed}`));
  const w = 100 * aspect;
  const h = 100;
  const start = -2.2 + (r() - 0.5) * 0.4;
  const sweep = Math.PI * 2 + 0.55;
  const steps = 28;
  const pts: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const t = start + (sweep * i) / steps;
    const wobble = 1 + (r() - 0.5) * 0.05 + (i / steps) * 0.06;
    pts.push([w / 2 + Math.cos(t) * (w / 2 - 5) * wobble, h / 2 + Math.sin(t) * (h / 2 - 6) * wobble]);
  }
  let d = `M${f(pts[0][0])} ${f(pts[0][1])}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const mx = (pts[i][0] + pts[i + 1][0]) / 2;
    const my = (pts[i][1] + pts[i + 1][1]) / 2;
    d += ` Q${f(pts[i][0])} ${f(pts[i][1])} ${f(mx)} ${f(my)}`;
  }
  circles.set(key, d);
  return d;
}
