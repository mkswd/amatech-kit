// Pure rental performance math (ADR-012). Occupancy and yields are computed
// over the trailing window since the lease started (capped at 365 days) and
// annualized, so a 3-month-old listing isn't punished for the empty months
// before it existed. Yields are against the unit's contract price — the number
// investors quote ("what does this apartment return?").

export interface YieldInput {
  contractPrice: number | null;
  leaseType: 'fixed' | 'temporary' | null;
  leaseStart: string | null; // ISO
  monthlyRent: number | null; // fixed leases
  // Ledger entries in the unit's contract currency:
  transactions: { kind: string; category: string; amount: number; occurred_on: string; nights: number | null }[];
  today?: Date;
}

export interface YieldResult {
  windowDays: number;
  occupancy: number | null; // fraction 0..1 (temporary leases only)
  grossYield: number | null; // fraction, annualized vs contract price
  netYield: number | null;
}

const DAY = 86_400_000;

export function rentalYield(input: YieldInput): YieldResult {
  const today = input.today ?? new Date();
  const start = input.leaseStart ? new Date(input.leaseStart) : null;
  const sinceStart = start ? Math.floor((today.getTime() - start.getTime()) / DAY) : 365;
  const windowDays = Math.max(1, Math.min(365, sinceStart));
  const windowStartISO = new Date(today.getTime() - windowDays * DAY).toISOString().slice(0, 10);

  const inWindow = input.transactions.filter((t) => t.occurred_on >= windowStartISO);
  const income = inWindow.filter((t) => t.kind === 'income').reduce((s, t) => s + t.amount, 0);
  const expenses = inWindow.filter((t) => t.kind === 'expense').reduce((s, t) => s + t.amount, 0);

  // Occupancy: booked nights vs elapsed nights (short-stay only).
  let occupancy: number | null = null;
  if (input.leaseType === 'temporary') {
    const nights = inWindow
      .filter((t) => t.kind === 'income' && t.category === 'reservation')
      .reduce((s, t) => s + (t.nights ?? 0), 0);
    occupancy = Math.min(1, nights / windowDays);
  }

  // Annualized income: fixed leases use the contracted rent (more honest than a
  // sparse ledger); short-stay annualizes the trailing window.
  const annualFactor = 365 / windowDays;
  const annualIncome =
    input.leaseType === 'fixed' && input.monthlyRent ? input.monthlyRent * 12 : income * annualFactor;
  const annualExpenses = expenses * annualFactor;

  const price = input.contractPrice && input.contractPrice > 0 ? input.contractPrice : null;
  const grossYield = price ? annualIncome / price : null;
  const netYield = price ? (annualIncome - annualExpenses) / price : null;

  return { windowDays, occupancy, grossYield, netYield };
}
