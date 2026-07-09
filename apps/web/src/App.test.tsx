import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import i18n from './i18n/index';
import App from './App';

vi.mock('./auth/AuthProvider', async () => {
  const actual = await vi.importActual<typeof import('./auth/AuthProvider')>('./auth/AuthProvider');
  return {
    ...actual,
    useAuth: () => ({ user: null, loading: false, token: null, client: {}, refresh: vi.fn(), signOut: vi.fn() }),
  };
});

describe('App shell', () => {
  beforeEach(async () => {
    localStorage.clear();
    document.documentElement.dir = 'ltr';
    document.documentElement.lang = 'en';
    await i18n.changeLanguage('en');
  });

  it('renders the app title and flips to RTL on language switch', () => {
    render(
      <MemoryRouter initialEntries={['/login']}>
        <App />
      </MemoryRouter>,
    );
    expect(screen.getAllByText('Tombola')[0]).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'العربية' }));
    expect(document.documentElement.dir).toBe('rtl');
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
