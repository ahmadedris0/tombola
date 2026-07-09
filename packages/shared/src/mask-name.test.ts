import { describe, it, expect } from 'vitest';
import { maskName } from './mask-name';

describe('maskName', () => {
  it('returns first name + last initial', () => {
    expect(maskName('Ahmad Edris')).toBe('Ahmad E.');
  });
  it('uses the last token for the initial with middle names', () => {
    expect(maskName('Ahmad Ali Edris')).toBe('Ahmad E.');
  });
  it('returns a single name unchanged', () => {
    expect(maskName('Ahmad')).toBe('Ahmad');
  });
  it('collapses extra whitespace and empty input', () => {
    expect(maskName('  Ahmad   Edris ')).toBe('Ahmad E.');
    expect(maskName('')).toBe('');
  });
});
