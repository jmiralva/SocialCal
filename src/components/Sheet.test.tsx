import { fireEvent, render, screen } from '@testing-library/preact';
import { useRef, useState } from 'preact/hooks';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Sheet } from './Sheet';

const stubPointer = (coarse: boolean) =>
  vi.stubGlobal('matchMedia', (q: string) => ({ matches: coarse && q === '(pointer: coarse)' }));
afterEach(() => vi.unstubAllGlobals());

function WithField({ onClose, onEscape }: { onClose?: () => void; onEscape?: () => void }) {
  const field = useRef<HTMLInputElement>(null);
  return (
    <Sheet label="Your name" onClose={onClose} onEscape={onEscape} initialFocus={field}>
      <button type="button">First</button>
      <input ref={field} aria-label="Name" />
      <button type="button">Last</button>
    </Sheet>
  );
}

function Opener() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Open
      </button>
      {open && (
        <Sheet label="Help" onClose={() => setOpen(false)}>
          <button type="button" onClick={() => setOpen(false)}>
            Got it
          </button>
        </Sheet>
      )}
    </>
  );
}

describe('Sheet', () => {
  it('focuses the initial field on a fine pointer', () => {
    render(<WithField />);
    expect(document.activeElement).toBe(screen.getByLabelText('Name'));
  });

  it('focuses the sheet itself on touch, so no phone keyboard opens', () => {
    stubPointer(true);
    render(<WithField />);
    expect(document.activeElement).toBe(screen.getByRole('dialog'));
  });

  it('focuses the sheet itself when there is no initial field', () => {
    render(
      <Sheet label="Help" onClose={vi.fn()}>
        <button type="button">Got it</button>
      </Sheet>,
    );
    expect(document.activeElement).toBe(screen.getByRole('dialog'));
  });

  it('calls onEscape on Escape, falling back to onClose', () => {
    const onEscape = vi.fn();
    const { unmount } = render(<WithField onEscape={onEscape} />);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onEscape).toHaveBeenCalledOnce();
    unmount();
    const onClose = vi.fn();
    render(<WithField onClose={onClose} />);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('ignores Escape while an input method is composing', () => {
    const onEscape = vi.fn();
    render(<WithField onEscape={onEscape} />);
    fireEvent.keyDown(document, { key: 'Escape', isComposing: true });
    expect(onEscape).not.toHaveBeenCalled();
  });

  it('ignores the Escape that ends Safari IME composition (keyCode 229)', () => {
    const onEscape = vi.fn();
    render(<WithField onEscape={onEscape} />);
    fireEvent.keyDown(document, { key: 'Escape', keyCode: 229 });
    expect(onEscape).not.toHaveBeenCalled();
  });

  it('keeps Tab inside the sheet', () => {
    render(<WithField />);
    const first = screen.getByRole('button', { name: 'First' });
    const last = screen.getByRole('button', { name: 'Last' });
    last.focus();
    fireEvent.keyDown(document, { key: 'Tab' });
    expect(document.activeElement).toBe(first);
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(last);
  });

  it('returns focus to the control that opened it', () => {
    render(<Opener />);
    const open = screen.getByRole('button', { name: 'Open' });
    open.focus();
    fireEvent.click(open);
    expect(document.activeElement).toBe(screen.getByRole('dialog'));
    fireEvent.click(screen.getByRole('button', { name: 'Got it' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.activeElement).toBe(open);
  });
});
