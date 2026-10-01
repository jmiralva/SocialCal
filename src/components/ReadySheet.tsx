import { useState } from 'preact/hooks';
import { Sheet } from './Sheet';

export function ReadySheet({ shareUrl, editUrl, onClose }: { shareUrl: string; editUrl: string; onClose: () => void }) {
  const [copied, setCopied] = useState<'share' | 'edit' | null>(null);
  const copy = async (which: 'share' | 'edit', text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(which);
    } catch {
      setCopied(null);
    }
  };
  return (
    <Sheet label="Your calendar is ready" onClose={onClose}>
      <h2>Your calendar is ready</h2>
      <p class="sheet-sub">Share the link with friends so they can add their days.</p>
      <p class="copy-label">Share link</p>
      <div class="copy-row">
        <code>{shareUrl}</code>
        <button type="button" class="btn btn-share" onClick={() => copy('share', shareUrl)}>
          {copied === 'share' ? 'Copied' : 'Copy'}
        </button>
      </div>
      <p class="copy-label">Private edit link</p>
      <div class="copy-row">
        <code>{editUrl}</code>
        <button type="button" class="btn btn-ghost" onClick={() => copy('edit', editUrl)}>
          {copied === 'edit' ? 'Copied' : 'Copy'}
        </button>
      </div>
      <p class="copy-help">Bookmark this. It's the only way to edit this event or your days from another device.</p>
      <div class="sheet-actions">
        <button type="button" class="btn" onClick={onClose}>
          Done
        </button>
      </div>
    </Sheet>
  );
}
