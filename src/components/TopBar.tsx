import { HelpIcon } from './HelpIcon';
import { copy } from '../copy';

export function TopBar({
  onNew,
  onShare,
  onHelp,
  showNew = true,
}: {
  onNew: () => void;
  onShare?: () => void;
  onHelp?: () => void;
  showNew?: boolean;
}) {
  return (
    <header class="topbar">
      <a
        class="wordmark"
        href="/"
        onClick={(e) => {
          e.preventDefault();
          onNew();
        }}
      >
        {copy.brand}
      </a>
      <div class="topbar-actions">
        {onHelp && (
          <button type="button" class="help-icon-btn" aria-label={copy.topBar.help} onClick={onHelp}>
            <HelpIcon size={26} />
          </button>
        )}
        {showNew && (
          <button type="button" class="btn btn-quiet" onClick={onNew}>
            {copy.topBar.new}
          </button>
        )}
        {onShare && (
          <button type="button" class="btn" onClick={onShare}>
            {copy.topBar.share}
          </button>
        )}
      </div>
    </header>
  );
}
