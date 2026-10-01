import { fireEvent, render, screen } from '@testing-library/preact';
import { describe, expect, it, vi } from 'vitest';
import { TopBar } from './TopBar';

describe('TopBar', () => {
  it('has no help button without onHelp', () => {
    render(<TopBar onNew={vi.fn()} />);
    expect(screen.queryByRole('button', { name: 'How SocialCal works' })).toBeNull();
  });

  it('calls onHelp from the help button', () => {
    const onHelp = vi.fn();
    render(<TopBar onNew={vi.fn()} onShare={vi.fn()} onHelp={onHelp} />);
    fireEvent.click(screen.getByRole('button', { name: 'How SocialCal works' }));
    expect(onHelp).toHaveBeenCalledOnce();
  });

  it('styles Share as primary and New as quiet', () => {
    render(<TopBar onNew={vi.fn()} onShare={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'New' }).className).toBe('btn btn-quiet');
    expect(screen.getByRole('button', { name: 'Share' }).className).toBe('btn');
  });
});
