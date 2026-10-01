import { copy } from '../copy';

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
        <span>{copy.marking.viewOnly}</span>
        {' · '}
        <button type="button" class="linklike" onClick={onAddDays}>
          {copy.marking.addDays}
        </button>
      </div>
    );
  }
  return (
    <div class="marking-bar">
      <span>
        {copy.marking.for} <b class="you">{name}</b> · {copy.marking.days(count)}
      </span>
      <button type="button" class="linklike" onClick={onChangeName}>
        {copy.marking.changeName}
      </button>
    </div>
  );
}
