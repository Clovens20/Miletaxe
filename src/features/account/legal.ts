export type LegalSection = {
  heading: string;
  body: string;
};

export function asLegalSections(value: unknown): LegalSection[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== 'object') return [];
    const row = item as { heading?: unknown; body?: unknown };
    if (typeof row.heading !== 'string' || typeof row.body !== 'string') return [];
    return [{ heading: row.heading, body: row.body }];
  });
}
