import { useState } from 'preact/hooks';
import type { Participant } from '../../shared/types';
import type { BestResult } from '../lib/best';
import { DayCard } from './DayCard';
import { copy } from '../copy';

const NO_DAYS: ReadonlySet<string> = new Set();

export function BestDays({
  result,
  participants,
  meId,
  isCreator,
  onShare,
  onEditDates,
  newBestDays = NO_DAYS,
}: {
  result: BestResult;
  participants: Participant[];
  meId?: string;
  isCreator: boolean;
  onShare: () => void;
  onEditDates: () => void;
  newBestDays?: ReadonlySet<string>;
}) {
  const [showOthers, setShowOthers] = useState(false);
  const [showClosest, setShowClosest] = useState(false);

  if (result.kind === 'not-enough-people') {
    return (
      <div class="empty">
        <h2>{copy.best.aloneTitle}</h2>
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
          <h2>{copy.best.noMajorityTitle}</h2>
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
            <h3 class="best-h3">{copy.best.closest(result.closest.length)}</h3>
            <ol class="day-rows">
              {result.closest.map((s) => (
                <DayCard key={s.date} score={s} participants={participants} total={result.total} meId={meId} secondary />
              ))}
            </ol>
          </>
        )}
      </>
    );
  }

  const { top, next, total } = result;
  return (
    <>
      <h2 class="best-title">{copy.best.best(top.length)}</h2>
      <p class="best-sub">{copy.best.subtitle(top[0].count, total)}</p>
      <ol class="day-rows">
        {top.map((s) => (
          <DayCard key={s.date} score={s} participants={participants} total={total} meId={meId} top circled draw={newBestDays.has(s.date)} />
        ))}
      </ol>
      {next.length === 0 ? (
        <p class="note">{copy.best.noOthers}</p>
      ) : showOthers ? (
        <>
          <h3 class="best-h3">{copy.best.next(next.length)}</h3>
          <ol class="day-rows">
            {next.map((s, i) => (
              <DayCard
                key={s.date}
                score={s}
                participants={participants}
                total={total}
                meId={meId}
                secondary
                spaced={i > 0 && s.count !== next[i - 1].count}
              />
            ))}
          </ol>
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
