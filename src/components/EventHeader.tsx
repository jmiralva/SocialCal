import type { EventInfo } from '../../shared/types';
import { copy } from '../copy';

export function EventHeader({ event, isCreator, onEdit }: { event: EventInfo; isCreator: boolean; onEdit: () => void }) {
  return (
    <div class="event-header">
      <h1>{event.name}</h1>
      <p class="byline">
        <span>{copy.event.createdBy}</span> <b>{event.creatorName}</b>
        {isCreator && (
          <>
            {' · '}
            <button type="button" class="linklike" onClick={onEdit}>
              {copy.event.edit}
            </button>
          </>
        )}
      </p>
      {event.description && <p class="description">{event.description}</p>}
    </div>
  );
}
