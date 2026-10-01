import { plural } from '../lib/best';

export function MarkingBar({
  name,
  count,
  onChangeName,
  onAddDays,
}: {
  name?: string;
  count: number;
  onChangeName: () => void;
  onAddDays: () => void;
}) {
  if (!name) {
    return (
      <div class="marking-bar">
        <span>Viewing only</span>
        {' · '}
        <button type="button" class="linklike" onClick={onAddDays}>
          Add my days
        </button>
      </div>
    );
  }
  return (
    <div class="marking-bar">
      <span>
        Marking days for <b class="you">{name}</b> · {count} {plural(count, 'day', 'days')}
      </span>
      <button type="button" class="linklike" onClick={onChangeName}>
        Change name
      </button>
    </div>
  );
}
