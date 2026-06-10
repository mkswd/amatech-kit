// Locale key-parity helper: assert every locale file exposes exactly the same
// (nested) key set as the reference locale. Use from a vitest suite:
//
//   const problems = localeParityProblems(en, { de, fr, ... });
//   expect(problems).toEqual([]);

export function flattenKeys(obj: unknown, prefix = ''): string[] {
  if (obj === null || typeof obj !== 'object') return [prefix];
  return Object.entries(obj as Record<string, unknown>).flatMap(([k, v]) =>
    flattenKeys(v, prefix ? `${prefix}.${k}` : k),
  );
}

export function localeParityProblems(
  reference: unknown,
  locales: Record<string, unknown>,
): string[] {
  const refKeys = new Set(flattenKeys(reference));
  const problems: string[] = [];
  for (const [locale, messages] of Object.entries(locales)) {
    const keys = new Set(flattenKeys(messages));
    for (const k of refKeys) if (!keys.has(k)) problems.push(`${locale}: missing ${k}`);
    for (const k of keys) if (!refKeys.has(k)) problems.push(`${locale}: extra ${k}`);
  }
  return problems;
}
