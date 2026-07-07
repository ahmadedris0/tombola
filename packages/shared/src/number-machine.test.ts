import { describe, it, expect } from 'vitest';
import { canTransitionNumber, numberTransitions } from './number-machine';
import { NumberState } from './enums';

describe('canTransitionNumber', () => {
  it('allows available -> reserved', () => {
    expect(canTransitionNumber(NumberState.Available, NumberState.Reserved)).toBe(true);
  });
  it('allows reserved -> confirmed (admin confirm)', () => {
    expect(canTransitionNumber(NumberState.Reserved, NumberState.Confirmed)).toBe(true);
  });
  it('allows reserved -> available (expiry/cancel/release/reject)', () => {
    expect(canTransitionNumber(NumberState.Reserved, NumberState.Available)).toBe(true);
  });
  it('allows confirmed -> available (admin release / refund)', () => {
    expect(canTransitionNumber(NumberState.Confirmed, NumberState.Available)).toBe(true);
  });
  it('rejects available -> confirmed (must reserve first)', () => {
    expect(canTransitionNumber(NumberState.Available, NumberState.Confirmed)).toBe(false);
  });
  it('exposes the transition map', () => {
    expect(numberTransitions[NumberState.Reserved]).toContain(NumberState.Confirmed);
  });
  it('rejects reverse transition confirmed -> reserved', () => {
    expect(canTransitionNumber(NumberState.Confirmed, NumberState.Reserved)).toBe(false);
  });
  it('returns false for an unrecognized source state instead of throwing', () => {
    expect(canTransitionNumber('bogus' as NumberState, NumberState.Available)).toBe(false);
  });
});
