import { describe, it, expect } from 'vitest';
import { canTransitionTombola, tombolaTransitions } from './tombola-machine';
import { TombolaStatus } from './enums';

describe('canTransitionTombola', () => {
  it('allows draft -> upcoming', () => {
    expect(canTransitionTombola(TombolaStatus.Draft, TombolaStatus.Upcoming)).toBe(true);
  });
  it('allows active -> closed and closed -> finished', () => {
    expect(canTransitionTombola(TombolaStatus.Active, TombolaStatus.Closed)).toBe(true);
    expect(canTransitionTombola(TombolaStatus.Closed, TombolaStatus.Finished)).toBe(true);
  });
  it('allows active -> cancelled (any pre-finished state)', () => {
    expect(canTransitionTombola(TombolaStatus.Active, TombolaStatus.Cancelled)).toBe(true);
    expect(canTransitionTombola(TombolaStatus.Upcoming, TombolaStatus.Cancelled)).toBe(true);
  });
  it('rejects finished -> anything', () => {
    expect(canTransitionTombola(TombolaStatus.Finished, TombolaStatus.Active)).toBe(false);
    expect(canTransitionTombola(TombolaStatus.Finished, TombolaStatus.Cancelled)).toBe(false);
  });
  it('rejects skipping draft -> active', () => {
    expect(canTransitionTombola(TombolaStatus.Draft, TombolaStatus.Active)).toBe(false);
  });
  it('exposes the transition map', () => {
    expect(tombolaTransitions[TombolaStatus.Active]).toContain(TombolaStatus.Closed);
  });
  it('allows cancel from draft and closed (all pre-finished states)', () => {
    expect(canTransitionTombola(TombolaStatus.Draft, TombolaStatus.Cancelled)).toBe(true);
    expect(canTransitionTombola(TombolaStatus.Closed, TombolaStatus.Cancelled)).toBe(true);
  });
  it('returns false for an unrecognized source state instead of throwing', () => {
    expect(canTransitionTombola('bogus' as TombolaStatus, TombolaStatus.Active)).toBe(false);
  });
});
