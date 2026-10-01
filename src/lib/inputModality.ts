// Safari keeps :focus-visible off when code moves focus after a mouse press (arrow keys in the calendar and tab bar),
// so record the last input on <html> and let the focus ring follow it.
const MODIFIER_KEYS = ['Shift', 'Control', 'Alt', 'Meta'];

export function trackInputModality(): () => void {
  const root = document.documentElement;
  // Modifiers and shortcuts (Cmd+C, Cmd+Tab) are not navigation, so they leave a mouse-focused element without a ring.
  const onKey = (e: KeyboardEvent) => {
    if (e.metaKey || e.ctrlKey || e.altKey || MODIFIER_KEYS.includes(e.key)) return;
    root.dataset.input = 'keyboard';
  };
  const onPointer = () => (root.dataset.input = 'pointer');
  document.addEventListener('keydown', onKey, true);
  document.addEventListener('pointerdown', onPointer, true);
  return () => {
    document.removeEventListener('keydown', onKey, true);
    document.removeEventListener('pointerdown', onPointer, true);
  };
}
