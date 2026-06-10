// Curated ISO-3166 alpha-2 country reference for Planta's cross-border tax
// features. Focused on the markets we serve plus common ones; not exhaustive.
// (ADR-002) Unknown values are passed through so existing free-text data renders.

export interface Country {
  code: string; // ISO-3166 alpha-2 (uppercase)
  name: string; // English display name
  flag: string; // emoji flag
}

// Ordered roughly by relevance to our investor base.
export const COUNTRIES: Country[] = [
  { code: 'BR', name: 'Brazil', flag: '🇧🇷' },
  { code: 'PT', name: 'Portugal', flag: '🇵🇹' },
  { code: 'ES', name: 'Spain', flag: '🇪🇸' },
  { code: 'DE', name: 'Germany', flag: '🇩🇪' },
  { code: 'FR', name: 'France', flag: '🇫🇷' },
  { code: 'IT', name: 'Italy', flag: '🇮🇹' },
  { code: 'US', name: 'United States', flag: '🇺🇸' },
  { code: 'GB', name: 'United Kingdom', flag: '🇬🇧' },
  { code: 'TH', name: 'Thailand', flag: '🇹🇭' },
  { code: 'AE', name: 'United Arab Emirates', flag: '🇦🇪' },
  { code: 'CH', name: 'Switzerland', flag: '🇨🇭' },
  { code: 'AT', name: 'Austria', flag: '🇦🇹' },
  { code: 'NL', name: 'Netherlands', flag: '🇳🇱' },
  { code: 'BE', name: 'Belgium', flag: '🇧🇪' },
  { code: 'IE', name: 'Ireland', flag: '🇮🇪' },
  { code: 'LU', name: 'Luxembourg', flag: '🇱🇺' },
  { code: 'CA', name: 'Canada', flag: '🇨🇦' },
  { code: 'MX', name: 'Mexico', flag: '🇲🇽' },
  { code: 'AR', name: 'Argentina', flag: '🇦🇷' },
  { code: 'CO', name: 'Colombia', flag: '🇨🇴' },
  { code: 'PL', name: 'Poland', flag: '🇵🇱' },
  { code: 'AU', name: 'Australia', flag: '🇦🇺' },
];

const BY_CODE = new Map(COUNTRIES.map((c) => [c.code, c]));
const BY_NAME = new Map(COUNTRIES.map((c) => [c.name.toLowerCase(), c]));

// Normalise a stored value (code or English name) to a known ISO code, or null.
export function toCountryCode(value: string | null | undefined): string | null {
  if (!value) return null;
  const v = value.trim();
  if (BY_CODE.has(v.toUpperCase())) return v.toUpperCase();
  const byName = BY_NAME.get(v.toLowerCase());
  return byName ? byName.code : null;
}

// Display label "🇧🇷 Brazil" for a code or free-text value (best effort).
export function countryLabel(value: string | null | undefined): string {
  if (!value) return '';
  const code = toCountryCode(value);
  if (code) {
    const c = BY_CODE.get(code)!;
    return `${c.flag} ${c.name}`;
  }
  return value; // unknown free-text — show as-is
}

export function countryName(value: string | null | undefined): string {
  const code = toCountryCode(value);
  return code ? BY_CODE.get(code)!.name : (value ?? '');
}
