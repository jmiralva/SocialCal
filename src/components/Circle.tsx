import { circlePath } from '../lib/marks';

// The red marker circle around a best day. pathLength=1 lets CSS draw it with stroke-dashoffset.
export function Circle({ seed, aspect = 1, draw = false }: { seed: string; aspect?: number; draw?: boolean }) {
  return (
    <svg class={draw ? 'ring draw' : 'ring'} viewBox={`0 0 ${Math.round(100 * aspect)} 100`} aria-hidden="true">
      <path d={circlePath(seed, aspect)} pathLength={1} />
    </svg>
  );
}
