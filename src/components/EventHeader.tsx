import type { EventInfo } from '../../shared/types';

export function EventHeader({ event, isCreator, onEdit }: { event: EventInfo; isCreator: boolean; onEdit: () => void }) {
  return (
    <div class="event-header">
      <h1>{event.name}</h1>
      <p class="byline">
        <span>Created by</span> <b>{event.creatorName}</b>
        {isCreator && (
          <>
            {' · '}
            <button type="button" class="linklike" onClick={onEdit}>
              Edit event
            </button>
          </>
        )}
      </p>
      {event.description && <p class="description">{event.description}</p>}
    </div>
  );
}
