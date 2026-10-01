import { fireEvent, render, screen } from '@testing-library/preact';
import { describe, expect, it, vi } from 'vitest';
import { HelpSheet } from './HelpSheet';
import { HelpLink } from './HelpLink';

describe('HelpSheet', () => {
  it('is a labelled dialog that closes from Got it and the overlay', () => {
    const onClose = vi.fn();
    const { container } = render(<HelpSheet onClose={onClose} />);
    expect(screen.getByRole('dialog', { name: 'How socialcal works' })).toBeTruthy();
    const gotIt = screen.getByRole('button', { name: 'Got it' });
    expect(gotIt.getAttribute('type')).toBe('button');
    fireEvent.click(gotIt);
    fireEvent.click(container.querySelector('.overlay')!);
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});

describe('HelpLink', () => {
  it('is a non-submitting button named How it works', () => {
    const onClick = vi.fn();
    render(<HelpLink onClick={onClick} />);
    const link = screen.getByRole('button', { name: 'How it works' });
    expect(link.getAttribute('type')).toBe('button');
    fireEvent.click(link);
    expect(onClick).toHaveBeenCalledOnce();
  });
});
