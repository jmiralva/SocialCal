import { HelpIcon } from './HelpIcon';

export function HelpLink({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" class="help-link" onClick={onClick}>
      <HelpIcon />
      How it works
    </button>
  );
}
