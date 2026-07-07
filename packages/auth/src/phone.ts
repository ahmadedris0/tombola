const DEFAULT_COUNTRY_CODE = '+961';
const E164 = /^\+[1-9]\d{1,14}$/;

export function isValidE164(value: string): boolean {
  return E164.test(value);
}

export function normalizeToE164(input: string, defaultCountryCode = DEFAULT_COUNTRY_CODE): string {
  const trimmed = input.replace(/[\s-]/g, '');
  if (!trimmed) throw new Error('phone number is empty');
  if (trimmed.startsWith('+')) return trimmed;
  if (trimmed.startsWith('00')) return `+${trimmed.slice(2)}`;
  const local = trimmed.replace(/^0+/, '');
  return `${defaultCountryCode}${local}`;
}
