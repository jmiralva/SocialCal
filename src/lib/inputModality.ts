// Safari keeps :focus-visible off when code moves focus after a mouse press (arrow keys in the calendar and tab bar),
// so record the last input on <html> and let the focus ring follow it.
export function trackInputModality(root: HTMLElement = document.documentElement): () => void {
  const onKey = () => (root.dataset.input = 'keyboard');
  const onPointer = () => (root.dataset.input = 'pointer');
  document.addEventListener('keydown', onKey, true);
  document.addEventListener('pointerdown', onPointer, true);
  return () => {
    document.removeEventListener('keydown', onKey, true);
    document.removeEventListener('pointerdown', onPointer, true);
  };
}
