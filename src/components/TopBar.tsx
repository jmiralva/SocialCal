export function TopBar({ onNew, onShare, showNew = true }: { onNew: () => void; onShare?: () => void; showNew?: boolean }) {
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
        {showNew && (
          <button type="button" class="btn btn-ghost" onClick={onNew}>
            New
          </button>
        )}
        {onShare && (
          <button type="button" class="btn" onClick={onShare}>
            Share
          </button>
        )}
      </div>
    </header>
  );
}
