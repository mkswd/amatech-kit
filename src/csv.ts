// Minimal RFC-4180 CSV builder. Quotes any field containing a comma, quote or
// newline, and doubles embedded quotes.

type Cell = string | number | null | undefined;

export function toCsv(rows: Cell[][]): string {
  return rows
    .map((row) =>
      row
        .map((cell) => {
          const s = cell == null ? '' : String(cell);
          return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
        })
        .join(','),
    )
    .join('\r\n');
}
