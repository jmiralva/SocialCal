import { fireEvent, render, screen } from '@testing-library/preact';
import { describe, expect, it, vi } from 'vitest';
import { TopBar } from './TopBar';

describe('TopBar', () => {
  it('has no help button without onHelp', () => {
    render(<TopBar onNew={vi.fn()} />);
    expect(screen.queryByRole('button', { name: 'How socialcal works' })).toBeNull();
  });

  it('calls onHelp from the help button', () => {
    const onHelp = vi.fn();
    render(<TopBar onNew={vi.fn()} onShare={vi.fn()} onHelp={onHelp} />);
    fireEvent.click(screen.getByRole('button', { name: 'How socialcal works' }));
    expect(onHelp).toHaveBeenCalledOnce();
  });

  it('shows the brand mark beside the wordmark without changing the link name', () => {
    render(<TopBar onNew={vi.fn()} />);
    const link = screen.getByRole('link', { name: 'socialcal' });
    const mark = link.querySelector('svg.brand-mark');
    expect(mark).toBeTruthy();
    expect(mark!.getAttribute('aria-hidden')).toBe('true');
  });

  it('styles Share as primary and New as quiet', () => {
    render(<TopBar onNew={vi.fn()} onShare={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'New' }).className).toBe('btn btn-quiet');
    expect(screen.getByRole('button', { name: 'Share' }).className).toBe('btn');
  });
});
