import { render, screen } from '@testing-library/preact';
import { describe, expect, it, vi } from 'vitest';
import { ReadySheet } from './ReadySheet';

describe('ReadySheet', () => {
  it('styles the share-link copy green and leaves the edit-link copy as ghost', () => {
    render(<ReadySheet shareUrl="https://x/e/1" editUrl="https://x/e/1#edit=2" onClose={vi.fn()} />);
    const [shareCopy, editCopy] = screen.getAllByRole('button', { name: 'Copy' });
    expect(shareCopy.className).toBe('btn btn-share');
    expect(editCopy.className).toBe('btn btn-ghost');
  });
});
