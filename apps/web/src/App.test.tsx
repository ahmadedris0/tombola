import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import App from './App';

describe('App language switching', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.dir = 'ltr';
  });

  it('renders the English title by default with dir=ltr', () => {
    render(<App />);
    expect(screen.getByRole('heading')).toHaveTextContent('Tombola');
    expect(document.documentElement.dir).toBe('ltr');
  });

  it('switches to Arabic and flips dir=rtl', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'العربية' }));
    expect(document.documentElement.dir).toBe('rtl');
    expect(screen.getByRole('heading')).toHaveTextContent('تومبولا');
  });
});
