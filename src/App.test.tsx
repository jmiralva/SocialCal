import { render, screen } from '@testing-library/preact';
import { describe, it, expect } from 'vitest';
import { App } from './App';

describe('App', () => {
  it('renders the wordmark', () => {
    render(<App />);
    expect(screen.getByText('socialcal')).toBeTruthy();
  });
});
