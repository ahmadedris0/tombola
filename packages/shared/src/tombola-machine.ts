import { TombolaStatus } from './enums';

export const tombolaTransitions: Record<TombolaStatus, TombolaStatus[]> = {
  [TombolaStatus.Draft]: [TombolaStatus.Upcoming, TombolaStatus.Cancelled],
  [TombolaStatus.Upcoming]: [TombolaStatus.Active, TombolaStatus.Cancelled],
  [TombolaStatus.Active]: [TombolaStatus.Closed, TombolaStatus.Cancelled],
  [TombolaStatus.Closed]: [TombolaStatus.Finished, TombolaStatus.Cancelled],
  [TombolaStatus.Finished]: [],
  [TombolaStatus.Cancelled]: [],
};

export function canTransitionTombola(from: TombolaStatus, to: TombolaStatus): boolean {
  return tombolaTransitions[from].includes(to);
}
