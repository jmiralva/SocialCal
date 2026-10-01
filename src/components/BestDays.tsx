import { useState } from 'preact/hooks';
import type { Participant } from '../../shared/types';
import type { BestResult } from '../lib/best';
import { DayCard } from './DayCard';
import { copy } from '../copy';

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
        <h3>{copy.best.aloneTitle}</h3>
        <p>{copy.best.aloneBody}</p>
        <button type="button" class="btn" onClick={onShare}>
          {copy.best.share}
        </button>
      </div>
    );
  }

  if (result.kind === 'no-majority') {
    return (
      <>
        <div class="empty">
          <h3>{copy.best.noMajorityTitle}</h3>
          <p>
            {copy.best.noMajorityMax(result.max, result.total)} {isCreator ? copy.best.noMajorityCreator : copy.best.noMajorityFriend}
          </p>
          {isCreator ? (
            <button type="button" class="btn" onClick={onEditDates}>
              {copy.best.editDates}
            </button>
          ) : (
            <button type="button" class="btn" onClick={onShare}>
              {copy.best.share}
            </button>
          )}
          {result.closest.length > 0 && (
            <button type="button" class="linklike block" onClick={() => setShowClosest((v) => !v)}>
              {showClosest ? copy.best.hideClosest : copy.best.showClosest}
            </button>
          )}
        </div>
        {showClosest && (
          <>
            <p class="eyebrow">{copy.best.closest(result.closest.length)}</p>
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
      <p class="eyebrow">{copy.best.best(top.length)}</p>
      {top.map((s) => (
        <DayCard key={s.date} score={s} participants={participants} total={total} meId={meId} top />
      ))}
      {next.length === 0 ? (
        <p class="note">{copy.best.noOthers}</p>
      ) : showOthers ? (
        <>
          <p class="eyebrow">{copy.best.next(next.length)}</p>
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
            {copy.best.hideOthers}
          </button>
        </>
      ) : (
        <button type="button" class="more" onClick={() => setShowOthers(true)}>
          {copy.best.seeOthers(next.length)}
        </button>
      )}
    </>
  );
}
