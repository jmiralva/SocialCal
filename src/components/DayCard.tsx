import { formatDay } from '../../shared/dates';
import type { Participant } from '../../shared/types';
import type { DayScore } from '../lib/best';

export function DayCard({
  score,
  participants,
  total,
  meId,
  top = false,
  spaced = false,
}: {
  score: DayScore;
  participants: Participant[];
  total: number;
  meId?: string;
  top?: boolean;
  spaced?: boolean;
}) {
  const available = new Set(score.available);
  return (
    <div class={`day-card${top ? ' is-top' : ''}${spaced ? ' spaced' : ''}`}>
      <div class="day-card-row">
        <b>{formatDay(score.date)}</b>
        <span>
          {score.count} of {total}
        </span>
      </div>
      <div class="meter">
        <i style={{ width: `${(score.count / total) * 100}%` }} />
      </div>
      <div class="pills">
        {participants.map((p) => {
          const yes = available.has(p.id);
          const cls = yes ? (p.id === meId ? 'pill is-me' : 'pill') : 'pill is-no';
          return (
            <span key={p.id} class={cls}>
              {p.name}
            </span>
          );
        })}
      </div>
    </div>
  );
}
