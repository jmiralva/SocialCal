import { HelpIcon } from './HelpIcon';
import { copy } from '../copy';

export function HelpLink({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" class="help-link" onClick={onClick}>
      <HelpIcon />
      {copy.helpLink}
    </button>
  );
}
