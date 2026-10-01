import { useState } from 'preact/hooks';
import { Sheet } from './Sheet';
import { copy } from '../copy';

export function ReadySheet({ shareUrl, editUrl, onClose }: { shareUrl: string; editUrl: string; onClose: () => void }) {
  const [copied, setCopied] = useState<'share' | 'edit' | null>(null);
  const copyText = async (which: 'share' | 'edit', text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(which);
    } catch {
      setCopied(null);
    }
  };
  return (
    <Sheet label={copy.ready.title} onClose={onClose}>
      <h2>{copy.ready.title}</h2>
      <p class="sheet-sub">{copy.ready.sub}</p>
      <p class="copy-label">{copy.ready.shareLabel}</p>
      <div class="copy-row">
        <code>{shareUrl}</code>
        <button type="button" class="btn btn-share" onClick={() => copyText('share', shareUrl)}>
          {copied === 'share' ? copy.ready.copied : copy.ready.copy}
        </button>
      </div>
      <p class="copy-label">{copy.ready.editLabel}</p>
      <div class="copy-row">
        <code>{editUrl}</code>
        <button type="button" class="btn btn-ghost" onClick={() => copyText('edit', editUrl)}>
          {copied === 'edit' ? copy.ready.copied : copy.ready.copy}
        </button>
      </div>
      <p class="copy-help">{copy.ready.editHelp}</p>
      <div class="sheet-actions">
        <button type="button" class="btn" onClick={onClose}>
          {copy.ready.done}
        </button>
      </div>
    </Sheet>
  );
}
