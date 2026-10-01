import type { ComponentChildren, RefObject } from 'preact';
import { useLayoutEffect, useRef } from 'preact/hooks';
import { isCoarsePointer } from '../lib/pointer';

const FOCUSABLE =
  'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])';

export function Sheet({
  label,
  onClose,
  onEscape = onClose,
  initialFocus,
  children,
}: {
  label: string;
  onClose?: () => void;
  onEscape?: () => void;
  // Focused on open with a mouse or trackpad. Touch devices focus the sheet instead, so the on-screen keyboard stays closed.
  initialFocus?: RefObject<HTMLElement>;
  children: ComponentChildren;
}) {
  const sheetRef = useRef<HTMLDivElement>(null);
  // Read during the first render, before anything inside the sheet takes focus.
  const opener = useRef(document.activeElement as HTMLElement | null);
  const escape = useRef(onEscape);
  escape.current = onEscape;

  // Layout effect, not useEffect: Preact defers useEffect to the next frame, which would leave the sheet without Escape, the Tab trap, or initial focus for a frame after it appears.
  useLayoutEffect(() => {
    const sheet = sheetRef.current!;
    const field = isCoarsePointer() ? null : initialFocus?.current;
    (field ?? sheet).focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (e.isComposing || !escape.current) return;
        e.preventDefault();
        escape.current();
      } else if (e.key === 'Tab') {
        const items = [...sheet.querySelectorAll<HTMLElement>(FOCUSABLE)];
        const active = document.activeElement;
        const inside = sheet.contains(active);
        if (!items.length) {
          e.preventDefault();
          sheet.focus();
        } else if (e.shiftKey && (active === items[0] || active === sheet || !inside)) {
          e.preventDefault();
          items[items.length - 1].focus();
        } else if (!e.shiftKey && (active === items[items.length - 1] || !inside)) {
          e.preventDefault();
          items[0].focus();
        }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      const el = opener.current;
      if (el && el !== document.body && el.isConnected) el.focus();
    };
  }, []);

  return (
    <div
      class="overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div class="sheet" role="dialog" aria-modal="true" aria-label={label} tabIndex={-1} ref={sheetRef}>
        {children}
      </div>
    </div>
  );
}
