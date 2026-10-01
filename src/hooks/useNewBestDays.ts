import { useEffect, useLayoutEffect, useRef, useState } from 'preact/hooks';

const NONE: ReadonlySet<string> = new Set();

// Which best days just appeared, so their circle draws in once. `best` is null until the event loads.
// The first set after loading is recorded without animating. Days stay "new" for holdMs regardless of other
// re-renders (saver status, drag moves, polls), so the 650ms draw isn't cut short when the class would otherwise drop.
export function useNewBestDays(best: readonly string[] | null, holdMs = 700): ReadonlySet<string> {
  const key = best ? [...best].sort().join(',') : null;
  const prev = useRef<Set<string> | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const [fresh, setFresh] = useState<ReadonlySet<string>>(NONE);

  // Layout effect: the draw class must be on before the first paint of the circle, or it flashes fully drawn.
  useLayoutEffect(() => {
    if (key === null) return;
    const now = new Set(key ? key.split(',') : []);
    const before = prev.current;
    prev.current = now;
    if (before === null) return;
    const added = [...now].filter((d) => !before.has(d));
    if (!added.length) return;
    setFresh((f) => new Set([...[...f].filter((d) => now.has(d)), ...added]));
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setFresh(NONE), holdMs);
  }, [key, holdMs]);

  useEffect(() => () => clearTimeout(timer.current), []);
  return fresh;
}
