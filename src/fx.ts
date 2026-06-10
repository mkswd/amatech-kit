// Foreign-exchange helper for cross-border tax records.
//
// Convention (matches the investor's spreadsheet "Cotacao" column): fx_rate is
// the number of units of the CONTRACT currency per 1 unit of the HOME (tax)
// currency — e.g. BRL per EUR ≈ 6.0. Interest expressed in the home currency is
// then interest_in_contract / fx_rate.
//
// Rates come from the ECB via the free Frankfurter API (no key, daily history
// back to 1999). Weekend/holiday dates resolve to the most recent published
// working-day rate; the response's `date` reflects which day was actually used.

export interface FxResult {
  rate: number | null; // contract units per 1 home unit
  rateDate: string | null; // the ECB working day the rate is from
  source: string;
}

// Pure: an amount in the contract currency expressed in the home currency.
// THE single conversion used everywhere (payments, rentals, furniture, exports)
// so the rounding can never drift between features.
export function amountInHome(
  amount: number,
  fxRate: number | null | undefined,
): number | null {
  if (!fxRate || fxRate <= 0) return null;
  return Math.round((amount / fxRate) * 100) / 100;
}

// Pure: interest amount (in contract currency) expressed in the home currency.
export function interestInHome(
  interestContract: number,
  fxRate: number | null | undefined,
): number | null {
  return amountInHome(interestContract, fxRate);
}

// Fetches the ECB reference rate (contract per home) for a given date.
// Returns rate=1 when the currencies match, and rate=null on any failure so the
// caller can fall back to a manual entry.
export async function fetchFxRate(
  date: string,
  home: string,
  contract: string,
): Promise<FxResult> {
  if (!home || !contract || home === contract) {
    return { rate: home === contract ? 1 : null, rateDate: date, source: 'same' };
  }
  const url = `https://api.frankfurter.app/${date}?from=${encodeURIComponent(home)}&to=${encodeURIComponent(contract)}`;
  // Retry once — the rate is core data, so a transient blip shouldn't leave it null.
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(url, { cache: 'no-store' });
      if (res.ok) {
        const data = (await res.json()) as { date?: string; rates?: Record<string, number> };
        const rate = data?.rates?.[contract];
        if (typeof rate === 'number') {
          return { rate, rateDate: data?.date ?? date, source: 'ECB' };
        }
      }
    } catch {
      // fall through to retry
    }
  }
  return { rate: null, rateDate: null, source: 'unavailable' };
}
