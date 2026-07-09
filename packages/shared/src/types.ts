import type { TombolaStatus, NumberState, PaymentStatus, Role, Locale } from './enums';

export interface LocalizedText {
  en: string;
  ar: string;
}

export interface User {
  userId: string;
  fullName: string;
  phoneE164: string;
  locale: Locale;
  role: Role;
  status: 'active' | 'disabled';
  phoneVerified: boolean;
  createdAt: string;
}

export interface Tombola {
  tombolaId: string;
  title: LocalizedText;
  description?: LocalizedText;
  status: TombolaStatus;
  gridSize: number;
  pricePerNumber: number;
  currency: string;
  prizeAmount: number;
  prizeDescription?: LocalizedText;
  whishNumberOverride?: string;
  reservationWindowMinutes: number;
  drawPoolMode: 'confirmed_only' | 'full_grid';
  openAt?: string;
  drawAt?: string;
  winningNumber?: number;
  winnerUserId?: string;
  createdBy: string;
  createdAt: string;
}

export interface NumberCell {
  tombolaId: string;
  number: number;
  labelEn: string;
  labelAr: string;
  state: NumberState;
  ownerUserId?: string;
  ownerName?: string;
  reservedAt?: string;
  reservationExpiresAt?: string;
  confirmedAt?: string;
}

export interface Payment {
  paymentId: string;
  tombolaId: string;
  numbers: number[];
  userId: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  whishReference?: string;
  proofUrl?: string;
  reviewedByAdminId?: string;
  reviewedAt?: string;
  createdAt: string;
}

export interface DrawAudit {
  tombolaId: string;
  drawnAt: string;
  drawnByAdminId: string;
  poolSnapshot: number[];
  rngSource: string;
  winningNumber: number;
  winnerUserId: string;
}
