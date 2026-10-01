import { Sheet } from './Sheet';
import { copy } from '../copy';

const { help } = copy;

export function HelpSheet({ onClose }: { onClose: () => void }) {
  return (
    <Sheet label={help.title} onClose={onClose}>
      <h2>{help.title}</h2>
      <p class="sheet-sub">{help.sub}</p>

      <h3 class="help-h">{help.planHeading}</h3>
      <ul class="help-list">
        <li>{help.create}</li>
        <li>
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
          <b>{help.drag.lead}</b>
          {help.drag.rest}
        </li>
        <li>{help.shading}</li>
        <li>
          <b>{help.bestDays.lead}</b>
          {help.bestDays.rest}
        </li>
      </ul>

      <h3 class="help-h">{help.accountsHeading}</h3>
      <ul class="help-list">
        <li>{help.noSignUp}</li>
        <li>{help.editLink}</li>
      </ul>

      <div class="sheet-actions">
        <button type="button" class="btn" onClick={onClose}>
          {help.done}
        </button>
      </div>
    </Sheet>
  );
}
