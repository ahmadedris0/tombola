import { NumberState } from './enums';

export const numberTransitions: Record<NumberState, NumberState[]> = {
  [NumberState.Available]: [NumberState.Reserved],
  [NumberState.Reserved]: [NumberState.Confirmed, NumberState.Available],
  [NumberState.Confirmed]: [NumberState.Available],
};

export function canTransitionNumber(from: NumberState, to: NumberState): boolean {
  return numberTransitions[from].includes(to);
}
