export function applySpan(
  base: ReadonlySet<string>,
  days: readonly string[],
  from: string,
  to: string,
  add: boolean,
): Set<string> {
  const next = new Set(base);
  const i0 = days.indexOf(from);
  const i1 = days.indexOf(to);
  if (i0 === -1 || i1 === -1) return next;
  const [lo, hi] = i0 <= i1 ? [i0, i1] : [i1, i0];
  for (let i = lo; i <= hi; i++) {
    if (add) next.add(days[i]);
    else next.delete(days[i]);
  }
  return next;
}
