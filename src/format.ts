// Locale-aware formatting helpers built on Intl. `locale` is a BCP-47 tag
// (e.g. 'pt-BR', 'de'); pass htmlLang[locale] from the active locale.

export function money(amount: number | null | undefined, currency: string, locale = 'en'): string {
  if (amount == null) return '—';
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function number(value: number | null | undefined, locale = 'en', digits = 2): string {
  if (value == null) return '—';
  return new Intl.NumberFormat(locale, { maximumFractionDigits: digits }).format(value);
}

export function percent(fraction: number | null | undefined, locale = 'en', digits = 1): string {
  if (fraction == null) return '—';
  return new Intl.NumberFormat(locale, {
    style: 'percent',
    maximumFractionDigits: digits,
  }).format(fraction);
}

export function date(value: string | Date | null | undefined, locale = 'en'): string {
  if (!value) return '—';
  const d = typeof value === 'string' ? new Date(value) : value;
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(d);
}
