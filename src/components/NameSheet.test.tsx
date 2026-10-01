import { fireEvent, render, screen } from '@testing-library/preact';
import { describe, expect, it, vi } from 'vitest';
import { NameSheet } from './NameSheet';

const props = () => ({
  title: 'Fall camping trip',
  subtitle: "What's your name? Then tap the days you're available.",
  submitLabel: 'Continue',
  onSubmit: vi.fn(async () => null),
  secondary: { label: 'Just look', onClick: vi.fn() },
});

describe('NameSheet', () => {
  it('has no How it works link without onHelp', () => {
    render(<NameSheet {...props()} />);
    expect(screen.queryByRole('button', { name: 'How it works' })).toBeNull();
  });

  it('calls onHelp without submitting the name', () => {
    const p = props();
    const onHelp = vi.fn();
    render(<NameSheet {...p} onHelp={onHelp} />);
    fireEvent.click(screen.getByRole('button', { name: 'How it works' }));
    expect(onHelp).toHaveBeenCalledOnce();
    expect(p.onSubmit).not.toHaveBeenCalled();
  });
});
