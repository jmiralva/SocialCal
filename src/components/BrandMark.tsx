// The logo: a calendar page with a quick pen loop spilling off its corner.
// public/favicon.svg and public/apple-touch-icon.png draw the same shapes; keep them in sync.
const LOOP =
  'M47.8 60Q51.8 55.6 54.2 53.8Q56.7 52 59.5 50.7Q62.3 49.4 65.3 48.6Q68.3 47.9 71.4 47.3Q74.5 46.8 77.5 47.2Q80.6 47.7 83.3 48.7Q86.1 49.7 88.4 51.3Q90.7 52.8 92.5 54.8Q94.2 56.8 94.7 59.4Q95.2 62 95.6 64.4Q96 66.9 95.7 69.4Q95.5 72 94.5 74.5Q93.5 76.9 92.6 79.6Q91.6 82.3 89.4 84.4Q87.1 86.5 84.4 88.2Q81.7 89.9 78.7 91Q75.7 92.2 72.5 92.7Q69.4 93.3 66.3 92.8Q63.3 92.3 60.5 91.7Q57.6 91 55.1 89.9Q52.6 88.7 50.5 87Q48.4 85.3 47.2 83.1Q45.9 80.9 44.9 78.6Q43.8 76.3 43.4 73.8Q43 71.2 43.3 68.5Q43.7 65.9 44.7 63.2Q45.8 60.5 47.1 57.7Q48.3 54.9 50.8 52.6Q53.3 50.3 56.4 48.5Q59.4 46.7 62.9 45.4Q66.3 44.2 69.9 43.8L73.5 43.4';

const CELLS = [[24, 52], [50, 52], [76, 52], [24, 74], [50, 74]];

export function BrandMark() {
  return (
    <svg class="brand-mark" viewBox="3 2 100 100" aria-hidden="true">
      <rect class="bm-page" x="9" y="17" width="82" height="74" rx="11" />
      <path class="bm-band" d="M9 28a11 11 0 0 1 11-11h60a11 11 0 0 1 11 11v8H9z" />
      <rect class="bm-binder" x="27" y="7" width="9" height="19" rx="4.5" />
      <rect class="bm-binder" x="64" y="7" width="9" height="19" rx="4.5" />
      {CELLS.map(([x, y]) => (
        <rect class="bm-cell" x={x - 7} y={y - 6} width="14" height="12" rx="2.5" />
      ))}
      <path class="bm-loop" d={LOOP} />
    </svg>
  );
}
