import { useState } from 'preact/hooks';
import type { Participant } from '../../shared/types';
import { plural, type BestResult } from '../lib/best';
import { DayCard } from './DayCard';

export function BestDays({
  result,
  participants,
  meId,
  isCreator,
  onShare,
  onEditDates,
}: {
  result: BestResult;
  participants: Participant[];
  meId?: string;
  isCreator: boolean;
  onShare: () => void;
  onEditDates: () => void;
}) {
  const [showOthers, setShowOthers] = useState(false);
  const [showClosest, setShowClosest] = useState(false);

  if (result.kind === 'not-enough-people') {
    return (
      <div class="empty">
        <h3>Nobody else yet</h3>
        <p>Best days show up once friends add their availability.</p>
        <button type="button" class="btn" onClick={onShare}>
          Share the link
        </button>
      </div>
    );
  }

  if (result.kind === 'no-majority') {
    return (
      <>
        <div class="empty">
          <h3>No day works for half the group yet</h3>
          <p>
            The most overlap so far is {result.max} of {result.total}.{' '}
            {isCreator ? 'Nudge people to add more days, or widen the date range.' : 'Nudge people to add more days.'}
          </p>
          {isCreator ? (
            <button type="button" class="btn" onClick={onEditDates}>
              Edit dates
            </button>
          ) : (
            <button type="button" class="btn" onClick={onShare}>
              Share the link
            </button>
          )}
          {result.closest.length > 0 && (
            <button type="button" class="linklike block" onClick={() => setShowClosest((v) => !v)}>
              {showClosest ? 'Hide closest days' : 'Show closest days anyway'}
            </button>
          )}
        </div>
        {showClosest && (
          <>
            <p class="eyebrow">{plural(result.closest.length, 'Closest day so far', 'Closest days so far')}</p>
            <div class="cards-muted">
              {result.closest.map((s) => (
                <DayCard key={s.date} score={s} participants={participants} total={result.total} meId={meId} />
              ))}
            </div>
          </>
        )}
      </>
    );
  }

  const { top, next, total } = result;
  return (
    <>
      <p class="eyebrow">{plural(top.length, 'Best day', 'Best days')}</p>
      {top.map((s) => (
        <DayCard key={s.date} score={s} participants={participants} total={total} meId={meId} top />
      ))}
      {next.length === 0 ? (
        <p class="note">No other days work for at least half the group.</p>
      ) : showOthers ? (
        <>
          <p class="eyebrow">{plural(next.length, 'Next best day', 'Next best days')}</p>
          {next.map((s, i) => (
            <DayCard
              key={s.date}
              score={s}
              participants={participants}
              total={total}
              meId={meId}
              spaced={i > 0 && s.count !== next[i - 1].count}
            />
          ))}
          <button type="button" class="more" onClick={() => setShowOthers(false)}>
            Hide other days
          </button>
        </>
      ) : (
        <button type="button" class="more" onClick={() => setShowOthers(true)}>
          See {next.length} other {plural(next.length, 'day', 'days')}
        </button>
      )}
    </>
  );
}
