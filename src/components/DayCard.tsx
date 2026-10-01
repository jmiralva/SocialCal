import { Fragment } from 'preact';
import { formatDay } from '../../shared/dates';
import type { Participant } from '../../shared/types';
import type { DayScore } from '../lib/best';
import { Circle } from './Circle';
import { copy } from '../copy';

export function DayCard({
  score,
  participants,
  total,
  meId,
  top = false,
  circled = false,
  draw = false,
  secondary = false,
  spaced = false,
}: {
  score: DayScore;
  participants: Participant[];
  total: number;
  meId?: string;
  top?: boolean;
  circled?: boolean;
  draw?: boolean;
  secondary?: boolean; // next best and closest days: no circle, lighter date
  spaced?: boolean; // first row of a lower count in the next-best list
}) {
  const available = new Set(score.available);
  const cls = ['day-row', top && 'is-top', secondary && 'is-secondary', spaced && 'is-spaced'].filter(Boolean).join(' ');
  return (
    <li class={cls}>
      <div class="day-row-head">
        <span class="day-row-date">
          {formatDay(score.date)}
          {circled && <Circle seed={`list-${score.date}`} aspect={2.6} draw={draw} />}
        </span>
        <span class="day-row-count">{copy.best.cardCount(score.count, total)}</span>
      </div>
      <p class="names">
        {participants.map((p, i) => {
          const label = p.id === meId ? copy.best.you : p.name;
          // The space keeps names apart for screen readers; whitespace-only text in a flex container doesn't render.
          const gap = i > 0 ? ' ' : null;
          if (available.has(p.id)) {
            return (
              <Fragment key={p.id}>
                {gap}
                <span class={p.id === meId ? 'name is-me' : 'name'}>
                  {label}
                </span>
              </Fragment>
            );
          }
          return (
            <Fragment key={p.id}>
              {gap}
              <span class="name is-no">
                <s>{label}</s>
                <span class="sr-only">{copy.best.notFree}</span>
              </span>
            </Fragment>
          );
        })}
      </p>
    </li>
  );
}
