export const TombolaStatus = {
  Draft: 'draft',
  Upcoming: 'upcoming',
  Active: 'active',
  Closed: 'closed',
  Finished: 'finished',
  Cancelled: 'cancelled',
} as const;
export type TombolaStatus = (typeof TombolaStatus)[keyof typeof TombolaStatus];

export const NumberState = {
  Available: 'available',
  Reserved: 'reserved',
  Confirmed: 'confirmed',
} as const;
export type NumberState = (typeof NumberState)[keyof typeof NumberState];

export const PaymentStatus = {
  Pending: 'pending',
  Confirmed: 'confirmed',
  Rejected: 'rejected',
} as const;
export type PaymentStatus = (typeof PaymentStatus)[keyof typeof PaymentStatus];

export const Role = { User: 'user', Admin: 'admin' } as const;
export type Role = (typeof Role)[keyof typeof Role];

export const Locale = { En: 'en', Ar: 'ar' } as const;
export type Locale = (typeof Locale)[keyof typeof Locale];
