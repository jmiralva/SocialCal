import type { EventInfo } from '../../shared/types';
import { copy } from '../copy';
import { linkify } from '../lib/linkify';

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
      {event.description && (
        <p class="description">
          {linkify(event.description).map((part) =>
            part.type === 'link' ? (
              <a href={part.value} target="_blank" rel="noopener noreferrer">
                {part.value}
              </a>
            ) : (
              part.value
            ),
          )}
        </p>
      )}
    </div>
  );
}
