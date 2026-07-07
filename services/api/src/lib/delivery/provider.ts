export interface DeliveryParams {
  phoneE164: string;
  code: string;
  locale: 'en' | 'ar';
}

export interface DeliveryProvider {
  send(params: DeliveryParams): Promise<void>;
}
