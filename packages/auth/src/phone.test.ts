import { describe, it, expect } from 'vitest';
import { normalizeToE164, isValidE164 } from './phone';

describe('normalizeToE164', () => {
  it('keeps an already-E.164 number unchanged', () => {
    expect(normalizeToE164('+96170123456')).toBe('+96170123456');
  });
  it('adds the default +961 country code to a local number', () => {
    expect(normalizeToE164('70123456')).toBe('+96170123456');
  });
  it('strips a leading 0 before applying the country code', () => {
    expect(normalizeToE164('070123456')).toBe('+96170123456');
  });
  it('strips spaces and dashes', () => {
    expect(normalizeToE164('70 123 456')).toBe('+96170123456');
    expect(normalizeToE164('70-123-456')).toBe('+96170123456');
  });
  it('honors a supplied default country code', () => {
    expect(normalizeToE164('5551234', '+1')).toBe('+15551234');
  });
  it('throws on empty input', () => {
    expect(() => normalizeToE164('')).toThrow();
  });
});

describe('isValidE164', () => {
  it('accepts a valid E.164 number', () => {
    expect(isValidE164('+96170123456')).toBe(true);
  });
  it('rejects numbers without + or with letters', () => {
    expect(isValidE164('96170123456')).toBe(false);
    expect(isValidE164('+9617012345x')).toBe(false);
  });
});
