import { HelpIcon } from './HelpIcon';

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
        socialcal
      </a>
      <div class="topbar-actions">
        {onHelp && (
          <button type="button" class="help-icon-btn" aria-label="How socialcal works" onClick={onHelp}>
            <HelpIcon size={26} />
          </button>
        )}
        {showNew && (
          <button type="button" class="btn btn-new" onClick={onNew}>
            New
          </button>
        )}
        {onShare && (
          <button type="button" class="btn btn-share" onClick={onShare}>
            Share
          </button>
        )}
      </div>
    </header>
  );
}
