import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import i18n from './i18n/index';
import App from './App';

describe('App language switching', () => {
  beforeEach(async () => {
    localStorage.clear();
    document.documentElement.dir = 'ltr';
    document.documentElement.lang = 'en';
    await i18n.changeLanguage('en');
  });

  it('renders the English title by default with dir=ltr and lang=en', () => {
    render(<App />);
    expect(screen.getByRole('heading')).toHaveTextContent('Tombola Admin');
    expect(document.documentElement.dir).toBe('ltr');
    expect(document.documentElement.lang).toBe('en');
  });

  it('switches to Arabic (rtl) then back to English (ltr), persisting each choice', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'العربية' }));
    expect(document.documentElement.dir).toBe('rtl');
    expect(document.documentElement.lang).toBe('ar');
    expect(screen.getByRole('heading')).toHaveTextContent('إدارة تومبولا');
    expect(localStorage.getItem('tombola.locale')).toBe('ar');

    fireEvent.click(screen.getByRole('button', { name: 'English' }));
    expect(document.documentElement.dir).toBe('ltr');
    expect(screen.getByRole('heading')).toHaveTextContent('Tombola Admin');
    expect(localStorage.getItem('tombola.locale')).toBe('en');
  });
});

describe('locale persistence on load', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.dir = 'ltr';
    document.documentElement.lang = 'en';
  });

  it('restores a persisted Arabic locale when the i18n module initializes', async () => {
    localStorage.setItem('tombola.locale', 'ar');
    vi.resetModules();
    await import('./i18n/index');
    expect(document.documentElement.dir).toBe('rtl');
    expect(document.documentElement.lang).toBe('ar');
  });
});
