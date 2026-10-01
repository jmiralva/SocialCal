import { Sheet } from './Sheet';
import { copy } from '../copy';
import { isCoarsePointer } from '../lib/pointer';

const { help } = copy;

export function HelpSheet({ onClose }: { onClose: () => void }) {
  const coarse = isCoarsePointer();
  const drag = coarse ? help.dragTouch : help.drag;
  return (
    <Sheet label={help.title} onClose={onClose}>
      <h2>{help.title}</h2>
      <p class="sheet-sub">{help.sub}</p>

      <h3 class="help-h">{help.planHeading}</h3>
      <ul class="help-list">
        <li>{help.create}</li>
        <li>
          {help.share.before}
          <b>{help.share.lead}</b>
          {help.share.rest}
        </li>
      </ul>

      <h3 class="help-h">{help.markHeading}</h3>
      <ul class="help-list">
        <li>
          <b>{help.tap.lead}</b>
          {help.tap.rest}
        </li>
        <li>
          <b>{drag.lead}</b>
          {drag.rest}
        </li>
        {!coarse && (
          <li>
            <b>{help.keyboard.lead}</b>
            {help.keyboard.rest}
          </li>
        )}
        <li>{help.shading}</li>
        <li>
          <b>{help.bestDays.lead}</b>
          {help.bestDays.rest}
        </li>
        <li>{help.noSignUp}</li>
      </ul>

      <h3 class="help-h">{help.aboutHeading}</h3>
      <p class="help-about">
        {help.about.builtBy}{' '}
        <a href={help.about.authorUrl} target="_blank" rel="noopener">
          {help.about.author}
        </a>{' '}
        {help.about.openSource}{' '}
        <a href={help.about.repoUrl} target="_blank" rel="noopener">
          {help.about.github}
        </a>
        .
      </p>

      <div class="sheet-actions">
        <button type="button" class="btn" onClick={onClose}>
          {help.done}
        </button>
      </div>
    </Sheet>
  );
}
