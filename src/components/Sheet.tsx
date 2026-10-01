import type { ComponentChildren } from 'preact';

export function Sheet({ label, onClose, children }: { label: string; onClose?: () => void; children: ComponentChildren }) {
  return (
    <div
      class="overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div class="sheet" role="dialog" aria-modal="true" aria-label={label}>
        {children}
      </div>
    </div>
  );
}
